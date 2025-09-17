import { ErrorCodes, ErrorResponse } from '../types/logging.types';
import { Logger } from './logger';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;
  public readonly recoveryActions?: string[];

  constructor(
    code: string,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, any>,
    recoveryActions?: string[]
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.isOperational = isOperational;
    this.details = details;
    this.recoveryActions = recoveryActions;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  createErrorResponse(error: AppError, requestId: string): ErrorResponse {
    return {
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId,
        recoveryActions: error.recoveryActions
      }
    };
  }

  handleError(error: Error, requestId?: string): ErrorResponse {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // Convert unknown errors to AppError
      appError = new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        error.message || 'An unexpected error occurred',
        'Something went wrong. Please try again later.',
        500,
        false
      );
    }

    // Log the error
    this.logger.error('Error occurred', {
      requestId,
      operation: 'error_handling'
    }, appError);

    return this.createErrorResponse(appError, requestId || 'unknown');
  }

  // Predefined error creators
  static authenticationFailed(details?: Record<string, any>): AppError {
    return new AppError(
      ErrorCodes.AUTHENTICATION_FAILED,
      'Authentication failed',
      'Please check your credentials and try again.',
      401,
      true,
      details,
      ['Check your email and password', 'Reset your password if needed']
    );
  }

  static insufficientPermissions(resource?: string): AppError {
    return new AppError(
      ErrorCodes.INSUFFICIENT_PERMISSIONS,
      `Insufficient permissions${resource ? ` for ${resource}` : ''}`,
      'You don\'t have permission to perform this action.',
      403,
      true,
      { resource },
      ['Contact your administrator for access', 'Check your account permissions']
    );
  }

  static recordingUploadFailed(reason?: string): AppError {
    return new AppError(
      ErrorCodes.RECORDING_UPLOAD_FAILED,
      `Recording upload failed${reason ? `: ${reason}` : ''}`,
      'Failed to upload your recording. Please try again.',
      400,
      true,
      { reason },
      ['Check your internet connection', 'Try uploading a smaller file', 'Contact support if the problem persists']
    );
  }

  static aiProcessingFailed(operation?: string): AppError {
    return new AppError(
      ErrorCodes.AI_PROCESSING_FAILED,
      `AI processing failed${operation ? ` for ${operation}` : ''}`,
      'We couldn\'t process your content with AI. Please try again.',
      500,
      true,
      { operation },
      ['Try again in a few minutes', 'Check if your content meets our guidelines', 'Contact support if the issue persists']
    );
  }

  static storageQuotaExceeded(currentUsage?: number, limit?: number): AppError {
    return new AppError(
      ErrorCodes.STORAGE_QUOTA_EXCEEDED,
      'Storage quota exceeded',
      'You\'ve reached your storage limit. Please upgrade your plan or delete some files.',
      413,
      true,
      { currentUsage, limit },
      ['Delete unused recordings or guides', 'Upgrade to a higher plan', 'Contact support for assistance']
    );
  }

  static invalidFileFormat(expectedFormats?: string[]): AppError {
    return new AppError(
      ErrorCodes.INVALID_FILE_FORMAT,
      'Invalid file format',
      'The file format is not supported. Please use a supported format.',
      400,
      true,
      { expectedFormats },
      [`Supported formats: ${expectedFormats?.join(', ') || 'MP4, WebM, MOV'}`, 'Convert your file to a supported format']
    );
  }

  static databaseConnectionFailed(): AppError {
    return new AppError(
      ErrorCodes.DATABASE_CONNECTION_FAILED,
      'Database connection failed',
      'We\'re experiencing technical difficulties. Please try again later.',
      503,
      true,
      undefined,
      ['Try again in a few minutes', 'Check our status page for updates']
    );
  }

  static externalServiceUnavailable(service: string): AppError {
    return new AppError(
      ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
      `External service unavailable: ${service}`,
      'Some features are temporarily unavailable. Please try again later.',
      503,
      true,
      { service },
      ['Try again in a few minutes', 'Use alternative features if available']
    );
  }

  static validationError(field: string, message: string): AppError {
    return new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `Validation error: ${field} - ${message}`,
      `Please check your input: ${message}`,
      400,
      true,
      { field, validationMessage: message },
      ['Check the highlighted fields', 'Ensure all required information is provided']
    );
  }

  static resourceNotFound(resource: string, id?: string): AppError {
    return new AppError(
      ErrorCodes.RESOURCE_NOT_FOUND,
      `${resource} not found${id ? ` with id: ${id}` : ''}`,
      'The requested item could not be found.',
      404,
      true,
      { resource, id },
      ['Check the URL or ID', 'Make sure you have access to this item']
    );
  }
}