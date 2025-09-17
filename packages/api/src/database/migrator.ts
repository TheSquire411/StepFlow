import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, executeQuery, executeTransaction } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  await executeQuery(sql);
  console.log('Migrations table created or already exists');
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  const sql = 'SELECT filename FROM migrations ORDER BY id';
  const rows = await executeQuery<{ filename: string }>(sql);
  return rows.map(row => row.filename);
}

/**
 * Load migration files from the migrations directory
 */
async function loadMigrationFiles(): Promise<Migration[]> {
  const migrationsDir = join(__dirname, 'migrations');
  
  try {
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order
    
    const migrations: Migration[] = [];
    
    for (const filename of migrationFiles) {
      const filePath = join(migrationsDir, filename);
      const sql = await readFile(filePath, 'utf-8');
      
      // Extract migration ID from filename (e.g., "001_create_users_table.sql" -> 1)
      const match = filename.match(/^(\d+)_/);
      const id = match ? parseInt(match[1], 10) : 0;
      
      migrations.push({
        id,
        filename,
        sql: sql.trim(),
      });
    }
    
    return migrations.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error('Error loading migration files:', error);
    throw error;
  }
}

/**
 * Execute a single migration
 */
async function executeMigration(migration: Migration): Promise<void> {
  await executeTransaction(async (client) => {
    console.log(`Executing migration: ${migration.filename}`);
    
    // Execute the migration SQL
    await client.query(migration.sql);
    
    // Record the migration as executed
    await client.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [migration.filename]
    );
    
    console.log(`Migration completed: ${migration.filename}`);
  });
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');
    
    // Ensure migrations table exists
    await createMigrationsTable();
    
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`Found ${executedMigrations.length} executed migrations`);
    
    // Load all migration files
    const allMigrations = await loadMigrationFiles();
    console.log(`Found ${allMigrations.length} migration files`);
    
    // Filter out already executed migrations
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.filename)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to execute');
      return;
    }
    
    console.log(`Executing ${pendingMigrations.length} pending migrations...`);
    
    // Execute pending migrations in order
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback the last migration (for development purposes)
 */
export async function rollbackLastMigration(): Promise<void> {
  try {
    console.log('Rolling back last migration...');
    
    // Get the last executed migration
    const sql = 'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1';
    const rows = await executeQuery<{ filename: string }>(sql);
    
    if (rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = rows[0].filename;
    console.log(`Rolling back migration: ${lastMigration}`);
    
    // Note: This is a simple implementation that just removes the migration record
    // In a production system, you would want to have proper rollback scripts
    await executeQuery(
      'DELETE FROM migrations WHERE filename = $1',
      [lastMigration]
    );
    
    console.log(`Rollback completed for: ${lastMigration}`);
    console.log('WARNING: This only removes the migration record. Manual cleanup may be required.');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  executed: string[];
  pending: string[];
}> {
  try {
    const executedMigrations = await getExecutedMigrations();
    const allMigrations = await loadMigrationFiles();
    const pendingMigrations = allMigrations
      .filter(migration => !executedMigrations.includes(migration.filename))
      .map(migration => migration.filename);
    
    return {
      executed: executedMigrations,
      pending: pendingMigrations,
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw error;
  }
}