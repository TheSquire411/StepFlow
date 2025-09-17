import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../../shared/src/utils/logger';
import { ErrorHandler, AppError } from '../../../shared/src/utils/error-handler';
import { ErrorResponse } from '../../../shared/src/types/logging.types';
import { sentryService } from '../services/sentry.service';

export class ErrorHandlingMiddleware {
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor() {
    this.logger = new Logger('error-handling-middleware');
    this.errorHandler = new ErrorHandler(this.logger);
  }

  // Request ID middleware
  requestId = (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    next();
  };

  // Request logging middleware
  requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Log request start
    this.logger.info('Request started', {
      requestId: req.requestId,
      operation: 'http_request',
      metadata: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: req.user?.id
      }
    });

    // Add breadcrumb for Sentry
    sentryService.addBreadcrumb(
      `${req.method} ${req.url}`,
      'http',
      'info',
      {
        method: req.method,
        url: req.url,
        userId: req.user?.id
      }
    );

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      
      this.logger[level]('Request completed', {
        requestId: req.requestId,
        operation: 'http_request',
        metadata: {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userId: req.user?.id
        }
      });
    });

    next();
  };

  // Async error wrapper
  asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Main error handling middleware
  errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    // Set user context for Sentry
    if (req.user) {
      sentryService.setUser({
        id: req.user.id,
        email: req.user.email
      });
    }

    // Set request context for Sentry
    sentryService.setContext('request', {
      method: req.method,
      url: req.url,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      params: req.params,
      query: req.query
    });

    // Capture error in Sentry (only for non-operational errors)
    if (!(error instanceof AppError) || !error.isOperational) {
      sentryService.captureError(error, {
        requestId: req.requestId,
        userId: req.user?.id
      });
    }

    // Handle the error and create response
    const errorResponse: ErrorResponse = this.errorHandler.handleError(error, req.requestId);
    
    // Send error response
    res.status((error as AppError).statusCode || 500).json(errorResponse);
  };

  // 404 handler
  notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = ErrorHandler.resourceNotFound('endpoint', req.originalUrl);
    next(error);
  };

  // Validation error handler
  validationErrorHandler = (req: Request, res: Response, next: NextFunction): void => {
    // This would typically be used with express-validator
    // For now, it's a placeholder for validation error handling
    next();
  };

  // Rate limiting error handler
  rateLimitErrorHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = new AppError(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests',
      'You have made too many requests. Please try again later.',
      429,
      true,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      },
      ['Wait before making more requests', 'Consider upgrading your plan for higher limits']
    );
    
    next(error);
  };

  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// Create singleton instance
export const errorHandlingMiddleware = new ErrorHandlingMiddleware();

// Export individual middleware functions
export const {
  requestId,
  requestLogger,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  rateLimitErrorHandler
} = errorHandlingMiddleware;