import { LogLevel, LogContext, LogEntry } from '../types/logging.types';

export class Logger {
  private service: string;
  private defaultContext: Partial<LogContext>;

  constructor(service: string, defaultContext: Partial<LogContext> = {}) {
    this.service = service;
    this.defaultContext = defaultContext;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: Partial<LogContext> = {},
    error?: Error
  ): LogEntry {
    const logContext: LogContext = {
      ...this.defaultContext,
      ...context,
      service: this.service
    };

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: logContext
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    return entry;
  }

  private log(entry: LogEntry): void {
    // In production, this would send to a logging service
    // For now, we'll use console with structured format
    const logData = {
      ...entry,
      // Add correlation ID for request tracing
      correlationId: entry.context.requestId || entry.context.sessionId
    };

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(logData));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logData));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(logData));
        break;
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logData));
        break;
    }
  }

  error(message: string, context?: Partial<LogContext>, error?: Error): void {
    this.log(this.createLogEntry(LogLevel.ERROR, message, context, error));
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, context));
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  // Create child logger with additional context
  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger(this.service, {
      ...this.defaultContext,
      ...additionalContext
    });
  }
}

// Global logger factory
export const createLogger = (service: string, context?: Partial<LogContext>): Logger => {
  return new Logger(service, context);
};