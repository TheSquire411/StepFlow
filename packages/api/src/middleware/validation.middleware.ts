import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { logger } from '../services/sentry.service';

export interface ValidationOptions {
  sanitizeHtml?: boolean;
  allowedTags?: string[];
  maxLength?: number;
  customValidation?: (value: any) => boolean;
}

export class ValidationMiddleware {
  /**
   * Validates request body against Zod schema
   */
  static validateBody(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.body);
        req.body = this.sanitizeObject(validatedData);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Validation error', { 
            errors: error.errors, 
            path: req.path,
            ip: req.ip 
          });
          
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
              })),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        next(error);
      }
    };
  }

  /**
   * Validates query parameters against Zod schema
   */
  static validateQuery(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.query);
        req.query = this.sanitizeObject(validatedData);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Query validation error', { 
            errors: error.errors, 
            path: req.path,
            ip: req.ip 
          });
          
          return res.status(400).json({
            error: {
              code: 'QUERY_VALIDATION_ERROR',
              message: 'Invalid query parameters',
              details: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
              })),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        next(error);
      }
    };
  }

  /**
   * Validates URL parameters against Zod schema
   */
  static validateParams(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse(req.params);
        req.params = this.sanitizeObject(validatedData);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Params validation error', { 
            errors: error.errors, 
            path: req.path,
            ip: req.ip 
          });
          
          return res.status(400).json({
            error: {
              code: 'PARAMS_VALIDATION_ERROR',
              message: 'Invalid URL parameters',
              details: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
              })),
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        next(error);
      }
    };
  }

  /**
   * Sanitizes an object recursively
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Sanitizes a string value
   */
  private static sanitizeString(value: string, options: ValidationOptions = {}): string {
    // Basic XSS protection
    let sanitized = DOMPurify.sanitize(value, {
      ALLOWED_TAGS: options.allowedTags || [],
      ALLOWED_ATTR: []
    });

    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/['"\\;]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
    
    // Apply length limits
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized;
  }

  /**
   * File upload validation middleware
   */
  static validateFileUpload(options: {
    allowedMimeTypes: string[];
    maxFileSize: number;
    maxFiles?: number;
  }) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.files && !req.file) {
        return next();
      }

      const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];
      
      // Check file count
      if (options.maxFiles && files.length > options.maxFiles) {
        logger.warn('Too many files uploaded', { 
          fileCount: files.length, 
          maxAllowed: options.maxFiles,
          ip: req.ip 
        });
        
        return res.status(400).json({
          error: {
            code: 'TOO_MANY_FILES',
            message: `Maximum ${options.maxFiles} files allowed`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      // Validate each file
      for (const file of files) {
        if (!file) continue;

        // Check file size
        if (file.size > options.maxFileSize) {
          logger.warn('File too large', { 
            fileSize: file.size, 
            maxSize: options.maxFileSize,
            filename: file.originalname,
            ip: req.ip 
          });
          
          return res.status(400).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds ${options.maxFileSize} bytes`,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        // Check MIME type
        if (!options.allowedMimeTypes.includes(file.mimetype)) {
          logger.warn('Invalid file type', { 
            mimeType: file.mimetype, 
            allowedTypes: options.allowedMimeTypes,
            filename: file.originalname,
            ip: req.ip 
          });
          
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File type ${file.mimetype} not allowed`,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        // Sanitize filename
        if (file.originalname) {
          file.originalname = validator.escape(file.originalname);
        }
      }

      next();
    };
  }
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number and special character'),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  url: z.string().url('Invalid URL format').max(2048),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
};