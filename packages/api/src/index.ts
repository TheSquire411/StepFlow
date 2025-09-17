import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { performanceMiddleware } from './middleware/performance.middleware.js';
import { SecurityMiddleware } from './middleware/security.middleware.js';
import { RateLimitingMiddleware } from './middleware/rate-limiting.middleware.js';
import { EncryptionService } from './services/encryption.service.js';
import { initializeDatabase, getDatabaseConfigFromEnv } from './config/database.js';
import { AuthService } from './services/auth.service.js';
import { MockEmailService } from './services/email.service.js';
import { RecordingService } from './services/recording.service.js';
import { StepDetectionService } from './services/step-detection.service.js';
import { ComputerVisionService } from './services/computer-vision.service.js';
import { AIContentGenerationService } from './services/ai-content-generation.service.js';
import { createFileStorageService } from './services/file-storage.service.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createRecordingRoutes } from './routes/recording.routes.js';
import { createStepDetectionRoutes } from './routes/step-detection.routes.js';
import { createAIContentGenerationRoutes } from './routes/ai-content-generation.routes.js';
import guideRoutes from './routes/guide.routes.js';
import sharingRoutes from './routes/sharing.routes.js';
import aiEnhancementRoutes from './routes/ai-enhancement.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { gdprRoutes } from './routes/gdpr.routes.js';
import {
  requestId,
  requestLogger,
  errorHandler,
  notFoundHandler
} from './middleware/error-handling.middleware.js';
import { sentryService } from './services/sentry.service.js';
import { gracefulDegradationService } from './services/graceful-degradation.service.js';
import { Logger } from '../../shared/src/utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const logger = new Logger('api-server');

// Initialize Sentry for error tracking
sentryService.initialize(
  process.env.SENTRY_DSN,
  process.env.NODE_ENV || 'development'
);

// Initialize encryption service
EncryptionService.initialize();

// Initialize graceful degradation service
gracefulDegradationService.registerService('database');
gracefulDegradationService.registerService('redis');
gracefulDegradationService.registerService('file-storage');
gracefulDegradationService.registerService('ai-content-generation');
gracefulDegradationService.registerService('text-to-speech');

// Initialize database
const dbConfig = getDatabaseConfigFromEnv();
const db = initializeDatabase(dbConfig);

// Initialize services
const emailService = new MockEmailService();
const authService = new AuthService(db, emailService);
const fileStorageService = createFileStorageService();
const recordingService = new RecordingService(db, fileStorageService);
const stepDetectionService = new StepDetectionService(db);
const computerVisionService = new ComputerVisionService();
const aiContentGenerationService = new AIContentGenerationService();

// Sentry request handler (must be first)
app.use(sentryService.getRequestHandler());
app.use(sentryService.getTracingHandler());

// Security middleware stack (includes request ID, CORS, helmet, rate limiting, etc.)
app.use(SecurityMiddleware.getSecurityStack());

// Additional middleware
app.use(compression());
app.use(morgan('combined'));
app.use(performanceMiddleware);

// Body parsing middleware (after security)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (for local storage)
if (process.env.FILE_STORAGE_TYPE !== 's3') {
  const uploadPath = process.env.LOCAL_STORAGE_PATH || './uploads';
  app.use('/uploads', express.static(uploadPath));
}

// Health check routes (comprehensive)
app.use('/api/v1', healthRoutes);

// API routes
app.get('/api/v1', (req, res) => {
  res.json({ 
    message: 'StepFlow API v1',
    version: '1.0.0',
    status: 'running'
  });
});

// Authentication routes (with stricter rate limiting)
app.use('/api/v1/auth', RateLimitingMiddleware.auth, createAuthRoutes(authService));

// Recording routes (with file upload rate limiting)
app.use('/api/v1/recordings', RateLimitingMiddleware.fileUpload, createRecordingRoutes(recordingService));

// Step detection routes
app.use('/api/v1/step-detection', createStepDetectionRoutes(stepDetectionService, computerVisionService));

// AI content generation routes (with AI processing rate limiting)
app.use('/api/v1/ai-content', RateLimitingMiddleware.aiProcessing, createAIContentGenerationRoutes(aiContentGenerationService, stepDetectionService));

// Guide routes
app.use('/api/v1/guides', guideRoutes);

// Sharing routes
app.use('/api/v1/sharing', sharingRoutes);

// AI enhancement routes (with AI processing rate limiting)
app.use('/api/v1/ai-enhancement', RateLimitingMiddleware.aiProcessing, aiEnhancementRoutes);

// GDPR compliance routes
app.use('/api/v1/gdpr', gdprRoutes);

// 404 handler
app.use(notFoundHandler);

// Sentry error handler (must be before other error handlers)
app.use(sentryService.getErrorHandler());

// Main error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  try {
    // Close database connection
    await db.end();
    
    // Close Sentry
    await sentryService.close();
    
    // Shutdown graceful degradation service
    gracefulDegradationService.shutdown();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      operation: 'graceful_shutdown'
    }, error as Error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    operation: 'uncaught_exception'
  }, error);
  
  sentryService.captureError(error);
  
  // Give Sentry time to send the error
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  
  logger.error('Unhandled promise rejection', {
    operation: 'unhandled_rejection',
    metadata: { promise: promise.toString() }
  }, error);
  
  sentryService.captureError(error);
});

app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    operation: 'server_start',
    metadata: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    }
  });
  
  console.log(`🚀 StepFlow API server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/v1/health`);
  console.log(`🔐 Auth endpoints available at http://localhost:${PORT}/api/v1/auth`);
  console.log(`🎥 Recording endpoints available at http://localhost:${PORT}/api/v1/recordings`);
  console.log(`🔍 Step detection endpoints available at http://localhost:${PORT}/api/v1/step-detection`);
  console.log(`🤖 AI content generation endpoints available at http://localhost:${PORT}/api/v1/ai-content`);
  console.log(`📖 Guide endpoints available at http://localhost:${PORT}/api/v1/guides`);
  console.log(`🔗 Sharing endpoints available at http://localhost:${PORT}/api/v1/sharing`);
  console.log(`✨ AI enhancement endpoints available at http://localhost:${PORT}/api/v1/ai-enhancement`);
});