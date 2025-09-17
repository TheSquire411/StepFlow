import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandlingService } from '../../services/error-handling.service';
import { ErrorCodes } from '../../../../shared/src/types/logging.types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // In a real app, this would send to your error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console for now
    console.error('Error reported:', errorReport);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const errorResponse = {
        error: {
          code: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: this.state.error?.message || 'An unexpected error occurred',
          userMessage: 'Something went wrong while rendering this page.',
          timestamp: new Date().toISOString(),
          requestId: 'client-error'
        }
      };

      const userError = ErrorHandlingService.getUserFriendlyError(errorResponse);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                {userError.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {userError.message}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">What you can do:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                {userError.recoveryActions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex space-x-4">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 p-4 bg-gray-100 rounded-md">
                <summary className="cursor-pointer font-medium text-gray-900">
                  Error Details (Development)
                </summary>
                <div className="mt-2 text-xs text-gray-600">
                  <p><strong>Error:</strong> {this.state.error.message}</p>
                  <p><strong>Stack:</strong></p>
                  <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                  {this.state.errorInfo && (
                    <>
                      <p><strong>Component Stack:</strong></p>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                If this problem persists, please{' '}
                <a
                  href="mailto:support@stepflow.com"
                  className="text-blue-600 hover:text-blue-500"
                >
                  contact our support team
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}