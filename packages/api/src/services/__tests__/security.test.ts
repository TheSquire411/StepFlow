import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { EncryptionService } from '../encryption.service';
import { ValidationMiddleware } from '../../middleware/validation.middleware';
import { z } from 'zod';

// Mock dependencies
vi.mock('../sentry.service', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));
vi.mock('../../config/redis', () => ({
  redisClient: {
    call: vi.fn()
  }
}));

describe('Security Services', () => {
  describe('EncryptionService', () => {
    beforeEach(() => {
      process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing';
      EncryptionService.initialize();
    });

    it('should generate secure tokens', () => {
      const token1 = EncryptionService.generateSecureToken();
      const token2 = EncryptionService.generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should hash passwords securely', async () => {
      const password = 'testPassword123!';
      const hash = await EncryptionService.hashPassword(password);
      const isValid = await EncryptionService.verifyPassword(password, hash);

      expect(hash).not.toBe(password);
      expect(isValid).toBe(true);
    });

    it('should mask sensitive data for logging', () => {
      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
        normalField: 'normal value'
      };

      const masked = EncryptionService.maskSensitiveData(sensitiveData);

      expect(masked.email).toBe('us***@example.com');
      expect(masked.password).not.toBe('secret123');
      expect(masked.normalField).toBe('normal value');
    });
  });

  describe('ValidationMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: any;

    beforeEach(() => {
      mockReq = {
        body: {},
        query: {},
        params: {},
        ip: '127.0.0.1',
        headers: { 'x-request-id': 'test-request-id' },
        path: '/test'
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      mockNext = vi.fn();
    });

    it('should validate request body successfully', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      });

      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const middleware = ValidationMiddleware.validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid request body', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      });

      mockReq.body = {
        name: '',
        email: 'invalid-email'
      };

      const middleware = ValidationMiddleware.validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate file uploads', () => {
      const middleware = ValidationMiddleware.validateFileUpload({
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxFileSize: 1024 * 1024, // 1MB
        maxFiles: 5
      });

      mockReq.file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 500000 // 500KB
      } as any;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject files that are too large', () => {
      const middleware = ValidationMiddleware.validateFileUpload({
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxFileSize: 1024 * 1024, // 1MB
        maxFiles: 5
      });

      mockReq.file = {
        originalname: 'large-file.jpg',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024 // 2MB
      } as any;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FILE_TOO_LARGE'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});