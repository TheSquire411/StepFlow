import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Logger } from '../../../shared/src/utils/logger';
import { AppError } from '../../../shared/src/utils/error-handler';

export class SentryService {
  private logger: Logger;
  private initialized: boolean = false;

  constructor() {
    this.logger = new Logger('sentry-service');
  }

  initialize(dsn?: string, environment: string = 'development'): void {
    if (this.initialized) {
      this.logger.warn('Sentry already initialized');
      return;
    }

    if (!dsn) {
      this.logger.warn('Sentry DSN not provided, error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: undefined }),
          new Sentry.Integrations.Postgres(),
          new Sentry.Integrations.Redis()
        ],
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
        beforeSend: (event, hint) => {
          // Filter out operational errors that don't need tracking
          const error = hint.originalException;
          if (error instanceof AppError && error.isOperational) {
            // Only track operational errors if they're critical
            if (error.statusCode >= 500) {
              return event;
            }
            return null;
          }
          return event;
        }
      });

      this.initialized = true;
      this.logger.info('Sentry initialized successfully', {
        environment,
        operation: 'sentry_init'
      });
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', {
        operation: 'sentry_init'
      }, error as Error);
    }
  }

  captureError(error: Error, context?: Record<string, any>): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    try {
      return Sentry.captureException(error, {
        tags: {
          service: 'stepflow-api'
        },
        extra: context,
        level: error instanceof AppError ? 'error' : 'fatal'
      });
    } catch (sentryError) {
      this.logger.error('Failed to capture error in Sentry', {
        operation: 'sentry_capture'
      }, sentryError as Error);
      return undefined;
    }
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): string | undefined {
    if (!this.initialized) {
      return undefined;
    }

    try {
      return Sentry.captureMessage(message, {
        level,
        tags: {
          service: 'stepflow-api'
        },
        extra: context
      });
    } catch (error) {
      this.logger.error('Failed to capture message in Sentry', {
        operation: 'sentry_capture_message'
      }, error as Error);
      return undefined;
    }
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(user);
  }

  setContext(key: string, context: Record<string, any>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setContext(key, context);
  }

  addBreadcrumb(message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: Record<string, any>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  }

  startTransaction(name: string, operation: string): Sentry.Transaction | undefined {
    if (!this.initialized) {
      return undefined;
    }

    return Sentry.startTransaction({
      name,
      op: operation
    });
  }

  // Express middleware for request tracking
  getRequestHandler() {
    if (!this.initialized) {
      return (req: any, res: any, next: any) => next();
    }
    return Sentry.Handlers.requestHandler();
  }

  getTracingHandler() {
    if (!this.initialized) {
      return (req: any, res: any, next: any) => next();
    }
    return Sentry.Handlers.tracingHandler();
  }

  getErrorHandler() {
    if (!this.initialized) {
      return (error: any, req: any, res: any, next: any) => next(error);
    }
    return Sentry.Handlers.errorHandler();
  }

  close(timeout: number = 2000): Promise<boolean> {
    if (!this.initialized) {
      return Promise.resolve(true);
    }

    return Sentry.close(timeout);
  }
}

// Singleton instance
export const sentryService = new SentryService();