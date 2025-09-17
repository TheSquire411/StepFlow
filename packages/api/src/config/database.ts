import { Pool, PoolConfig } from 'pg';
import { z } from 'zod';

// Database Configuration Schema
const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().default(false),
  maxConnections: z.number().min(1).max(100).default(20),
  idleTimeoutMillis: z.number().min(1000).default(30000),
  connectionTimeoutMillis: z.number().min(1000).default(5000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Database connection pool
let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(config: DatabaseConfig): Pool {
  // Validate configuration
  const validatedConfig = DatabaseConfigSchema.parse(config);

  const poolConfig: PoolConfig = {
    host: validatedConfig.host,
    port: validatedConfig.port,
    database: validatedConfig.database,
    user: validatedConfig.username,
    password: validatedConfig.password,
    ssl: validatedConfig.ssl ? { rejectUnauthorized: false } : false,
    max: validatedConfig.maxConnections,
    idleTimeoutMillis: validatedConfig.idleTimeoutMillis,
    connectionTimeoutMillis: validatedConfig.connectionTimeoutMillis,
  };

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Handle pool connection events
  pool.on('connect', (client) => {
    console.log('New client connected to database');
  });

  pool.on('remove', (client) => {
    console.log('Client removed from pool');
  });

  return pool;
}

/**
 * Get database connection pool
 */
export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const db = getDatabase();
    const result = await db.query('SELECT NOW() as current_time');
    console.log('Database connection test successful:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Execute a database query with error handling
 */
export async function executeQuery<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const db = getDatabase();
  
  try {
    const start = Date.now();
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result.rows;
  } catch (error) {
    console.error('Database query error:', { text, params, error });
    throw error;
  }
}

/**
 * Execute a database transaction
 */
export async function executeTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfigFromEnv(): DatabaseConfig {
  return DatabaseConfigSchema.parse({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'stepflow',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  });
}