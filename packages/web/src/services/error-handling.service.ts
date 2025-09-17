import { ErrorResponse, ErrorCodes } from '../../../shared/src/types/logging.types';

export interface UserFriendlyError {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  recoveryActions: string[];
  canRetry: boolean;
  contactSupport: boolean;
}

export class ErrorHandlingService {
  private static errorMessages: Record<string, UserFriendlyError> = {
    [ErrorCodes.AUTHENTICATION_FAILED]: {
      title: 'Authentication Failed',
      message: 'We couldn\'t verify your credentials. Please check your email and password.',
      type: 'error',
      recoveryActions: [
        'Double-check your email and password',
        'Try resetting your password',
        'Clear your browser cache and cookies'
      ],
      canRetry: true,
      contactSupport: false
    },

    [ErrorCodes.INSUFFICIENT_PERMISSIONS]: {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      type: 'warning',
      recoveryActions: [
        'Contact your team administrator',
        'Check if you need to upgrade your plan',
        'Verify you\'re logged into the correct account'
      ],
      canRetry: false,
      contactSupport: true
    },

    [ErrorCodes.RECORDING_UPLOAD_FAILED]: {
      title: 'Upload Failed',
      message: 'We couldn\'t upload your recording. This might be due to a network issue or file size.',
      type: 'error',
      recoveryActions: [
        'Check your internet connection',
        'Try uploading a smaller file',
        'Wait a moment and try again'
      ],
      canRetry: true,
      contactSupport: true
    },

    [ErrorCodes.AI_PROCESSING_FAILED]: {
      title: 'AI Processing Error',
      message: 'We encountered an issue while processing your content with AI.',
      type: 'error',
      recoveryActions: [
        'Try again in a few minutes',
        'Check if your content meets our guidelines',
        'Try with a shorter recording'
      ],
      canRetry: true,
      contactSupport: true
    },

    [ErrorCodes.STORAGE_QUOTA_EXCEEDED]: {
      title: 'Storage Limit Reached',
      message: 'You\'ve reached your storage limit. Please free up space or upgrade your plan.',
      type: 'warning',
      recoveryActions: [
        'Delete unused recordings or guides',
        'Upgrade to a higher plan',
        'Archive old content'
      ],
      canRetry: false,
      contactSupport: false
    },

    [ErrorCodes.INVALID_FILE_FORMAT]: {
      title: 'Unsupported File Format',
      message: 'The file format you\'re trying to upload isn\'t supported.',
      type: 'warning',
      recoveryActions: [
        'Use MP4, WebM, or MOV format for videos',
        'Use JPG or PNG format for images',
        'Convert your file to a supported format'
      ],
      canRetry: false,
      contactSupport: false
    },

    [ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE]: {
      title: 'Service Temporarily Unavailable',
      message: 'Some features are temporarily unavailable due to external service issues.',
      type: 'info',
      recoveryActions: [
        'Try again in a few minutes',
        'Check our status page for updates',
        'Use alternative features if available'
      ],
      canRetry: true,
      contactSupport: false
    },

    [ErrorCodes.RATE_LIMIT_EXCEEDED]: {
      title: 'Too Many Requests',
      message: 'You\'ve made too many requests. Please wait before trying again.',
      type: 'warning',
      recoveryActions: [
        'Wait a few minutes before trying again',
        'Consider upgrading for higher limits',
        'Spread out your requests over time'
      ],
      canRetry: true,
      contactSupport: false
    },

    [ErrorCodes.INTERNAL_SERVER_ERROR]: {
      title: 'Something Went Wrong',
      message: 'We encountered an unexpected error. Our team has been notified.',
      type: 'error',
      recoveryActions: [
        'Try refreshing the page',
        'Try again in a few minutes',
        'Check our status page for updates'
      ],
      canRetry: true,
      contactSupport: true
    }
  };

  static getUserFriendlyError(errorResponse: ErrorResponse): UserFriendlyError {
    const errorCode = errorResponse.error.code;
    const predefinedError = this.errorMessages[errorCode];

    if (predefinedError) {
      return {
        ...predefinedError,
        recoveryActions: errorResponse.error.recoveryActions || predefinedError.recoveryActions
      };
    }

    // Fallback for unknown errors
    return {
      title: 'Unexpected Error',
      message: errorResponse.error.userMessage || 'An unexpected error occurred.',
      type: 'error',
      recoveryActions: errorResponse.error.recoveryActions || [
        'Try refreshing the page',
        'Try again in a few minutes'
      ],
      canRetry: true,
      contactSupport: true
    };
  }

  static shouldShowRetryButton(errorCode: string): boolean {
    const error = this.errorMessages[errorCode];
    return error?.canRetry ?? true;
  }

  static shouldShowSupportLink(errorCode: string): boolean {
    const error = this.errorMessages[errorCode];
    return error?.contactSupport ?? false;
  }

  static getErrorType(errorCode: string): 'error' | 'warning' | 'info' {
    const error = this.errorMessages[errorCode];
    return error?.type ?? 'error';
  }

  static formatErrorForDisplay(errorResponse: ErrorResponse): {
    title: string;
    message: string;
    details?: string;
    timestamp: string;
    requestId: string;
  } {
    const userError = this.getUserFriendlyError(errorResponse);
    
    return {
      title: userError.title,
      message: userError.message,
      details: process.env.NODE_ENV === 'development' ? errorResponse.error.message : undefined,
      timestamp: new Date(errorResponse.error.timestamp).toLocaleString(),
      requestId: errorResponse.error.requestId
    };
  }

  static createErrorToast(errorResponse: ErrorResponse): {
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    actions?: Array<{
      label: string;
      action: () => void;
    }>;
  } {
    const userError = this.getUserFriendlyError(errorResponse);
    
    const toast = {
      type: userError.type,
      title: userError.title,
      message: userError.message,
      actions: [] as Array<{ label: string; action: () => void }>
    };

    // Add retry action if applicable
    if (userError.canRetry) {
      toast.actions.push({
        label: 'Retry',
        action: () => {
          // This would be handled by the calling component
          console.log('Retry action triggered');
        }
      });
    }

    // Add support action if applicable
    if (userError.contactSupport) {
      toast.actions.push({
        label: 'Contact Support',
        action: () => {
          // Open support chat or email
          window.open('mailto:support@stepflow.com?subject=Error Report&body=' + 
            encodeURIComponent(`Error Code: ${errorResponse.error.code}\nRequest ID: ${errorResponse.error.requestId}\nTimestamp: ${errorResponse.error.timestamp}`));
        }
      });
    }

    return toast;
  }
}

// Hook for React components
export const useErrorHandling = () => {
  const handleError = (error: ErrorResponse | Error) => {
    if ('error' in error) {
      // It's an ErrorResponse
      return ErrorHandlingService.getUserFriendlyError(error);
    } else {
      // It's a regular Error, convert it
      const errorResponse: ErrorResponse = {
        error: {
          code: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: error.message,
          userMessage: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          requestId: 'unknown'
        }
      };
      return ErrorHandlingService.getUserFriendlyError(errorResponse);
    }
  };

  const showErrorToast = (error: ErrorResponse | Error) => {
    const errorResponse = 'error' in error ? error : {
      error: {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: error.message,
        userMessage: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: 'unknown'
      }
    };

    return ErrorHandlingService.createErrorToast(errorResponse);
  };

  return {
    handleError,
    showErrorToast,
    getUserFriendlyError: ErrorHandlingService.getUserFriendlyError,
    formatErrorForDisplay: ErrorHandlingService.formatErrorForDisplay
  };
};