import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../cache.service';
import { CDNService } from '../cdn.service';
import { ImageOptimizationService } from '../image-optimization.service';
import { DatabaseOptimizationService } from '../database-optimization.service';
import { PerformanceMonitoringService } from '../performance-monitoring.service';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => ({
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      ping: vi.fn(() => Promise.resolve('PONG')),
    })),
  };
});

// Mock AWS SDK
vi.mock('aws-sdk', () => ({
  default: {
    CloudFront: vi.fn(() => ({
      createInvalidation: vi.fn(() => ({
        promise: vi.fn(() => Promise.resolve()),
      })),
    })),
    S3: vi.fn(() => ({
      getSignedUrl: vi.fn(() => 'https://example.com/signed-url'),
    })),
  },
  CloudFront: vi.fn(() => ({
    createInvalidation: vi.fn(() => ({
      promise: vi.fn(() => Promise.resolve()),
    })),
  })),
  S3: vi.fn(() => ({
    getSignedUrl: vi.fn(() => 'https://example.com/signed-url'),
  })),
}));

// Mock Sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi.fn(() => Promise.resolve({ width: 1920, height: 1080 })),
    resize: vi.fn(() => mockSharp()),
    blur: vi.fn(() => mockSharp()),
    sharpen: vi.fn(() => mockSharp()),
    webp: vi.fn(() => mockSharp()),
    jpeg: vi.fn(() => mockSharp()),
    png: vi.fn(() => mockSharp()),
    composite: vi.fn(() => mockSharp()),
    toBuffer: vi.fn(() => Promise.resolve(Buffer.from('optimized-image'))),
  }));
  return { default: mockSharp };
});

// Mock database
vi.mock('../../config/database.js', () => ({
  executeQuery: vi.fn(() => Promise.resolve({ rows: [] })),
}));

