import { executeQuery } from '../config/database.js';

export class DatabaseOptimizationService {
  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(query: string, params: any[] = []): Promise<{
    executionTime: number;
    planningTime: number;
    totalCost: number;
    suggestions: string[];
  }> {
    try {
      // Enable timing and analyze
      await executeQuery('SET track_io_timing = on');
      
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, TIMING, FORMAT JSON) ${query}`;
      const result = await executeQuery(explainQuery, params);
      
      const plan = result.rows[0]['QUERY PLAN'][0];
      const executionTime = plan['Execution Time'] || 0;
      const planningTime = plan['Planning Time'] || 0;
      const totalCost = plan['Plan']['Total Cost'] || 0;
      
      const suggestions = this.generateOptimizationSuggestions(plan);
      
      return {
        executionTime,
        planningTime,
        totalCost,
        suggestions,
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate optimization suggestions based on query plan
   */
  private generateOptimizationSuggestions(plan: any): string[] {
    const suggestions: string[] = [];
    
    // Check for sequential scans
    if (this.hasSequentialScan(plan)) {
      suggestions.push('Consider adding indexes to avoid sequential scans');
    }
    
    // Check for expensive sorts
    if (this.hasExpensiveSort(plan)) {
      suggestions.push('Consider adding indexes to support ORDER BY clauses');
    }
    
    // Check for nested loops with high cost
    if (this.hasExpensiveNestedLoop(plan)) {
      suggestions.push('Consider optimizing JOIN conditions or adding indexes');
    }
    
    // Check for high buffer usage
    if (this.hasHighBufferUsage(plan)) {
      suggestions.push('Query uses significant memory, consider query restructuring');
    }
    
    return suggestions;
  }

  private hasSequentialScan(plan: any): boolean {
    if (plan['Node Type'] === 'Seq Scan') return true;
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasSequentialScan(subPlan));
    }
    return false;
  }

  private hasExpensiveSort(plan: any): boolean {
    if (plan['Node Type'] === 'Sort' && plan['Total Cost'] > 1000) return true;
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasExpensiveSort(subPlan));
    }
    return false;
  }

  private hasExpensiveNestedLoop(plan: any): boolean {
    if (plan['Node Type'] === 'Nested Loop' && plan['Total Cost'] > 10000) return true;
    if (plan['Plans']) {
      return plan['Plans'].some((subPlan: any) => this.hasExpensiveNestedLoop(subPlan));
    }
    return false;
  }

  private hasHighBufferUsage(plan: any): boolean {
    const bufferHit = plan['Shared Hit Blocks'] || 0;
    const bufferRead = plan['Shared Read Blocks'] || 0;
    return (bufferHit + bufferRead) > 10000;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    tableStats: any[];
    indexStats: any[];
    slowQueries: any[];
  }> {
    try {
      // Table statistics
      const tableStatsQuery = `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `;
      
      const tableStats = await executeQuery(tableStatsQuery);

      // Index statistics
      const indexStatsQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC;
      `;
      
      const indexStats = await executeQuery(indexStatsQuery);

      // Slow queries (requires pg_stat_statements extension)
      const slowQueriesQuery = `
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 10;
      `;
      
      let slowQueries;
      try {
        slowQueries = await executeQuery(slowQueriesQuery);
      } catch {
        // pg_stat_statements not available
        slowQueries = { rows: [] };
      }

      return {
        tableStats: tableStats.rows,
        indexStats: indexStats.rows,
        slowQueries: slowQueries.rows,
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Optimize table maintenance
   */
  async optimizeTableMaintenance(): Promise<void> {
    try {
      // Get tables that need maintenance
      const maintenanceQuery = `
        SELECT 
          schemaname,
          tablename,
          n_dead_tup,
          n_live_tup,
          CASE 
            WHEN n_live_tup > 0 
            THEN (n_dead_tup::float / n_live_tup::float) * 100 
            ELSE 0 
          END as dead_tuple_percent
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000 
        AND (n_dead_tup::float / GREATEST(n_live_tup, 1)::float) > 0.1
        ORDER BY dead_tuple_percent DESC;
      `;
      
      const result = await executeQuery(maintenanceQuery);
      
      for (const row of result.rows) {
        const tableName = `${row.schemaname}.${row.tablename}`;
        
        // Vacuum tables with high dead tuple percentage
        if (row.dead_tuple_percent > 20) {
          console.log(`Running VACUUM ANALYZE on ${tableName}`);
          await executeQuery(`VACUUM ANALYZE ${tableName}`);
        } else {
          console.log(`Running ANALYZE on ${tableName}`);
          await executeQuery(`ANALYZE ${tableName}`);
        }
      }
    } catch (error) {
      console.error('Table maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Find unused indexes
   */
  async findUnusedIndexes(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC;
      `;
      
      const result = await executeQuery(query);
      return result.rows;
    } catch (error) {
      console.error('Failed to find unused indexes:', error);
      throw error;
    }
  }

  /**
   * Get table sizes
   */
  async getTableSizes(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `;
      
      const result = await executeQuery(query);
      return result.rows;
    } catch (error) {
      console.error('Failed to get table sizes:', error);
      throw error;
    }
  }

  /**
   * Optimize connection pool settings
   */
  async optimizeConnectionPool(): Promise<{
    currentConnections: number;
    maxConnections: number;
    recommendations: string[];
  }> {
    try {
      const connectionsQuery = `
        SELECT 
          count(*) as current_connections,
          setting::int as max_connections
        FROM pg_stat_activity, pg_settings
        WHERE pg_settings.name = 'max_connections'
        GROUP BY setting;
      `;
      
      const result = await executeQuery(connectionsQuery);
      const { current_connections, max_connections } = result.rows[0];
      
      const recommendations: string[] = [];
      
      const utilizationPercent = (current_connections / max_connections) * 100;
      
      if (utilizationPercent > 80) {
        recommendations.push('Connection pool utilization is high, consider increasing max_connections');
      } else if (utilizationPercent < 20) {
        recommendations.push('Connection pool utilization is low, consider reducing max_connections');
      }
      
      if (current_connections > 100) {
        recommendations.push('High number of connections, consider using connection pooling (PgBouncer)');
      }
      
      return {
        currentConnections: current_connections,
        maxConnections: max_connections,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to analyze connection pool:', error);
      throw error;
    }
  }

  /**
   * Create optimized queries for common patterns
   */
  getOptimizedQueries() {
    return {
      // Optimized guide listing with pagination
      listGuidesOptimized: `
        SELECT g.id, g.title, g.description, g.status, g.created_at, g.updated_at,
               ga.view_count, ga.completion_count
        FROM guides g
        LEFT JOIN guide_analytics ga ON g.id = ga.guide_id
        WHERE g.user_id = $1 
        AND ($2::text IS NULL OR g.status = $2)
        AND ($3::text IS NULL OR g.category = $3)
        AND ($4::text[] IS NULL OR g.tags && $4)
        ORDER BY g.updated_at DESC
        LIMIT $5 OFFSET $6;
      `,
      
      // Optimized popular guides query
      popularGuidesOptimized: `
        SELECT g.id, g.title, g.description, g.created_at,
               ga.view_count, ga.completion_count
        FROM guides g
        INNER JOIN guide_analytics ga ON g.id = ga.guide_id
        WHERE g.status = 'published'
        AND ga.view_count > 10
        ORDER BY ga.view_count DESC, ga.completion_count DESC
        LIMIT $1;
      `,
      
      // Optimized search query
      searchGuidesOptimized: `
        SELECT g.id, g.title, g.description, g.status, g.created_at,
               ts_rank(to_tsvector('english', g.title || ' ' || COALESCE(g.description, '')), 
                       plainto_tsquery('english', $1)) as rank
        FROM guides g
        WHERE g.status = 'published'
        AND to_tsvector('english', g.title || ' ' || COALESCE(g.description, '')) 
            @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC, g.created_at DESC
        LIMIT $2 OFFSET $3;
      `,
    };
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();