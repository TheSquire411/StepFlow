import { Request, Response, NextFunction } from 'express';
import { performanceMonitoringService } from '../services/performance-monitoring.service.js';

interface PerformanceRequest extends Request {
  startTime?: number;
  cacheHit?: boolean;
}

export const performanceMiddleware = (req: PerformanceRequest, res: Response, next: NextFunction) => {
  // Record start time
  req.startTime = Date.now();
  req.cacheHit = false;

  // Override res.json to detect cache hits
  const originalJson = res.json;
  res.json = function(body: any) {
    // Check if response came from cache (you can set this in your route handlers)
    if (res.get('X-Cache-Status') === 'HIT') {
      req.cacheHit = true;
    }
    return originalJson.call(this, body);
  };

  // Record metrics when response finishes
  res.on('finish', () => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    performanceMonitoringService.recordMetric({
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      cacheHit: req.cacheHit || false,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
    });
  });

  next();
};

export const cacheHitMiddleware = (req: PerformanceRequest, res: Response, next: NextFunction) => {
  // Mark response as cache hit
  res.set('X-Cache-Status', 'HIT');
  req.cacheHit = true;
  next();
};

export const cacheMissMiddleware = (req: PerformanceRequest, res: Response, next: NextFunction) => {
  // Mark response as cache miss
  res.set('X-Cache-Status', 'MISS');
  req.cacheHit = false;
  next();
};