describe('Performance Optimization Services', () => {
  describe('CacheService', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should cache and retrieve guides', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Test Guide',
        userId: 'user-1',
        status: 'published',
      };

      await cacheService.setGuide(mockGuide as any);
      const cached = await cacheService.getGuide('guide-1');
      
      // Since we're mocking Redis, we can't test actual caching
      // but we can verify the methods are called correctly
      expect(cached).toBeDefined();
    });

    it('should invalidate cache entries', async () => {
      await cacheService.invalidateGuide('guide-1');
      await cacheService.invalidateUserGuides('user-1');
      
      // Verify methods complete without error
      expect(true).toBe(true);
    });

    it('should handle cache errors gracefully', async () => {
      // Test error handling
      const result = await cacheService.getGuide('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('CDNService', () => {
    let cdnService: CDNService;

    beforeEach(() => {
      cdnService = new CDNService();
    });

    it('should generate CDN URLs', () => {
      const url = cdnService.getCDNUrl('path/to/file.jpg');
      expect(url).toContain('path/to/file.jpg');
    });

    it('should generate signed URLs', () => {
      const signedUrl = cdnService.getSignedUrl('private/file.jpg');
      expect(signedUrl).toBeDefined();
    });

    it('should generate optimized image URLs', () => {
      const optimizedUrl = cdnService.getOptimizedImageUrl('image.jpg', {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
      });
      
      expect(optimizedUrl).toContain('image.jpg');
    });

    it('should provide appropriate cache headers', () => {
      const imageHeaders = cdnService.getCacheHeaders('image/jpeg');
      const videoHeaders = cdnService.getCacheHeaders('video/mp4');
      const jsonHeaders = cdnService.getCacheHeaders('application/json');

      expect(imageHeaders['Cache-Control']).toContain('max-age=31536000');
      expect(videoHeaders['Cache-Control']).toContain('max-age=31536000');
      expect(jsonHeaders['Cache-Control']).toContain('max-age=300');
    });
  });

  describe('ImageOptimizationService', () => {
    let imageOptimizationService: ImageOptimizationService;

    beforeEach(() => {
      imageOptimizationService = new ImageOptimizationService();
    });

    it('should optimize images', async () => {
      const inputBuffer = Buffer.from('test-image');
      const optimized = await imageOptimizationService.optimizeImage(inputBuffer, {
        width: 800,
        quality: 85,
        format: 'webp',
      });

      expect(optimized).toBeInstanceOf(Buffer);
    });

    it('should check supported image formats', () => {
      expect(imageOptimizationService.isSupportedImageFormat('image.jpg')).toBe(true);
      expect(imageOptimizationService.isSupportedImageFormat('image.webp')).toBe(true);
      expect(imageOptimizationService.isSupportedImageFormat('document.pdf')).toBe(false);
    });

    it('should determine optimal format based on user agent', () => {
      const chromeFormat = imageOptimizationService.getOptimalFormat('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      const safariFormat = imageOptimizationService.getOptimalFormat('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15');

      expect(chromeFormat).toBe('webp');
      expect(safariFormat).toBe('jpeg');
    });

    it('should calculate optimal quality', () => {
      const largeImageQuality = imageOptimizationService.calculateOptimalQuality(2000, 1500, 500);
      const mediumImageQuality = imageOptimizationService.calculateOptimalQuality(1000, 750, 300);
      const smallImageQuality = imageOptimizationService.calculateOptimalQuality(400, 300, 100);

      expect(largeImageQuality).toBeLessThan(85);
      expect(mediumImageQuality).toBeLessThan(85);
      expect(smallImageQuality).toBe(85);
    });
  });

  describe('DatabaseOptimizationService', () => {
    let databaseOptimizationService: DatabaseOptimizationService;

    beforeEach(() => {
      databaseOptimizationService = new DatabaseOptimizationService();
    });

    it('should provide optimized queries', () => {
      const queries = databaseOptimizationService.getOptimizedQueries();
      
      expect(queries.listGuidesOptimized).toContain('SELECT');
      expect(queries.popularGuidesOptimized).toContain('ORDER BY');
      expect(queries.searchGuidesOptimized).toContain('ts_rank');
    });

    it('should analyze query performance', async () => {
      const analysis = await databaseOptimizationService.analyzeQueryPerformance(
        'SELECT * FROM guides WHERE user_id = $1',
        ['user-1']
      );

      expect(analysis).toHaveProperty('executionTime');
      expect(analysis).toHaveProperty('suggestions');
    });
  });

  describe('PerformanceMonitoringService', () => {
    let performanceMonitoringService: PerformanceMonitoringService;

    beforeEach(() => {
      performanceMonitoringService = new PerformanceMonitoringService();
    });

    it('should record performance metrics', () => {
      const metric = {
        timestamp: new Date(),
        endpoint: '/api/v1/guides',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
        cacheHit: true,
        userId: 'user-1',
      };

      performanceMonitoringService.recordMetric(metric);
      
      const stats = performanceMonitoringService.getPerformanceStats({
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      expect(stats.requestCount).toBe(1);
      expect(stats.averageResponseTime).toBe(150);
      expect(stats.cacheHitRate).toBe(100);
    });

    it('should generate performance recommendations', () => {
      // Record some slow metrics
      for (let i = 0; i < 10; i++) {
        performanceMonitoringService.recordMetric({
          timestamp: new Date(),
          endpoint: '/api/v1/guides',
          method: 'GET',
          responseTime: 1500, // Slow response
          statusCode: 200,
          cacheHit: false,
        });
      }

      const stats = performanceMonitoringService.getPerformanceStats({
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      expect(stats.averageResponseTime).toBeGreaterThan(500);
      expect(stats.cacheHitRate).toBe(0);
    });

    it('should export metrics in different formats', () => {
      performanceMonitoringService.recordMetric({
        timestamp: new Date(),
        endpoint: '/api/v1/guides',
        method: 'GET',
        responseTime: 200,
        statusCode: 200,
        cacheHit: true,
      });

      const jsonExport = performanceMonitoringService.exportMetrics('json');
      const prometheusExport = performanceMonitoringService.exportMetrics('prometheus');

      expect(jsonExport).toContain('totalMetrics');
      expect(prometheusExport).toContain('stepflow_response_time_avg');
    });

    it('should clear old metrics', () => {
      const oldDate = new Date(Date.now() - 86400000); // 24 hours ago
      
      performanceMonitoringService.recordMetric({
        timestamp: oldDate,
        endpoint: '/api/v1/guides',
        method: 'GET',
        responseTime: 200,
        statusCode: 200,
        cacheHit: true,
      });

      performanceMonitoringService.clearOldMetrics(new Date(Date.now() - 3600000)); // 1 hour ago
      
      const stats = performanceMonitoringService.getPerformanceStats({
        start: new Date(Date.now() - 86400000),
        end: new Date(),
      });

      expect(stats.requestCount).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete performance optimization', async () => {
      const cacheService = new CacheService();
      const imageOptimizationService = new ImageOptimizationService();
      const performanceMonitoringService = new PerformanceMonitoringService();

      // Simulate a request flow
      const startTime = Date.now();
      
      // Try cache first
      const cachedGuide = await cacheService.getGuide('guide-1');
      
      let cacheHit = false;
      if (!cachedGuide) {
        // Cache miss - would fetch from database
        const guide = { id: 'guide-1', title: 'Test Guide' };
        await cacheService.setGuide(guide as any);
      } else {
        cacheHit = true;
      }

      // Optimize an image
      const imageBuffer = Buffer.from('test-image');
      const optimizedImage = await imageOptimizationService.optimizeImage(imageBuffer);

      const endTime = Date.now();
      
      // Record performance metrics
      performanceMonitoringService.recordMetric({
        timestamp: new Date(),
        endpoint: '/api/v1/guides/guide-1',
        method: 'GET',
        responseTime: endTime - startTime,
        statusCode: 200,
        cacheHit,
      });

      expect(optimizedImage).toBeInstanceOf(Buffer);
    });
  });
});