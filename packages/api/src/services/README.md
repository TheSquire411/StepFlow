# Error Handling and Logging System

This document describes the comprehensive error handling and logging system implemented for the StepFlow platform.

## Overview

The error handling and logging system provides:

- **Structured Logging**: Consistent log format across all services
- **Error Tracking**: Integration with Sentry for error monitoring
- **User-Friendly Errors**: Meaningful error messages with recovery actions
- **Health Checks**: Comprehensive service health monitoring
- **Graceful Degradation**: Automatic fallback mechanisms for service failures

## Components

### 1. Structured Logging (`logger.ts`)

Provides consistent logging across all services with structured JSON format.

```typescript
import { Logger } from '../../../shared/src/utils/logger';

const logger = new Logger('my-service');

logger.info('Operation completed', {
  userId: '123',
  operation: 'create_guide',
  metadata: { guideId: 'guide-456' }
});

logger.error('Operation failed', {
  userId: '123',
  operation: 'create_guide'
}, error);
```

**Features:**
- Structured JSON logging
- Request correlation IDs
- Service-specific context
- Child loggers for additional context

### 2. Error Handling (`error-handler.ts`)

Centralized error handling with predefined error types and user-friendly messages.

```typescript
import { ErrorHandler, AppError } from '../../../shared/src/utils/error-handler';

// Create specific errors
const error = ErrorHandler.authenticationFailed({ attempt: 3 });
const error2 = ErrorHandler.storageQuotaExceeded(1000, 500);

// Handle any error
const errorHandler = new ErrorHandler(logger);
const response = errorHandler.handleError(error, requestId);
```

**Features:**
- Predefined error types with consistent codes
- User-friendly error messages
- Recovery action suggestions
- Operational vs programming error classification

### 3. Sentry Integration (`sentry.service.ts`)

Error tracking and performance monitoring with Sentry.

```typescript
import { sentryService } from '../services/sentry.service';

// Initialize (done in index.ts)
sentryService.initialize(process.env.SENTRY_DSN, 'production');

// Capture errors
sentryService.captureError(error, { userId: '123' });

// Add breadcrumbs
sentryService.addBreadcrumb('User clicked button', 'user', 'info');

// Set user context
sentryService.setUser({ id: '123', email: 'user@example.com' });
```

**Features:**
- Automatic error capture
- Performance monitoring
- User context tracking
- Request breadcrumbs
- Filtering of operational errors

### 4. Health Checks (`health-check.service.ts`)

Comprehensive health monitoring for all system components.

```typescript
import { healthCheckService } from '../services/health-check.service';

// Check individual services
const dbHealth = await healthCheckService.checkDatabase();
const redisHealth = await healthCheckService.checkRedis();

// Full system health check
const fullHealth = await healthCheckService.performFullHealthCheck();
```

**Available Endpoints:**
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health information
- `GET /api/v1/health/database` - Database health
- `GET /api/v1/health/redis` - Redis health
- `GET /api/v1/health/storage` - File storage health
- `GET /api/v1/health/external` - External services health
- `GET /api/v1/ready` - Kubernetes readiness probe
- `GET /api/v1/live` - Kubernetes liveness probe

### 5. Graceful Degradation (`graceful-degradation.service.ts`)

Automatic fallback mechanisms when services fail.

```typescript
import { gracefulDegradationService } from '../services/graceful-degradation.service';

// Register services
gracefulDegradationService.registerService('ai-content-generation');

// Execute with fallback
const result = await gracefulDegradationService.executeWithFallback(
  'ai-content-generation',
  () => primaryAIService.generate(prompt),
  () => fallbackAIService.generate(prompt),
  'Default content when all fails'
);

// Specialized methods
const content = await gracefulDegradationService.generateContentWithFallback(
  prompt,
  primaryService,
  fallbackService
);
```

**Features:**
- Automatic failure detection
- Progressive degradation levels
- Service recovery tracking
- Specialized fallback methods for different service types

### 6. Express Middleware (`error-handling.middleware.ts`)

Express middleware for request logging and error handling.

```typescript
import {
  requestId,
  requestLogger,
  errorHandler,
  notFoundHandler,
  asyncHandler
} from '../middleware/error-handling.middleware';

// Apply middleware
app.use(requestId);
app.use(requestLogger);

// Wrap async routes
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);
}));

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

## Frontend Error Handling

### 1. Error Handling Service (`error-handling.service.ts`)

Frontend service for converting API errors to user-friendly messages.

```typescript
import { ErrorHandlingService, useErrorHandling } from '../services/error-handling.service';

