import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GracefulDegradationService } from '../graceful-degradation.service';

describe('GracefulDegradationService', () => {
  let service: GracefulDegradationService;

  beforeEach(() => {
    service = new GracefulDegradationService({
      maxConsecutiveFailures: 3,
      healthCheckInterval: 1000,
      recoveryThreshold: 2
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('service registration', () => {
    it('should register a new service', () => {
      service.registerService('test-service');
      
      expect(service.isServiceHealthy('test-service')).toBe(true);
      expect(service.getServiceDegradationLevel('test-service')).toBe('none');
    });

    it('should not register the same service twice', () => {
      service.registerService('test-service');
      service.registerService('test-service'); // Should warn but not crash
      
      expect(service.isServiceHealthy('test-service')).toBe(true);
    });
  });

  describe('failure tracking', () => {
    beforeEach(() => {
      service.registerService('test-service');
    });

    it('should track service failures', () => {
      const error = new Error('Service failed');
      
      service.recordServiceFailure('test-service', error);
      
      expect(service.getServiceDegradationLevel('test-service')).toBe('none');
      expect(service.isServiceHealthy('test-service')).toBe(true);
    });

    it('should mark service as partially degraded after multiple failures', () => {
      const error = new Error('Service failed');
      
      service.recordServiceFailure('test-service', error);
      service.recordServiceFailure('test-service', error);
      
      expect(service.getServiceDegradationLevel('test-service')).toBe('partial');
      expect(service.isServiceHealthy('test-service')).toBe(true);
    });

    it('should mark service as fully degraded after max failures', () => {
      const error = new Error('Service failed');
      
      for (let i = 0; i < 3; i++) {
        service.recordServiceFailure('test-service', error);
      }
      
      expect(service.getServiceDegradationLevel('test-service')).toBe('full');
      expect(service.isServiceHealthy('test-service')).toBe(false);
    });

    it('should handle failures for unregistered services gracefully', () => {
      const error = new Error('Service failed');
      
      expect(() => {
        service.recordServiceFailure('unknown-service', error);
      }).not.toThrow();
    });
  });

  describe('recovery tracking', () => {
    beforeEach(() => {
      service.registerService('test-service');
      
      // Make service fully degraded
      const error = new Error('Service failed');
      for (let i = 0; i < 3; i++) {
        service.recordServiceFailure('test-service', error);
      }
    });

    it('should gradually recover service health', () => {
      expect(service.isServiceHealthy('test-service')).toBe(false);
      
      service.recordServiceSuccess('test-service');
      expect(service.getServiceDegradationLevel('test-service')).toBe('partial');
      expect(service.isServiceHealthy('test-service')).toBe(false);
      
      service.recordServiceSuccess('test-service');
      service.recordServiceSuccess('test-service');
      
      expect(service.getServiceDegradationLevel('test-service')).toBe('none');
      expect(service.isServiceHealthy('test-service')).toBe(true);
    });

    it('should handle success for unregistered services gracefully', () => {
      expect(() => {
        service.recordServiceSuccess('unknown-service');
      }).not.toThrow();
    });
  });

  describe('executeWithFallback', () => {
    beforeEach(() => {
      service.registerService('test-service');
    });

    it('should execute primary operation when service is healthy', async () => {
      const primaryOp = vi.fn().mockResolvedValue('primary-result');
      const fallbackOp = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await service.executeWithFallback(
        'test-service',
        primaryOp,
        fallbackOp
      );
      
      expect(result).toBe('primary-result');
      expect(primaryOp).toHaveBeenCalled();
      expect(fallbackOp).not.toHaveBeenCalled();
    });

    it('should use fallback when service is fully degraded', async () => {
      // Make service fully degraded
      const error = new Error('Service failed');
      for (let i = 0; i < 3; i++) {
        service.recordServiceFailure('test-service', error);
      }
      
      const primaryOp = vi.fn().mockResolvedValue('primary-result');
      const fallbackOp = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await service.executeWithFallback(
        'test-service',
        primaryOp,
        fallbackOp
      );
      
      expect(result).toBe('fallback-result');
      expect(primaryOp).not.toHaveBeenCalled();
      expect(fallbackOp).toHaveBeenCalled();
    });

    it('should try fallback when primary operation fails', async () => {
      const primaryOp = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOp = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await service.executeWithFallback(
        'test-service',
        primaryOp,
        fallbackOp
      );
      
      expect(result).toBe('fallback-result');
      expect(primaryOp).toHaveBeenCalled();
      expect(fallbackOp).toHaveBeenCalled();
    });

    it('should return default value when both operations fail', async () => {
      const primaryOp = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOp = vi.fn().mockRejectedValue(new Error('Fallback failed'));
      
      const result = await service.executeWithFallback(
        'test-service',
        primaryOp,
        fallbackOp,
        'default-value'
      );
      
      expect(result).toBe('default-value');
    });

    it('should throw error when no fallback or default is provided', async () => {
      const primaryOp = vi.fn().mockRejectedValue(new Error('Primary failed'));
      
      await expect(
        service.executeWithFallback('test-service', primaryOp)
      ).rejects.toThrow('Primary failed');
    });

    it('should record success when primary operation succeeds', async () => {
      const primaryOp = vi.fn().mockResolvedValue('success');
      
      await service.executeWithFallback('test-service', primaryOp);
      
      // Service should remain healthy
      expect(service.isServiceHealthy('test-service')).toBe(true);
    });

    it('should record failure when primary operation fails', async () => {
      const primaryOp = vi.fn().mockRejectedValue(new Error('Failed'));
      const fallbackOp = vi.fn().mockResolvedValue('fallback');
      
      await service.executeWithFallback('test-service', primaryOp, fallbackOp);
      
      // Should have recorded one failure
      expect(service.getServiceDegradationLevel('test-service')).toBe('none');
    });
  });

  describe('specialized fallback methods', () => {
    beforeEach(() => {
      service.registerService('ai-content-generation');
      service.registerService('text-to-speech');
      service.registerService('file-storage');
      service.registerService('database');
    });

    it('should handle AI content generation with fallback', async () => {
      const primaryService = vi.fn().mockResolvedValue('AI generated content');
      const fallbackService = vi.fn().mockResolvedValue('Fallback content');
      
      const result = await service.generateContentWithFallback(
        'Generate content',
        primaryService,
        fallbackService
      );
      
      expect(result).toBe('AI generated content');
    });

    it('should handle voiceover generation with fallback', async () => {
      const audioBuffer = Buffer.from('audio data');
      const primaryService = vi.fn().mockResolvedValue(audioBuffer);
      
      const result = await service.generateVoiceoverWithFallback(
        'Hello world',
        primaryService
      );
      
      expect(result).toBe(audioBuffer);
    });

    it('should handle file upload with fallback', async () => {
      const fileBuffer = Buffer.from('file data');
      const primaryUpload = vi.fn().mockResolvedValue('https://primary.com/file');
      const fallbackUpload = vi.fn().mockResolvedValue('https://fallback.com/file');
      
      const result = await service.uploadFileWithFallback(
        fileBuffer,
        primaryUpload,
        fallbackUpload
      );
      
      expect(result).toBe('https://primary.com/file');
    });

    it('should handle database queries with fallback', async () => {
      const primaryQuery = vi.fn().mockResolvedValue([{ id: 1, name: 'test' }]);
      
      const result = await service.queryWithFallback(
        'SELECT * FROM users',
        primaryQuery
      );
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });
  });

  describe('service status reporting', () => {
    it('should return all service statuses', () => {
      service.registerService('service1');
      service.registerService('service2');
      
      const error = new Error('Test error');
      service.recordServiceFailure('service1', error);
      
      const statuses = service.getServiceStatuses();
      
      expect(statuses).toHaveProperty('service1');
      expect(statuses).toHaveProperty('service2');
      expect(statuses.service1.consecutiveFailures).toBe(1);
      expect(statuses.service2.consecutiveFailures).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should clean up resources on shutdown', () => {
      service.registerService('test-service');
      
      // Make service degraded to start health monitoring
      const error = new Error('Service failed');
      service.recordServiceFailure('test-service', error);
      service.recordServiceFailure('test-service', error);
      
      expect(() => service.shutdown()).not.toThrow();
    });
  });
});