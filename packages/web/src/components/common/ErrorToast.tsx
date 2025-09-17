import React, { useState, useEffect } from 'react';
import { ErrorResponse } from '../../../../shared/src/types/logging.types';
import { ErrorHandlingService } from '../../services/error-handling.service';

interface ErrorToastProps {
  error: ErrorResponse;
  onClose: () => void;
  onRetry?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  onRetry,
  autoClose = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const userError = ErrorHandlingService.getUserFriendlyError(error);

  useEffect(() => {
    if (autoClose && userError.type !== 'error') {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, userError.type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    handleClose();
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Error Report - ${error.error.code}`);
    const body = encodeURIComponent(
      `Error Code: ${error.error.code}\n` +
      `Request ID: ${error.error.requestId}\n` +
      `Timestamp: ${error.error.timestamp}\n` +
      `Message: ${error.error.message}\n\n` +
      `Please describe what you were doing when this error occurred:`
    );
    
    window.open(`mailto:support@stepflow.com?subject=${subject}&body=${body}`);
  };

  const getIconColor = () => {
    switch (userError.type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-red-500';
    }
  };

  const getBorderColor = () => {
    switch (userError.type) {
      case 'error':
        return 'border-red-200';
      case 'warning':
        return 'border-yellow-200';
      case 'info':
        return 'border-blue-200';
      default:
        return 'border-red-200';
    }
  };

  const getBackgroundColor = () => {
    switch (userError.type) {
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
        return 'bg-blue-50';
      default:
        return 'bg-red-50';
    }
  };

  const renderIcon = () => {
    const iconClass = `h-5 w-5 ${getIconColor()}`;
    
    switch (userError.type) {
      case 'error':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'info':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm w-full ${getBackgroundColor()} ${getBorderColor()} border rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {renderIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {userError.title}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {userError.message}
            </p>
            
            {userError.recoveryActions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  What you can do:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {userError.recoveryActions.slice(0, 2).map((action, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex space-x-2">
              {userError.canRetry && onRetry && (
                <button
                  onClick={handleRetry}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Retry
                </button>
              )}
              
              {userError.contactSupport && (
                <button
                  onClick={handleContactSupport}
                  className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Contact Support
                </button>
              )}
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 pb-4">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
              Debug Info
            </summary>
            <div className="mt-1 p-2 bg-gray-100 rounded text-gray-600">
              <p><strong>Code:</strong> {error.error.code}</p>
              <p><strong>Request ID:</strong> {error.error.requestId}</p>
              <p><strong>Timestamp:</strong> {error.error.timestamp}</p>
              {error.error.details && (
                <p><strong>Details:</strong> {JSON.stringify(error.error.details, null, 2)}</p>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// Toast container component for managing multiple toasts
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    error: ErrorResponse;
    onRetry?: () => void;
  }>;
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemoveToast
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          <ErrorToast
            error={toast.error}
            onClose={() => onRemoveToast(toast.id)}
            onRetry={toast.onRetry}
          />
        </div>
      ))}
    </div>
  );
};