import { Logger } from '../../../shared/src/utils/logger';
import { AppError, ErrorHandler } from '../../../shared/src/utils/error-handler';
import { ErrorCodes } from '../../../shared/src/types/logging.types';

interface ServiceStatus {
  isHealthy: boolean;
  lastChecked: Date;
  consecutiveFailures: number;
  degradationLevel: 'none' | 'partial' | 'full';
}

interface DegradationConfig {
  maxConsecutiveFailures: number;
  healthCheckInterval: number;
  recoveryThreshold: number;
}

export class GracefulDegradationService {
  private logger: Logger;
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private config: DegradationConfig;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<DegradationConfig> = {}) {
    this.logger = new Logger('graceful-degradation-service');
    this.config = {
      maxConsecutiveFailures: 3,
      healthCheckInterval: 30000, // 30 seconds
      recoveryThreshold: 2,
      ...config
    };
  }

  registerService(serviceName: string): void {
    if (this.serviceStatuses.has(serviceName)) {
      this.logger.warn(`Service ${serviceName} already registered`);
      return;
    }

    this.serviceStatuses.set(serviceName, {
      isHealthy: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      degradationLevel: 'none'
    });

    this.logger.info(`Registered service for degradation monitoring`, {
      operation: 'register_service',
      metadata: { serviceName }
    });
  }

  recordServiceFailure(serviceName: string, error: Error): void {
    const status = this.serviceStatuses.get(serviceName);
    if (!status) {
      this.logger.warn(`Attempted to record failure for unregistered service: ${serviceName}`);
      return;
    }

    status.consecutiveFailures++;
    status.lastChecked = new Date();

    // Determine degradation level
    if (status.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      status.isHealthy = false;
      status.degradationLevel = 'full';
    } else if (status.consecutiveFailures >= Math.floor(this.config.maxConsecutiveFailures / 2)) {
      status.degradationLevel = 'partial';
    }

    this.logger.error(`Service failure recorded`, {
      operation: 'record_service_failure',
      metadata: {
        serviceName,
        consecutiveFailures: status.consecutiveFailures,
        degradationLevel: status.degradationLevel
      }
    }, error);

    // Start health check monitoring if service is degraded
    if (status.degradationLevel !== 'none' && !this.healthCheckIntervals.has(serviceName)) {
      this.startHealthCheckMonitoring(serviceName);
    }
  }

  recordServiceSuccess(serviceName: string): void {
    const status = this.serviceStatuses.get(serviceName);
    if (!status) {
      this.logger.warn(`Attempted to record success for unregistered service: ${serviceName}`);
      return;
    }

    const wasUnhealthy = !status.isHealthy;
    
    status.consecutiveFailures = Math.max(0, status.consecutiveFailures - 1);
    status.lastChecked = new Date();

    // Update degradation level
    if (status.consecutiveFailures === 0) {
      status.isHealthy = true;
      status.degradationLevel = 'none';
      
      // Stop health check monitoring
      const interval = this.healthCheckIntervals.get(serviceName);
      if (interval) {
        clearInterval(interval);
        this.healthCheckIntervals.delete(serviceName);
      }
    } else if (status.consecutiveFailures < Math.floor(this.config.maxConsecutiveFailures / 2)) {
      status.degradationLevel = 'none';
    } else {
      status.degradationLevel = 'partial';
    }

    if (wasUnhealthy && status.isHealthy) {
      this.logger.info(`Service recovered`, {
        operation: 'service_recovery',
        metadata: {
          serviceName,
          degradationLevel: status.degradationLevel
        }
      });
    }
  }

  isServiceHealthy(serviceName: string): boolean {
    const status = this.serviceStatuses.get(serviceName);
    return status?.isHealthy ?? true; // Default to healthy for unknown services
  }

  getServiceDegradationLevel(serviceName: string): 'none' | 'partial' | 'full' {
    const status = this.serviceStatuses.get(serviceName);
    return status?.degradationLevel ?? 'none';
  }

  // Wrapper functions for different service operations with fallbacks
  async executeWithFallback<T>(
    serviceName: string,
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    defaultValue?: T
  ): Promise<T> {
    const degradationLevel = this.getServiceDegradationLevel(serviceName);

    // If service is fully degraded, skip primary operation
    if (degradationLevel === 'full') {
      if (fallbackOperation) {
        this.logger.info(`Using fallback for degraded service`, {
          operation: 'execute_with_fallback',
          metadata: { serviceName, degradationLevel }
        });
        return await fallbackOperation();
      } else if (defaultValue !== undefined) {
        return defaultValue;
      } else {
        throw ErrorHandler.externalServiceUnavailable(serviceName);
      }
    }

    try {
      const result = await primaryOperation();
      this.recordServiceSuccess(serviceName);
      return result;
    } catch (error) {
      this.recordServiceFailure(serviceName, error as Error);

      // Try fallback if available
      if (fallbackOperation) {
        try {
          this.logger.info(`Primary operation failed, trying fallback`, {
            operation: 'execute_with_fallback',
            metadata: { serviceName }
          });
          return await fallbackOperation();
        } catch (fallbackError) {
          this.logger.error(`Fallback operation also failed`, {
            operation: 'execute_with_fallback',
            metadata: { serviceName }
          }, fallbackError as Error);
        }
      }

      // Return default value if available
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      // Re-throw the original error
      throw error;
    }
  }

  // AI service fallbacks
  async generateContentWithFallback(
    prompt: string,
    primaryService: () => Promise<string>,
    fallbackService?: () => Promise<string>
  ): Promise<string> {
    return this.executeWithFallback(
      'ai-content-generation',
      primaryService,
      fallbackService,
      'Content generation is temporarily unavailable. Please try again later.'
    );
  }

  async generateVoiceoverWithFallback(
    text: string,
    primaryService: () => Promise<Buffer>,
    fallbackService?: () => Promise<Buffer>
  ): Promise<Buffer | null> {
    return this.executeWithFallback(
      'text-to-speech',
      primaryService,
      fallbackService,
      null
    );
  }

  // File storage fallbacks
  async uploadFileWithFallback(
    file: Buffer,
    primaryUpload: () => Promise<string>,
    fallbackUpload?: () => Promise<string>
  ): Promise<string> {
    return this.executeWithFallback(
      'file-storage',
      primaryUpload,
      fallbackUpload
    );
  }

  // Database operation fallbacks
  async queryWithFallback<T>(
    query: string,
    primaryQuery: () => Promise<T>,
    fallbackQuery?: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    return this.executeWithFallback(
      'database',
      primaryQuery,
      fallbackQuery
    );
  }

  private startHealthCheckMonitoring(serviceName: string): void {
    const interval = setInterval(async () => {
      try {
        // This would typically call the actual health check for the service
        // For now, we'll just log that monitoring is active
        this.logger.debug(`Health check monitoring active for service`, {
          operation: 'health_check_monitoring',
          metadata: { serviceName }
        });
      } catch (error) {
        this.logger.error(`Health check monitoring failed`, {
          operation: 'health_check_monitoring',
          metadata: { serviceName }
        }, error as Error);
      }
    }, this.config.healthCheckInterval);

    this.healthCheckIntervals.set(serviceName, interval);
  }

  getServiceStatuses(): Record<string, ServiceStatus> {
    const statuses: Record<string, ServiceStatus> = {};
    this.serviceStatuses.forEach((status, serviceName) => {
      statuses[serviceName] = { ...status };
    });
    return statuses;
  }

  shutdown(): void {
    // Clear all health check intervals
    this.healthCheckIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.healthCheckIntervals.clear();

    this.logger.info('Graceful degradation service shutdown complete');
  }
}

export const gracefulDegradationService = new GracefulDegradationService();