// In React component
const { handleError, showErrorToast } = useErrorHandling();

try {
  await apiCall();
} catch (error) {
  const userError = handleError(error);
  // Display user-friendly error
}
```

### 2. Error Boundary (`ErrorBoundary.tsx`)

React error boundary for catching and displaying component errors.

```typescript
import { ErrorBoundary, withErrorBoundary } from '../components/common/ErrorBoundary';

// Wrap components
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Or use HOC
const SafeComponent = withErrorBoundary(MyComponent);
```

### 3. Error Toast (`ErrorToast.tsx`)

Toast notifications for displaying errors to users.

```typescript
import { ErrorToast, ToastContainer } from '../components/common/ErrorToast';

// Display single toast
<ErrorToast
  error={errorResponse}
  onClose={() => setError(null)}
  onRetry={() => retryOperation()}
/>

// Toast container for multiple toasts
<ToastContainer
  toasts={toasts}
  onRemoveToast={removeToast}
/>
```

## Error Codes

The system uses standardized error codes for consistent error handling:

### Authentication Errors
- `AUTH_001` - Authentication failed
- `AUTH_002` - Insufficient permissions
- `AUTH_003` - Token expired
- `AUTH_004` - Invalid credentials

### Recording Errors
- `REC_001` - Recording upload failed
- `REC_002` - Recording processing failed
- `REC_003` - Invalid recording format
- `REC_004` - Recording too large

### AI Processing Errors
- `AI_001` - AI processing failed
- `AI_002` - AI service unavailable
- `AI_003` - Content generation failed

### Storage Errors
- `STORAGE_001` - Storage quota exceeded
- `STORAGE_002` - File upload failed
- `STORAGE_003` - File not found

### File Format Errors
- `FILE_001` - Invalid file format
- `FILE_002` - File corrupted

### Database Errors
- `DB_001` - Database connection failed
- `DB_002` - Query failed
- `DB_003` - Transaction failed

### External Service Errors
- `EXT_001` - External service unavailable
- `EXT_002` - Rate limit exceeded

### General Errors
- `GEN_001` - Internal server error
- `GEN_002` - Validation error
- `GEN_003` - Resource not found
- `GEN_004` - Operation timeout

## Configuration

### Environment Variables

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
MAX_CONSECUTIVE_FAILURES=3
```

### Sentry Setup

1. Create a Sentry project
2. Get your DSN from the project settings
3. Set the `SENTRY_DSN` environment variable
4. The service will automatically initialize Sentry on startup

## Best Practices

### 1. Error Creation
- Use predefined error creators when possible
- Include relevant context in error details
- Provide actionable recovery suggestions
- Classify errors as operational vs programming errors

### 2. Logging
- Use structured logging with consistent fields
- Include request IDs for correlation
- Log at appropriate levels (error, warn, info, debug)
- Avoid logging sensitive information

### 3. Health Checks
- Implement health checks for all external dependencies
- Use different endpoints for different types of checks
- Include response time and detailed status information
- Set up monitoring alerts based on health check results

### 4. Graceful Degradation
- Register all services that can fail
- Implement meaningful fallback operations
- Monitor service health and recovery
- Provide user feedback when services are degraded

### 5. Frontend Error Handling
- Always provide user-friendly error messages
- Include recovery actions when possible
- Use appropriate UI patterns (toasts, modals, inline errors)
- Log errors for debugging but don't expose technical details to users

## Monitoring and Alerting

### Sentry Alerts
- Set up alerts for error rate increases
- Monitor performance degradation
- Track user-affecting errors separately from system errors

### Health Check Monitoring
- Monitor health check endpoints with external services
- Set up alerts for service degradation
- Use health checks for load balancer decisions

### Log Monitoring
- Set up log aggregation (ELK stack, CloudWatch, etc.)
- Create dashboards for error rates and patterns
- Set up alerts for critical error patterns

## Testing

The error handling system includes comprehensive tests:

- Unit tests for all error handling components
- Integration tests for middleware and routes
- Frontend tests for error display components
- Health check endpoint tests

Run tests with:
```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Sentry not capturing errors**
   - Check SENTRY_DSN environment variable
   - Verify network connectivity to Sentry
   - Check error filtering configuration

2. **Health checks failing**
   - Verify service dependencies are running
   - Check network connectivity
   - Review service-specific configuration

3. **Graceful degradation not working**
   - Ensure services are registered
   - Check failure threshold configuration
   - Verify fallback implementations

4. **Frontend errors not displaying**
   - Check error boundary placement
   - Verify error response format
   - Check toast container setup