import { describe, it, expect } from 'vitest';
import { ErrorHandlingService } from '../error-handling.service';
import { ErrorCodes, ErrorResponse } from '../../../../shared/src/types/logging.types';

describe('ErrorHandlingService', () => {
  const createErrorResponse = (code: string, message: string, userMessage: string): ErrorResponse => ({
    error: {
      code,
      message,
      userMessage,
      timestamp: new Date().toISOString(),
      requestId: 'test-request-123'
    }
  });

  describe('getUserFriendlyError', () => {
    it('should return predefined error for known error codes', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.AUTHENTICATION_FAILED,
        'Auth failed',
        'Please check credentials'
      );

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.title).toBe('Authentication Failed');
      expect(userError.message).toBe('We couldn\'t verify your credentials. Please check your email and password.');
      expect(userError.type).toBe('error');
      expect(userError.canRetry).toBe(true);
      expect(userError.contactSupport).toBe(false);
      expect(userError.recoveryActions).toContain('Double-check your email and password');
    });

    it('should return fallback error for unknown error codes', () => {
      const errorResponse = createErrorResponse(
        'UNKNOWN_ERROR',
        'Something broke',
        'Custom user message'
      );

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.title).toBe('Unexpected Error');
      expect(userError.message).toBe('Custom user message');
      expect(userError.type).toBe('error');
      expect(userError.canRetry).toBe(true);
      expect(userError.contactSupport).toBe(true);
    });

    it('should use custom recovery actions when provided', () => {
      const errorResponse: ErrorResponse = {
        error: {
          code: ErrorCodes.AUTHENTICATION_FAILED,
          message: 'Auth failed',
          userMessage: 'Please check credentials',
          timestamp: new Date().toISOString(),
          requestId: 'test-request-123',
          recoveryActions: ['Custom action 1', 'Custom action 2']
        }
      };

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.recoveryActions).toEqual(['Custom action 1', 'Custom action 2']);
    });
  });

  describe('shouldShowRetryButton', () => {
    it('should return true for retryable errors', () => {
      expect(ErrorHandlingService.shouldShowRetryButton(ErrorCodes.RECORDING_UPLOAD_FAILED)).toBe(true);
      expect(ErrorHandlingService.shouldShowRetryButton(ErrorCodes.AI_PROCESSING_FAILED)).toBe(true);
      expect(ErrorHandlingService.shouldShowRetryButton(ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(ErrorHandlingService.shouldShowRetryButton(ErrorCodes.STORAGE_QUOTA_EXCEEDED)).toBe(false);
      expect(ErrorHandlingService.shouldShowRetryButton(ErrorCodes.INVALID_FILE_FORMAT)).toBe(false);
    });

    it('should return true for unknown error codes', () => {
      expect(ErrorHandlingService.shouldShowRetryButton('UNKNOWN_ERROR')).toBe(true);
    });
  });

  describe('shouldShowSupportLink', () => {
    it('should return true for errors that need support', () => {
      expect(ErrorHandlingService.shouldShowSupportLink(ErrorCodes.INSUFFICIENT_PERMISSIONS)).toBe(true);
      expect(ErrorHandlingService.shouldShowSupportLink(ErrorCodes.RECORDING_UPLOAD_FAILED)).toBe(true);
      expect(ErrorHandlingService.shouldShowSupportLink(ErrorCodes.INTERNAL_SERVER_ERROR)).toBe(true);
    });

    it('should return false for self-service errors', () => {
      expect(ErrorHandlingService.shouldShowSupportLink(ErrorCodes.AUTHENTICATION_FAILED)).toBe(false);
      expect(ErrorHandlingService.shouldShowSupportLink(ErrorCodes.STORAGE_QUOTA_EXCEEDED)).toBe(false);
      expect(ErrorHandlingService.shouldShowSupportLink(ErrorCodes.INVALID_FILE_FORMAT)).toBe(false);
    });
  });

  describe('getErrorType', () => {
    it('should return correct error types', () => {
      expect(ErrorHandlingService.getErrorType(ErrorCodes.AUTHENTICATION_FAILED)).toBe('error');
      expect(ErrorHandlingService.getErrorType(ErrorCodes.STORAGE_QUOTA_EXCEEDED)).toBe('warning');
      expect(ErrorHandlingService.getErrorType(ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE)).toBe('info');
    });

    it('should return error as default for unknown codes', () => {
      expect(ErrorHandlingService.getErrorType('UNKNOWN_ERROR')).toBe('error');
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format error for display correctly', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.RECORDING_UPLOAD_FAILED,
        'Upload failed',
        'Could not upload recording'
      );

      const formatted = ErrorHandlingService.formatErrorForDisplay(errorResponse);

      expect(formatted.title).toBe('Upload Failed');
      expect(formatted.message).toBe('We couldn\'t upload your recording. This might be due to a network issue or file size.');
      expect(formatted.requestId).toBe('test-request-123');
      expect(formatted.timestamp).toBeDefined();
    });

    it('should include technical details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorResponse = createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Internal error occurred',
        'Something went wrong'
      );

      const formatted = ErrorHandlingService.formatErrorForDisplay(errorResponse);

      expect(formatted.details).toBe('Internal error occurred');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include technical details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorResponse = createErrorResponse(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Internal error occurred',
        'Something went wrong'
      );

      const formatted = ErrorHandlingService.formatErrorForDisplay(errorResponse);

      expect(formatted.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createErrorToast', () => {
    it('should create error toast with retry action', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.AI_PROCESSING_FAILED,
        'AI processing failed',
        'Could not process content'
      );

      const toast = ErrorHandlingService.createErrorToast(errorResponse);

      expect(toast.type).toBe('error');
      expect(toast.title).toBe('AI Processing Error');
      expect(toast.message).toBe('We encountered an issue while processing your content with AI.');
      expect(toast.actions).toHaveLength(2); // Retry + Contact Support
      expect(toast.actions?.[0].label).toBe('Retry');
      expect(toast.actions?.[1].label).toBe('Contact Support');
    });

    it('should create warning toast without retry action', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.STORAGE_QUOTA_EXCEEDED,
        'Storage quota exceeded',
        'You have reached your limit'
      );

      const toast = ErrorHandlingService.createErrorToast(errorResponse);

      expect(toast.type).toBe('warning');
      expect(toast.title).toBe('Storage Limit Reached');
      expect(toast.actions).toHaveLength(0); // No retry, no support
    });

    it('should create info toast with retry action', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
        'Service unavailable',
        'External service is down'
      );

      const toast = ErrorHandlingService.createErrorToast(errorResponse);

      expect(toast.type).toBe('info');
      expect(toast.title).toBe('Service Temporarily Unavailable');
      expect(toast.actions).toHaveLength(1); // Only retry
      expect(toast.actions?.[0].label).toBe('Retry');
    });
  });

  describe('error message content validation', () => {
    it('should have appropriate messages for authentication errors', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.AUTHENTICATION_FAILED,
        'Auth failed',
        'Check credentials'
      );

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.recoveryActions).toContain('Double-check your email and password');
      expect(userError.recoveryActions).toContain('Try resetting your password');
    });

    it('should have appropriate messages for file upload errors', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.RECORDING_UPLOAD_FAILED,
        'Upload failed',
        'Could not upload'
      );

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.recoveryActions).toContain('Check your internet connection');
      expect(userError.recoveryActions).toContain('Try uploading a smaller file');
    });

    it('should have appropriate messages for quota errors', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.STORAGE_QUOTA_EXCEEDED,
        'Quota exceeded',
        'Storage limit reached'
      );

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.recoveryActions).toContain('Delete unused recordings or guides');
      expect(userError.recoveryActions).toContain('Upgrade to a higher plan');
    });

    it('should have appropriate messages for file format errors', () => {
      const errorResponse = createErrorResponse(
        ErrorCodes.INVALID_FILE_FORMAT,
        'Invalid format',
        'File format not supported'
      );

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      expect(userError.recoveryActions).toContain('Use MP4, WebM, or MOV format for videos');
      expect(userError.recoveryActions).toContain('Convert your file to a supported format');
    });
  });
});