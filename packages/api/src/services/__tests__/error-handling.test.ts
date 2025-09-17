import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '../../../../shared/src/utils/logger';
import { ErrorHandler, AppError } from '../../../../shared/src/utils/error-handler';
import { ErrorCodes } from '../../../../shared/src/types/logging.types';

describe('ErrorHandler', () => {
  let logger: Logger;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    logger = new Logger('test-service');
    errorHandler = new ErrorHandler(logger);
    vi.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'Authentication failed',
        'Please check your credentials',
        401,
        true,
        { userId: '123' },
        ['Check email and password']
      );

      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
      expect(error.message).toBe('Authentication failed');
      expect(error.userMessage).toBe('Please check your credentials');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ userId: '123' });
      expect(error.recoveryActions).toEqual(['Check email and password']);
    });

    it('should have default values for optional parameters', () => {
      const error = new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Internal error',
        'Something went wrong'
      );

      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error.recoveryActions).toBeUndefined();
    });
  });

  describe('ErrorHandler.createErrorResponse', () => {
    it('should create a proper error response', () => {
      const error = new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        'Please check your input',
        400,
        true,
        { field: 'email' },
        ['Check email format']
      );

      const response = errorHandler.createErrorResponse(error, 'req-123');

      expect(response.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.error.message).toBe('Validation failed');
      expect(response.error.userMessage).toBe('Please check your input');
      expect(response.error.details).toEqual({ field: 'email' });
      expect(response.error.requestId).toBe('req-123');
      expect(response.error.recoveryActions).toEqual(['Check email format']);
      expect(response.error.timestamp).toBeDefined();
    });
  });

  describe('ErrorHandler.handleError', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError(
        ErrorCodes.RECORDING_UPLOAD_FAILED,
        'Upload failed',
        'Could not upload recording'
      );

      const response = errorHandler.handleError(appError, 'req-456');

      expect(response.error.code).toBe(ErrorCodes.RECORDING_UPLOAD_FAILED);
      expect(response.error.message).toBe('Upload failed');
      expect(response.error.userMessage).toBe('Could not upload recording');
      expect(response.error.requestId).toBe('req-456');
    });

    it('should convert regular Error to AppError', () => {
      const regularError = new Error('Something broke');

      const response = errorHandler.handleError(regularError, 'req-789');

      expect(response.error.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
      expect(response.error.message).toBe('Something broke');
      expect(response.error.userMessage).toBe('Something went wrong. Please try again later.');
      expect(response.error.requestId).toBe('req-789');
    });

    it('should handle error without requestId', () => {
      const error = new Error('Test error');

      const response = errorHandler.handleError(error);

      expect(response.error.requestId).toBe('unknown');
    });
  });

  describe('ErrorHandler static methods', () => {
    it('should create authentication failed error', () => {
      const error = ErrorHandler.authenticationFailed({ attempt: 3 });

      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ attempt: 3 });
      expect(error.recoveryActions).toContain('Check your email and password');
    });

    it('should create insufficient permissions error', () => {
      const error = ErrorHandler.insufficientPermissions('admin-panel');

      expect(error.code).toBe(ErrorCodes.INSUFFICIENT_PERMISSIONS);
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({ resource: 'admin-panel' });
      expect(error.recoveryActions).toContain('Contact your administrator for access');
    });

    it('should create recording upload failed error', () => {
      const error = ErrorHandler.recordingUploadFailed('File too large');

      expect(error.code).toBe(ErrorCodes.RECORDING_UPLOAD_FAILED);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ reason: 'File too large' });
      expect(error.recoveryActions).toContain('Try uploading a smaller file');
    });

    it('should create AI processing failed error', () => {
      const error = ErrorHandler.aiProcessingFailed('content generation');

      expect(error.code).toBe(ErrorCodes.AI_PROCESSING_FAILED);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ operation: 'content generation' });
      expect(error.recoveryActions).toContain('Try again in a few minutes');
    });

    it('should create storage quota exceeded error', () => {
      const error = ErrorHandler.storageQuotaExceeded(1000, 500);

      expect(error.code).toBe(ErrorCodes.STORAGE_QUOTA_EXCEEDED);
      expect(error.statusCode).toBe(413);
      expect(error.details).toEqual({ currentUsage: 1000, limit: 500 });
      expect(error.recoveryActions).toContain('Delete unused recordings or guides');
    });

    it('should create invalid file format error', () => {
      const error = ErrorHandler.invalidFileFormat(['MP4', 'WebM']);

      expect(error.code).toBe(ErrorCodes.INVALID_FILE_FORMAT);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ expectedFormats: ['MP4', 'WebM'] });
      expect(error.recoveryActions).toContain('Supported formats: MP4, WebM');
    });

    it('should create database connection failed error', () => {
      const error = ErrorHandler.databaseConnectionFailed();

      expect(error.code).toBe(ErrorCodes.DATABASE_CONNECTION_FAILED);
      expect(error.statusCode).toBe(503);
      expect(error.recoveryActions).toContain('Try again in a few minutes');
    });

    it('should create external service unavailable error', () => {
      const error = ErrorHandler.externalServiceUnavailable('OpenAI');

      expect(error.code).toBe(ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual({ service: 'OpenAI' });
      expect(error.recoveryActions).toContain('Try again in a few minutes');
    });

    it('should create validation error', () => {
      const error = ErrorHandler.validationError('email', 'Invalid email format');

      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ 
        field: 'email', 
        validationMessage: 'Invalid email format' 
      });
      expect(error.recoveryActions).toContain('Check the highlighted fields');
    });

    it('should create resource not found error', () => {
      const error = ErrorHandler.resourceNotFound('Guide', 'guide-123');

      expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resource: 'Guide', id: 'guide-123' });
      expect(error.recoveryActions).toContain('Check the URL or ID');
    });
  });
});