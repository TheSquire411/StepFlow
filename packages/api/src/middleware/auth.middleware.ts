import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean;
}

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware(authService: AuthService, options: AuthMiddlewareOptions = {}) {
  const { required = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (required) {
          return res.status(401).json({
            error: {
              code: 'AUTH_001',
              message: 'Access token required',
              timestamp: new Date().toISOString()
            }
          });
        }
        return next();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        const userId = await authService.verifyAccessToken(token);
        req.userId = userId;
        next();
      } catch (error) {
        if (required) {
          return res.status(401).json({
            error: {
              code: 'AUTH_001',
              message: 'Invalid or expired access token',
              timestamp: new Date().toISOString()
            }
          });
        }
        next();
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * Middleware that requires authentication
 */
export function requireAuth(authService: AuthService) {
  return createAuthMiddleware(authService, { required: true });
}

/**
 * Middleware that optionally includes authentication
 */
export function optionalAuth(authService: AuthService) {
  return createAuthMiddleware(authService, { required: false });
}

// Extended Request interface for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

/**
 * Simple token authentication middleware (for backward compatibility)
 * This assumes the AuthService is available globally or injected elsewhere
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_001',
          message: 'Access token required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For now, we'll do a simple JWT verification
    // In a real implementation, this should use the AuthService
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'AUTH_001',
        message: 'Invalid or expired access token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Optional authentication middleware (for backward compatibility)
 */
export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      req.user = { id: decoded.userId };
    } catch (error) {
      // Ignore token errors for optional auth
    }
    
    next();
  } catch (error) {
    next();
  }
};