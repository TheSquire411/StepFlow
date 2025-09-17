import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { RateLimitingMiddleware, DDoSProtection } from './rate-limiting.middleware';
import { ValidationMiddleware } from './validation.middleware';
import { AuditLoggingService } from '../services/audit-logging.service';
import { logger } from '../services/sentry.service';

export class SecurityMiddleware {
  /**
   * Configure Helmet for security headers
   */
  static helmet = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.stepflow.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for guide sharing
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });

  /**
   * Configure CORS
   */
  static cors = cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://stepflow.com',
        'https://www.stepflow.com',
        'https://app.stepflow.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ];

      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
    maxAge: 86400 // 24 hours
  });

  /**
   * Request ID middleware
   */
  static requestId = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || 
                     require('crypto').randomUUID();
    
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    next();
  };

  /**
   * Security headers middleware
   */
  static securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    next();
  };

  /**
   * IP whitelist middleware
   */
  static ipWhitelist(allowedIPs: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip;
      
      if (!allowedIPs.includes(clientIP)) {
        logger.warn('IP not whitelisted', { ip: clientIP, path: req.path });
        
        AuditLoggingService.logSecurityEvent(req, {
          action: 'unauthorized_access',
          details: { reason: 'IP not whitelisted' },
          riskLevel: 'high'
        });
        
        return res.status(403).json({
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access denied',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }
      
      next();
    };
  }

  /**
   * API key validation middleware
   */
  static validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'API_KEY_MISSING',
          message: 'API key is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }

    // Validate API key format
    if (!apiKey.startsWith('sk_') || apiKey.length !== 51) {
      logger.warn('Invalid API key format', { 
        keyPrefix: apiKey.substring(0, 5),
        ip: req.ip 
      });
      
      AuditLoggingService.logSecurityEvent(req, {
        action: 'unauthorized_access',
        details: { reason: 'Invalid API key format' },
        riskLevel: 'medium'
      });
      
      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }

    // TODO: Validate API key against database
    // const isValid = await validateAPIKeyInDatabase(apiKey);
    
    next();
  };

  /**
   * Content type validation
   */
  static validateContentType(allowedTypes: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
      }

      const contentType = req.headers['content-type'];
      
      if (!contentType) {
        return res.status(400).json({
          error: {
            code: 'CONTENT_TYPE_MISSING',
            message: 'Content-Type header is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      const isAllowed = allowedTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isAllowed) {
        logger.warn('Invalid content type', { 
          contentType, 
          allowedTypes,
          ip: req.ip 
        });
        
        return res.status(415).json({
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: `Content-Type ${contentType} not supported`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      next();
    };
  }

  /**
   * Request size limit middleware
   */
  static requestSizeLimit(maxSize: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      
      if (contentLength > maxSize) {
        logger.warn('Request too large', { 
          contentLength, 
          maxSize,
          ip: req.ip 
        });
        
        return res.status(413).json({
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: `Request size ${contentLength} exceeds limit ${maxSize}`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      next();
    };
  }

  /**
   * Suspicious activity detection
   */
  static suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
      /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection
      /<script|javascript:|vbscript:|onload=|onerror=/i, // XSS
      /\.\.\//g, // Path traversal
      /%00|%2e%2e%2f|%252e%252e%252f/i, // Encoded path traversal
      /\b(eval|exec|system|shell_exec)\b/i // Code injection
    ];

    const checkString = JSON.stringify({
      url: req.url,
      query: req.query,
      body: req.body,
      headers: req.headers
    });

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(checkString));

    if (isSuspicious) {
      logger.warn('Suspicious activity detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      AuditLoggingService.logSecurityEvent(req, {
        action: 'suspicious_activity',
        details: { 
          reason: 'Malicious pattern detected',
          patterns: suspiciousPatterns.map(p => p.toString())
        },
        riskLevel: 'high'
      });

      return res.status(400).json({
        error: {
          code: 'SUSPICIOUS_REQUEST',
          message: 'Request blocked due to suspicious content',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }

    next();
  };

  /**
   * Complete security middleware stack
   */
  static getSecurityStack() {
    return [
      this.requestId,
      this.helmet,
      this.cors,
      this.securityHeaders,
      DDoSProtection.middleware,
      RateLimitingMiddleware.general,
      this.suspiciousActivityDetection,
      this.validateContentType(['application/json', 'multipart/form-data']),
      this.requestSizeLimit(10 * 1024 * 1024), // 10MB limit
      AuditLoggingService.createAuditMiddleware()
    ];
  }

  /**
   * Admin-only security stack
   */
  static getAdminSecurityStack() {
    return [
      this.requestId,
      this.helmet,
      this.securityHeaders,
      RateLimitingMiddleware.custom({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Admin rate limit exceeded'
      }),
      this.suspiciousActivityDetection,
      AuditLoggingService.createAuditMiddleware()
    ];
  }
}