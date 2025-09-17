import { Router } from 'express';
import { AIContentGenerationController } from '../controllers/ai-content-generation.controller.js';
import { AIContentGenerationService } from '../services/ai-content-generation.service.js';
import { StepDetectionService } from '../services/step-detection.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export function createAIContentGenerationRoutes(
  aiService: AIContentGenerationService,
  stepDetectionService: StepDetectionService
): Router {
  const router = Router();
  const controller = new AIContentGenerationController(aiService, stepDetectionService);

  // All AI content generation routes require authentication
  router.use(authMiddleware);

  // Health check endpoint
  router.get('/health', controller.healthCheck);

  // Content generation options
  router.get('/options', controller.getContentOptions);

  // Guide generation from session
  router.post('/sessions/:sessionId/generate-guide', controller.generateGuideFromSession);

  // Individual content generation endpoints
  router.post('/generate-step-content', controller.generateStepContent);
  router.post('/generate-title', controller.generateTitle);
  router.post('/generate-description', controller.generateDescription);

  // Workflow analysis
  router.post('/summarize-workflow', controller.summarizeWorkflow);

  // Guide quality and improvement
  router.post('/assess-quality', controller.assessGuideQuality);
  router.post('/improve-guide', controller.improveGuideContent);

  // Error handling middleware specific to AI content generation
  router.use((error: any, req: any, res: any, next: any) => {
    // Handle Google Gemini API specific errors
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        error: {
          code: 'AI_SERVICE_CONFIG_ERROR',
          message: 'AI service configuration error',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return res.status(429).json({
        error: {
          code: 'AI_SERVICE_RATE_LIMITED',
          message: 'AI service rate limit exceeded. Please try again later.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.message?.includes('safety') || error.message?.includes('blocked')) {
      return res.status(400).json({
        error: {
          code: 'CONTENT_BLOCKED',
          message: 'Content was blocked by safety filters',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.message?.includes('timeout')) {
      return res.status(504).json({
        error: {
          code: 'AI_SERVICE_TIMEOUT',
          message: 'AI service request timed out',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Handle content generation specific errors
    if (error.message?.includes('Failed to generate')) {
      return res.status(500).json({
        error: {
          code: 'CONTENT_GENERATION_FAILED',
          message: 'Failed to generate content. Please try again.',
          timestamp: new Date().toISOString()
        }
      });
    }

    next(error);
  });

  return router;
}