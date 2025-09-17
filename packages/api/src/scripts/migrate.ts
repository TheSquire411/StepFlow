#!/usr/bin/env node

import { config } from 'dotenv';
import { initializeDatabase, getDatabaseConfigFromEnv, closeDatabase } from '../config/database.js';
import { runMigrations, rollbackLastMigration, getMigrationStatus } from '../database/migrator.js';

// Load environment variables
config();

async function main() {
  const command = process.argv[2];
  
  try {
    // Initialize database connection
    const dbConfig = getDatabaseConfigFromEnv();
    initializeDatabase(dbConfig);
    
    console.log('Connected to database:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
    });
    
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations();
        break;
        
      case 'down':
      case 'rollback':
        await rollbackLastMigration();
        break;
        
      case 'status':
        const status = await getMigrationStatus();
        console.log('\nMigration Status:');
        console.log('================');
        console.log(`Executed migrations (${status.executed.length}):`);
        status.executed.forEach(migration => console.log(`  ✓ ${migration}`));
        
        if (status.pending.length > 0) {
          console.log(`\nPending migrations (${status.pending.length}):`);
          status.pending.forEach(migration => console.log(`  ○ ${migration}`));
        } else {
          console.log('\nNo pending migrations');
        }
        break;
        
      default:
        console.log('Usage: npm run migrate <command>');
        console.log('');
        console.log('Commands:');
        console.log('  up, migrate    Run all pending migrations');
        console.log('  down, rollback Rollback the last migration');
        console.log('  status         Show migration status');
        process.exit(1);
    }
    
    console.log('\nOperation completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();