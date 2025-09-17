import { executeQuery } from '../config/database.js';
import { cacheService } from './cache.service.js';

export interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  cacheHit: boolean;
  userId?: string;
  userAgent?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageResponseTime: number;
  topMissedKeys: string[];
}

export class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsInMemory = 1000;

  /**
   * Record performance metrics
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics in memory
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.maxMetricsInMemory);
    }

    // Log slow requests
    if (metric.responseTime > 1000) {
      console.warn(`Slow request detected: ${metric.method} ${metric.endpoint} - ${metric.responseTime}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeRange: { start: Date; end: Date }): {
    averageResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
    errorRate: number;
    requestCount: number;
    cacheHitRate: number;
  } {
    const filteredMetrics = this.metrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );

    if (filteredMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        slowestEndpoints: [],
        errorRate: 0,
        requestCount: 0,
        cacheHitRate: 0,
      };
    }

    const averageResponseTime = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length;
    
    const endpointStats = new Map<string, { totalTime: number; count: number }>();
    let errorCount = 0;
    let cacheHits = 0;

    for (const metric of filteredMetrics) {
      // Track endpoint performance
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || { totalTime: 0, count: 0 };
      endpointStats.set(key, {
        totalTime: existing.totalTime + metric.responseTime,
        count: existing.count + 1,
      });

      // Track errors
      if (metric.statusCode >= 400) {
        errorCount++;
      }

      // Track cache hits
      if (metric.cacheHit) {
        cacheHits++;
      }
    }

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      averageResponseTime,
      slowestEndpoints,
      errorRate: (errorCount / filteredMetrics.length) * 100,
      requestCount: filteredMetrics.length,
      cacheHitRate: (cacheHits / filteredMetrics.length) * 100,
    };
  }

  /**
   * Get cache performance metrics
   */
  async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      // This would typically come from Redis INFO command
      // For now, we'll calculate from our recorded metrics
      const recentMetrics = this.metrics.slice(-1000);
      const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
      const totalRequests = recentMetrics.length;
      
      const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
      const missRate = 100 - hitRate;
      
      const averageResponseTime = totalRequests > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
        : 0;

      // Get most frequently missed cache keys (would need to implement tracking)
      const topMissedKeys: string[] = [];

      return {
        hitRate,
        missRate,
        totalRequests,
        averageResponseTime,
        topMissedKeys,
      };
    } catch (error) {
      console.error('Failed to get cache metrics:', error);
      return {
        hitRate: 0,
        missRate: 100,
        totalRequests: 0,
        averageResponseTime: 0,
        topMissedKeys: [],
      };
    }
  }

  /**
   * Monitor database performance
   */
  async getDatabasePerformanceMetrics(): Promise<{
    activeConnections: number;
    slowQueries: any[];
    lockWaits: number;
    cacheHitRatio: number;
  }> {
    try {
      // Active connections
      const connectionsResult = await executeQuery(`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active';
      `);

      // Cache hit ratio
      const cacheHitResult = await executeQuery(`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables;
      `);

      // Lock waits (simplified)
      const lockWaitsResult = await executeQuery(`
        SELECT count(*) as lock_waits
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock';
      `);

      return {
        activeConnections: connectionsResult.rows[0]?.active_connections || 0,
        slowQueries: [], // Would need pg_stat_statements
        lockWaits: lockWaitsResult.rows[0]?.lock_waits || 0,
        cacheHitRatio: parseFloat(cacheHitResult.rows[0]?.cache_hit_ratio || '0'),
      };
    } catch (error) {
      console.error('Failed to get database performance metrics:', error);
      return {
        activeConnections: 0,
        slowQueries: [],
        lockWaits: 0,
        cacheHitRatio: 0,
      };
    }
  }

  /**
   * Get system resource usage
   */
  getSystemMetrics(): {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  } {
    const memoryUsage = process.memoryUsage();
    
    return {
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal * 100,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: process.uptime(),
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(timeRange: { start: Date; end: Date }): Promise<{
    summary: any;
    cache: CacheMetrics;
    database: any;
    system: any;
    recommendations: string[];
  }> {
    const [summary, cache, database, system] = await Promise.all([
      this.getPerformanceStats(timeRange),
      this.getCacheMetrics(),
      this.getDatabasePerformanceMetrics(),
      this.getSystemMetrics(),
    ]);

    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (summary.averageResponseTime > 500) {
      recommendations.push('Average response time is high. Consider optimizing slow endpoints.');
    }

    if (cache.hitRate < 80) {
      recommendations.push('Cache hit rate is low. Review caching strategy and TTL settings.');
    }

    if (summary.errorRate > 5) {
      recommendations.push('Error rate is high. Investigate failing endpoints.');
    }

    if (database.cacheHitRatio < 95) {
      recommendations.push('Database cache hit ratio is low. Consider increasing shared_buffers.');
    }

    if (system.memoryUsage > 80) {
      recommendations.push('Memory usage is high. Consider scaling or optimizing memory usage.');
    }

    if (database.activeConnections > 50) {
      recommendations.push('High number of database connections. Consider connection pooling.');
    }

    return {
      summary,
      cache,
      database,
      system,
      recommendations,
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: Date): void {
    this.metrics = this.metrics.filter(m => m.timestamp > olderThan);
  }

  /**
   * Export metrics for external monitoring tools
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      // Export in Prometheus format
      const recentMetrics = this.metrics.slice(-100);
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
      const cacheHitRate = recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length;
      
      return `
# HELP stepflow_response_time_avg Average response time in milliseconds
# TYPE stepflow_response_time_avg gauge
stepflow_response_time_avg ${avgResponseTime || 0}

# HELP stepflow_cache_hit_rate Cache hit rate percentage
# TYPE stepflow_cache_hit_rate gauge
stepflow_cache_hit_rate ${cacheHitRate * 100 || 0}

# HELP stepflow_request_total Total number of requests
# TYPE stepflow_request_total counter
stepflow_request_total ${this.metrics.length}
      `.trim();
    }

    // JSON format
    return JSON.stringify({
      totalMetrics: this.metrics.length,
      recentMetrics: this.metrics.slice(-10),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();