#!/usr/bin/env tsx
/**
 * Database Reset Script
 *
 * Completely resets the database and Redis cache to a clean state, then automatically
 * re-seeds the system with migrations, first user, and CSV data in a single command execution.
 *
 * Features:
 * - Environment safety check (prevents execution in production)
 * - Complete database truncation (Event → Pageview → User)
 * - Redis cache flush (FLUSHALL)
 * - Automatic Prisma migrations
 * - First user creation from environment variables
 * - CSV data import
 * - Clear logging with emoji indicators
 * - Final statistics summary
 *
 * Usage:
 *   npm run db:reset -- filename.csv
 *
 * Example:
 *   npm run db:reset -- 2025-10-16_franksblog_nl_datapoints.csv
 *
 * Environment Variables Required:
 * - NODE_ENV: Must NOT be 'production' (safety check)
 * - DATABASE_URL: PostgreSQL connection string
 * - REDIS_URL: Redis connection string
 * - FIRST_USER_EMAIL: Email for first user
 * - FIRST_USER_PASSWORD: Password for first user
 * - FIRST_USER_NAME: Display name for first user
 *
 * Exit Codes:
 * - 0: Success
 * - 1: Critical failure (environment check, database error, migration failure, user creation failure)
 */

import { prisma, disconnectPrisma } from '../lib/db/prisma';
import { getRedisClient, closeRedisClient } from '../lib/redis';
import { validateEnvironmentVariables, createAndVerifyUser } from './create-first-user';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Statistics for the reset operation
 */
interface ResetStats {
  startTime: Date;
  endTime?: Date;
  databaseDropped: boolean;
  redisFlushed: boolean;
  migrationsRun: boolean;
  userCreated: boolean;
  csvImported: boolean;
  csvImportError?: string;
}

/**
 * Check environment safety - refuse to run in production
 */
function checkEnvironmentSafety(): void {
  console.log('🔒 Checking environment safety...');

  if (process.env.NODE_ENV === 'production') {
    console.error('');
    console.error('❌ SAFETY CHECK FAILED');
    console.error('━'.repeat(60));
    console.error('This script is NOT allowed in production environments');
    console.error('Set NODE_ENV to "development" or "test" to proceed');
    console.error('━'.repeat(60));
    process.exit(1);
  }

  console.log(`✅ Environment: ${process.env.NODE_ENV || 'not set'} (safe to proceed)`);
  console.log('');
  console.log('⚠️  WARNING: This will DELETE ALL DATA from the database and Redis cache');
  console.log('');
}

/**
 * Validate and resolve CSV file path
 */
function validateCsvFile(filename: string): string {
  console.log('📄 Validating CSV file...');

  const resolvedPath = path.resolve(filename);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`✅ CSV file found: ${resolvedPath}`);
  console.log('');

  return resolvedPath;
}

/**
 * Drop all data from database tables
 * Truncation order: Event → Pageview → User (respects foreign key constraints)
 */
