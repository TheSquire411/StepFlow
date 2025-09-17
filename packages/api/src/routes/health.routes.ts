import { Router } from 'express';
import { healthCheckService } from '../services/health-check.service';
import { gracefulDegradationService } from '../services/graceful-degradation.service';
import { asyncHandler } from '../middleware/error-handling.middleware';
import { Logger } from '../../../shared/src/utils/logger';

const router = Router();
const logger = new Logger('health-routes');

// Basic health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  const healthCheck = await healthCheckService.performFullHealthCheck();
  
  const statusCode = healthCheck.overall === 'healthy' ? 200 : 
                    healthCheck.overall === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    status: healthCheck.overall,
    timestamp: healthCheck.timestamp,
    services: healthCheck.services.map(service => ({
      name: service.service,
      status: service.status,
      responseTime: service.responseTime
    }))
  });
}));

// Detailed health check endpoint
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const healthCheck = await healthCheckService.performFullHealthCheck();
  
  const statusCode = healthCheck.overall === 'healthy' ? 200 : 
                    healthCheck.overall === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(healthCheck);
}));

// Individual service health checks
router.get('/health/database', asyncHandler(async (req, res) => {
  const result = await healthCheckService.checkDatabase();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(result);
}));

router.get('/health/redis', asyncHandler(async (req, res) => {
  const result = await healthCheckService.checkRedis();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(result);
}));

router.get('/health/storage', asyncHandler(async (req, res) => {
  const result = await healthCheckService.checkFileStorage();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(result);
}));

router.get('/health/external', asyncHandler(async (req, res) => {
  const results = await healthCheckService.checkExternalServices();
  const allHealthy = results.every(r => r.status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    overall: allHealthy ? 'healthy' : 'degraded',
    services: results
  });
}));

// Readiness probe (for Kubernetes)
router.get('/ready', asyncHandler(async (req, res) => {
  const healthCheck = await healthCheckService.performFullHealthCheck();
  
  // Service is ready if core services (database, redis) are healthy
  const coreServices = healthCheck.services.filter(s => 
    s.service === 'database' || s.service === 'redis'
  );
  
  const isReady = coreServices.every(s => s.status === 'healthy');
  
  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      issues: coreServices.filter(s => s.status !== 'healthy')
    });
  }
}));

// Liveness probe (for Kubernetes)
router.get('/live', asyncHandler(async (req, res) => {
  // Simple liveness check - just verify the service is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

// Service degradation status
router.get('/degradation', asyncHandler(async (req, res) => {
  const serviceStatuses = gracefulDegradationService.getServiceStatuses();
  
  res.json({
    timestamp: new Date().toISOString(),
    services: serviceStatuses
  });
}));

// Metrics endpoint (basic)
router.get('/metrics', asyncHandler(async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  });
}));

export { router as healthRoutes };