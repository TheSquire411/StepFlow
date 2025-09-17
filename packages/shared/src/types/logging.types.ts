export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  service: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime: number;
  details?: Record<string, any>;
  dependencies?: HealthCheckResult[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    userMessage: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
    recoveryActions?: string[];
  };
}

export enum ErrorCodes {
  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTH_001',
  INSUFFICIENT_PERMISSIONS = 'AUTH_002',
  TOKEN_EXPIRED = 'AUTH_003',
  INVALID_CREDENTIALS = 'AUTH_004',
  
  // Recording errors
  RECORDING_UPLOAD_FAILED = 'REC_001',
  RECORDING_PROCESSING_FAILED = 'REC_002',
  INVALID_RECORDING_FORMAT = 'REC_003',
  RECORDING_TOO_LARGE = 'REC_004',
  
  // AI processing errors
  AI_PROCESSING_FAILED = 'AI_001',
  AI_SERVICE_UNAVAILABLE = 'AI_002',
  CONTENT_GENERATION_FAILED = 'AI_003',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_001',
  FILE_UPLOAD_FAILED = 'STORAGE_002',
  FILE_NOT_FOUND = 'STORAGE_003',
  
  // File format errors
  INVALID_FILE_FORMAT = 'FILE_001',
  FILE_CORRUPTED = 'FILE_002',
  
  // Database errors
  DATABASE_CONNECTION_FAILED = 'DB_001',
  QUERY_FAILED = 'DB_002',
  TRANSACTION_FAILED = 'DB_003',
  
  // External service errors
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXT_001',
  RATE_LIMIT_EXCEEDED = 'EXT_002',
  
  // General errors
  INTERNAL_SERVER_ERROR = 'GEN_001',
  VALIDATION_ERROR = 'GEN_002',
  RESOURCE_NOT_FOUND = 'GEN_003',
  OPERATION_TIMEOUT = 'GEN_004'
}