async function dropDatabaseTables(): Promise<void> {
  console.log('🗑️  Dropping all database tables...');

  try {
    // Drop tables completely (schema + data) to allow migrations to run fresh
    // CASCADE handles foreign key dependencies automatically
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "events" CASCADE');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "pageviews" CASCADE');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "users" CASCADE');

    // Drop Prisma's migration tracking table so migrations apply from scratch
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "_prisma_migrations" CASCADE');

    // Drop custom types/enums so migrations can recreate them
    await prisma.$executeRawUnsafe('DROP TYPE IF EXISTS "DeviceType" CASCADE');

    console.log('✅ Database tables dropped successfully');
    console.log('   - events: dropped');
    console.log('   - pageviews: dropped');
    console.log('   - users: dropped');
    console.log('   - _prisma_migrations: dropped');
    console.log('   - DeviceType enum: dropped');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to drop database tables');
    console.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Flush all Redis cache keys
 */
async function flushRedisCache(): Promise<void> {
  console.log('🧹 Flushing Redis cache...');

  try {
    const redis = await getRedisClient();
    await redis.flushAll();

    console.log('✅ Redis cache flushed successfully');
    console.log('');
  } catch (error) {
    // Redis errors are non-critical - log and continue
    console.error('⚠️  Warning: Failed to flush Redis cache');
    console.error(error instanceof Error ? error.message : String(error));
    console.log('   Continuing with database reset...');
    console.log('');
  }
}

/**
 * Wait for database to be ready and accepting connections
 *
 * After dropping tables and running migrations, PostgreSQL may need time
 * to complete WAL (Write-Ahead Logging) recovery and reach a consistent state.
 * This function polls the database until it's ready to accept queries.
 *
 * @param maxAttempts - Maximum number of connection attempts (default: 30)
 * @param delayMs - Delay between attempts in milliseconds (default: 1000)
 * @throws Error if database doesn't become ready within maxAttempts
 */
async function waitForDatabaseReady(maxAttempts = 30, delayMs = 1000): Promise<void> {
  console.log('⏳ Waiting for database to be ready...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Simple query to test database availability
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log(`✅ Database ready (attempt ${attempt}/${maxAttempts})`);
      console.log('');
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for recovery mode error
      if (errorMessage.includes('recovery mode') || errorMessage.includes('not yet accepting connections')) {
        if (attempt < maxAttempts) {
          console.log(`   Attempt ${attempt}/${maxAttempts}: Database still recovering, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }

      // Other errors or max attempts reached
      if (attempt === maxAttempts) {
        throw new Error(`Database not ready after ${maxAttempts} attempts: ${errorMessage}`);
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Run Prisma migrations to recreate schema
 */
async function runMigrations(): Promise<void> {
  console.log('📦 Running database migrations...');

  try {
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: process.env,
    });

    if (stdout) {
      console.log(stdout);
    }

    if (stderr) {
      console.error(stderr);
    }

    console.log('✅ Database migrations completed successfully');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to run database migrations');
    console.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Create first user from environment variables
 */
async function createFirstUser(): Promise<void> {
  console.log('👤 Creating first user...');

  try {
    // Validate environment variables
    const { email, password, name } = validateEnvironmentVariables();

    // Create and verify user
    await createAndVerifyUser(email, password, name);

    console.log('');
  } catch (error) {
    console.error('❌ Failed to create first user');
    console.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Import CSV data using the import-csv script
 * Non-critical - continues execution even if import fails
 */
async function importCsvData(csvFilePath: string): Promise<{ success: boolean; error?: string }> {
  console.log('📊 Importing CSV data...');
  console.log('');

  try {
    const { stdout, stderr } = await execAsync(`tsx scripts/import-csv.ts "${csvFilePath}"`, {
      cwd: process.cwd(),
      env: process.env,
    });

    if (stdout) {
      console.log(stdout);
    }

    if (stderr) {
      console.error(stderr);
    }

    return { success: true };
  } catch (error) {
    // CSV import errors are non-critical - capture and continue
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('⚠️  Warning: CSV import encountered errors');
    console.error(errorMessage);
    console.log('');

    return { success: false, error: errorMessage };
  }
}

/**
 * Display final statistics summary
 */
function displaySummary(stats: ResetStats): void {
  const durationMs = stats.endTime
    ? stats.endTime.getTime() - stats.startTime.getTime()
    : 0;
  const durationSeconds = (durationMs / 1000).toFixed(2);

  console.log('');
  console.log('═'.repeat(60));
  console.log('✅ Database Reset Complete!');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Steps Completed:');
  console.log(`  ${stats.databaseDropped ? '✅' : '❌'} Database tables dropped`);
  console.log(`  ${stats.redisFlushed ? '✅' : '⚠️ '} Redis cache flushed`);
  console.log(`  ${stats.migrationsRun ? '✅' : '❌'} Prisma migrations applied`);
  console.log(`  ${stats.userCreated ? '✅' : '❌'} First user created`);
  console.log(`  ${stats.csvImported ? '✅' : '⚠️ '} CSV data imported${stats.csvImportError ? ' (with errors)' : ''}`);
  console.log('');
  console.log(`Duration: ${durationMs}ms (${durationSeconds}s)`);
  console.log('');

  if (stats.csvImportError) {
    console.log('⚠️  CSV Import Status:');
    console.log('   Some rows may have failed to import.');
    console.log('   Check the import log above for details.');
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('Database Reset Script');
  console.log('═'.repeat(60));
  console.log('');

  // Parse command-line arguments
  const csvFilename = process.argv[2];

  if (!csvFilename) {
    console.error('❌ Error: CSV filename is required');
    console.error('');
    console.error('Usage: npm run db:reset -- filename.csv');
    console.error('Example: npm run db:reset -- 2025-10-16_franksblog_nl_datapoints.csv');
    console.error('');
    process.exit(1);
  }

  // Initialize statistics
  const stats: ResetStats = {
    startTime: new Date(),
    databaseDropped: false,
    redisFlushed: false,
    migrationsRun: false,
    userCreated: false,
    csvImported: false,
  };

  try {
    // Step 1: Environment safety check
    checkEnvironmentSafety();

    // Step 2: Validate CSV file exists
    const csvFilePath = validateCsvFile(csvFilename);

    // Step 3: Drop database tables
    await dropDatabaseTables();
    stats.databaseDropped = true;

    // Step 4: Flush Redis cache (non-critical)
    await flushRedisCache();
    stats.redisFlushed = true;

    // Step 5: Run Prisma migrations
    await runMigrations();
    stats.migrationsRun = true;

    // Step 5.5: Wait for database to be ready (critical after migrations)
    // This prevents "database in recovery mode" errors during CSV import
    await waitForDatabaseReady();

    // Step 6: Create first user
    await createFirstUser();
    stats.userCreated = true;

    // Step 7: Import CSV data (non-critical)
    const csvResult = await importCsvData(csvFilePath);
    stats.csvImported = csvResult.success;
    if (!csvResult.success) {
      stats.csvImportError = csvResult.error;
    }

    // Complete!
    stats.endTime = new Date();
    displaySummary(stats);

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('═'.repeat(60));
    console.error('❌ DATABASE RESET FAILED');
    console.error('═'.repeat(60));
    console.error('');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error('═'.repeat(60));

    process.exit(1);
  } finally {
    // Always clean up connections
    try {
      await closeRedisClient();
    } catch {
      // Ignore Redis cleanup errors
    }

    await disconnectPrisma();
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}
