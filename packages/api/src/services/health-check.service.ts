import { HealthCheckResult } from '../../../shared/src/types/logging.types';
import { Logger } from '../../../shared/src/utils/logger';
import { pool } from '../config/database';
import { redisClient } from '../config/redis';
import { fileStorageService } from './file-storage.service';

export class HealthCheckService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('health-check-service');
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await pool.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          connectionCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error('Database health check failed', {
        operation: 'health_check_database'
      }, error as Error);
      
      return {
        service: 'database',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await redisClient.ping();
      const responseTime = Date.now() - startTime;
      
      const info = await redisClient.info('memory');
      const memoryUsage = this.parseRedisMemoryInfo(info);
      
      return {
        service: 'redis',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          memoryUsage,
          connected: redisClient.status === 'ready'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error('Redis health check failed', {
        operation: 'health_check_redis'
      }, error as Error);
      
      return {
        service: 'redis',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          error: (error as Error).message,
          status: redisClient.status
        }
      };
    }
  }

  async checkFileStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test file storage by attempting to list a bucket or directory
      const testResult = await fileStorageService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'file-storage',
        status: testResult.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: testResult.details
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error('File storage health check failed', {
        operation: 'health_check_file_storage'
      }, error as Error);
      
      return {
        service: 'file-storage',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  async checkExternalServices(): Promise<HealthCheckResult[]> {
    const checks = await Promise.allSettled([
      this.checkOpenAI(),
      this.checkElevenLabs(),
      this.checkStripe()
    ]);

    return checks.map((result, index) => {
      const services = ['openai', 'elevenlabs', 'stripe'];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: services[index],
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          responseTime: 0,
          details: {
            error: result.reason?.message || 'Health check failed'
          }
        };
      }
    });
  }

  private async checkOpenAI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple API call to check OpenAI availability
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          service: 'openai',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            statusCode: response.status
          }
        };
      } else {
        return {
          service: 'openai',
          status: 'degraded',
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            statusCode: response.status,
            statusText: response.statusText
          }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'openai',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  private async checkElevenLabs(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'elevenlabs',
        status: response.ok ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          statusCode: response.status
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'elevenlabs',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  private async checkStripe(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple balance retrieval to check Stripe connectivity
      const response = await fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'stripe',
        status: response.ok ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          statusCode: response.status
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'stripe',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          error: (error as Error).message
        }
      };
    }
  }

  async performFullHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: HealthCheckResult[];
  }> {
    const startTime = Date.now();
    
    try {
      const [database, redis, fileStorage, ...externalServices] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkFileStorage(),
        ...await this.checkExternalServices()
      ]);

      const services = [database, redis, fileStorage, ...externalServices];
      
      // Determine overall health
      const unhealthyServices = services.filter(s => s.status === 'unhealthy');
      const degradedServices = services.filter(s => s.status === 'degraded');
      
      let overall: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyServices.length > 0) {
        // Critical services (database, redis) being unhealthy makes the whole system unhealthy
        const criticalUnhealthy = unhealthyServices.some(s => 
          s.service === 'database' || s.service === 'redis'
        );
        overall = criticalUnhealthy ? 'unhealthy' : 'degraded';
      } else if (degradedServices.length > 0) {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }

      const totalTime = Date.now() - startTime;
      
      this.logger.info('Health check completed', {
        operation: 'full_health_check',
        metadata: {
          overall,
          totalTime,
          serviceCount: services.length,
          unhealthyCount: unhealthyServices.length,
          degradedCount: degradedServices.length
        }
      });

      return {
        overall,
        timestamp: new Date().toISOString(),
        services
      };
    } catch (error) {
      this.logger.error('Health check failed', {
        operation: 'full_health_check'
      }, error as Error);
      
      return {
        overall: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: [{
          service: 'health-check-service',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            error: (error as Error).message
          }
        }]
      };
    }
  }

  private parseRedisMemoryInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const memoryInfo: Record<string, string> = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key.startsWith('used_memory')) {
          memoryInfo[key] = value;
        }
      }
    });
    
    return memoryInfo;
  }
}

export const healthCheckService = new HealthCheckService();