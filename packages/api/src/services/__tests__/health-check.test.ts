import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { HealthCheckService } from '../health-check.service';
import { pool } from '../../config/database';
import { redisClient } from '../../config/redis';
import { fileStorageService } from '../file-storage.service';

// Mock dependencies
vi.mock('../../config/database', () => ({
  pool: {
    query: vi.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0
  }
}));

vi.mock('../../config/redis', () => ({
  redisClient: {
    ping: vi.fn(),
    info: vi.fn(),
    status: 'ready'
  }
}));

vi.mock('../file-storage.service', () => ({
  fileStorageService: {
    healthCheck: vi.fn()
  }
}));

// Mock fetch for external service checks
global.fetch = vi.fn();

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    healthCheckService = new HealthCheckService();
    vi.clearAllMocks();
  });

  describe('checkDatabase', () => {
    it('should return healthy status when database is accessible', async () => {
      (pool.query as Mock).mockResolvedValue({ rows: [{ health_check: 1 }] });

      const result = await healthCheckService.checkDatabase();

      expect(result.service).toBe('database');
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.details.connectionCount).toBe(10);
      expect(result.details.idleCount).toBe(5);
      expect(result.details.waitingCount).toBe(0);
    });

    it('should return unhealthy status when database query fails', async () => {
      const error = new Error('Connection failed');
      (pool.query as Mock).mockRejectedValue(error);

      const result = await healthCheckService.checkDatabase();

      expect(result.service).toBe('database');
      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toBe('Connection failed');
    });
  });

  describe('checkRedis', () => {
    it('should return healthy status when Redis is accessible', async () => {
      (redisClient.ping as Mock).mockResolvedValue('PONG');
      (redisClient.info as Mock).mockResolvedValue('used_memory:1000\nused_memory_human:1K');

      const result = await healthCheckService.checkRedis();

      expect(result.service).toBe('redis');
      expect(result.status).toBe('healthy');
      expect(result.details.connected).toBe(true);
      expect(result.details.memoryUsage).toBeDefined();
    });

    it('should return unhealthy status when Redis ping fails', async () => {
      const error = new Error('Redis connection failed');
      (redisClient.ping as Mock).mockRejectedValue(error);

      const result = await healthCheckService.checkRedis();

      expect(result.service).toBe('redis');
      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toBe('Redis connection failed');
    });
  });

  describe('checkFileStorage', () => {
    it('should return healthy status when file storage is accessible', async () => {
      (fileStorageService.healthCheck as Mock).mockResolvedValue({
        healthy: true,
        details: { accessible: true, writable: true }
      });

      const result = await healthCheckService.checkFileStorage();

      expect(result.service).toBe('file-storage');
      expect(result.status).toBe('healthy');
      expect(result.details.accessible).toBe(true);
    });

    it('should return unhealthy status when file storage check fails', async () => {
      (fileStorageService.healthCheck as Mock).mockResolvedValue({
        healthy: false,
        details: { error: 'Storage not accessible' }
      });

      const result = await healthCheckService.checkFileStorage();

      expect(result.service).toBe('file-storage');
      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toBe('Storage not accessible');
    });
  });

  describe('checkExternalServices', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.ELEVENLABS_API_KEY = 'test-key';
      process.env.STRIPE_SECRET_KEY = 'test-key';
    });

    it('should check OpenAI service health', async () => {
      (fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const results = await healthCheckService.checkExternalServices();
      const openaiResult = results.find(r => r.service === 'openai');

      expect(openaiResult?.status).toBe('healthy');
      expect(openaiResult?.details.statusCode).toBe(200);
    });

    it('should handle OpenAI service failure', async () => {
      (fetch as Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      const results = await healthCheckService.checkExternalServices();
      const openaiResult = results.find(r => r.service === 'openai');

      expect(openaiResult?.status).toBe('degraded');
      expect(openaiResult?.details.statusCode).toBe(503);
    });

    it('should handle network errors for external services', async () => {
      (fetch as Mock).mockRejectedValue(new Error('Network error'));

      const results = await healthCheckService.checkExternalServices();
      
      results.forEach(result => {
        expect(result.status).toBe('unhealthy');
        expect(result.details.error).toBe('Network error');
      });
    });
  });

  describe('performFullHealthCheck', () => {
    beforeEach(() => {
      // Mock all dependencies to be healthy
      (pool.query as Mock).mockResolvedValue({ rows: [{ health_check: 1 }] });
      (redisClient.ping as Mock).mockResolvedValue('PONG');
      (redisClient.info as Mock).mockResolvedValue('used_memory:1000');
      (fileStorageService.healthCheck as Mock).mockResolvedValue({
        healthy: true,
        details: { accessible: true }
      });
      (fetch as Mock).mockResolvedValue({ ok: true, status: 200 });
    });

    it('should return overall healthy status when all services are healthy', async () => {
      const result = await healthCheckService.performFullHealthCheck();

      expect(result.overall).toBe('healthy');
      expect(result.services).toHaveLength(6); // database, redis, file-storage, openai, elevenlabs, stripe
      expect(result.services.every(s => s.status === 'healthy')).toBe(true);
    });

    it('should return overall unhealthy when critical services fail', async () => {
      (pool.query as Mock).mockRejectedValue(new Error('DB failed'));

      const result = await healthCheckService.performFullHealthCheck();

      expect(result.overall).toBe('unhealthy');
      const dbService = result.services.find(s => s.service === 'database');
      expect(dbService?.status).toBe('unhealthy');
    });

    it('should return overall degraded when non-critical services fail', async () => {
      (fetch as Mock).mockResolvedValue({ ok: false, status: 503 });

      const result = await healthCheckService.performFullHealthCheck();

      expect(result.overall).toBe('degraded');
      const externalServices = result.services.filter(s => 
        ['openai', 'elevenlabs', 'stripe'].includes(s.service)
      );
      expect(externalServices.every(s => s.status === 'degraded')).toBe(true);
    });

    it('should handle health check service failure gracefully', async () => {
      (pool.query as Mock).mockRejectedValue(new Error('Catastrophic failure'));
      (redisClient.ping as Mock).mockRejectedValue(new Error('Redis down'));
      (fileStorageService.healthCheck as Mock).mockRejectedValue(new Error('Storage down'));

      const result = await healthCheckService.performFullHealthCheck();

      expect(result.overall).toBe('unhealthy');
      expect(result.services.length).toBeGreaterThan(0);
    });
  });
});