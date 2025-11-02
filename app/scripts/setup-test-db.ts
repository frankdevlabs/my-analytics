#!/usr/bin/env tsx
/**
 * Test Database Setup Script
 *
 * Ensures the test database exists and is properly migrated for E2E tests.
 * Uses Docker Compose PostgreSQL container and creates a separate test database.
 *
 * Features:
 * - Checks if PostgreSQL Docker container is running
 * - Creates test database if it doesn't exist
 * - Runs Prisma migrations against test database
 * - Clear logging with emoji indicators
 *
 * Usage:
 *   npm run test:db-setup
 *   # or directly:
 *   tsx scripts/setup-test-db.ts
 *
 * Environment Variables:
 * - POSTGRES_USER: PostgreSQL username (default: postgres)
 * - POSTGRES_PASSWORD: PostgreSQL password (default: password)
 * - POSTGRES_PORT: PostgreSQL port (default: 5432)
 *
 * The test database will be named: my_analytics_test
 *
 * Exit Codes:
 * - 0: Success
 * - 1: Critical failure (Docker not running, connection error, migration failure)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Client } from 'pg';

const execAsync = promisify(exec);

// Configuration from environment or defaults
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
const TEST_DB_NAME = 'my_analytics_test';

/**
 * Check if PostgreSQL Docker container is running
 */
async function checkDockerPostgres(): Promise<boolean> {
  console.log('🐳 Checking PostgreSQL Docker container...');

  try {
    const { stdout } = await execAsync(
      'docker ps --filter "name=my-analytics-postgres" --format "{{.Names}}"'
    );

    if (stdout.trim() === 'my-analytics-postgres') {
      console.log('✅ PostgreSQL container is running');
      return true;
    } else {
      console.error('❌ PostgreSQL container is not running');
      console.error('');
      console.error('Please start the container with:');
      console.error('  docker-compose up -d postgres');
      console.error('');
      return false;
    }
  } catch (error) {
    console.error('❌ Docker command failed. Is Docker installed and running?');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Check if test database exists, create if it doesn't
 */
async function ensureTestDatabase(): Promise<boolean> {
  console.log('🔍 Checking if test database exists...');

  // Connect to PostgreSQL default database
  const client = new Client({
    host: POSTGRES_HOST,
    port: parseInt(POSTGRES_PORT, 10),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: 'postgres', // Connect to default database
  });

  try {
    await client.connect();

    // Check if test database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DB_NAME]
    );

    if (result.rows.length > 0) {
      console.log(`✅ Test database "${TEST_DB_NAME}" already exists`);
    } else {
      console.log(`📦 Creating test database "${TEST_DB_NAME}"...`);

      // Create the test database
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);

      console.log(`✅ Test database "${TEST_DB_NAME}" created successfully`);
    }

    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database operation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    await client.end().catch(() => {});
    return false;
  }
}

/**
 * Run Prisma migrations against the test database
 */
async function runMigrations(): Promise<boolean> {
  console.log('🔧 Running Prisma migrations on test database...');

  // Set DATABASE_URL to point to test database
  const testDatabaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${TEST_DB_NAME}`;

  try {
    const { stdout, stderr } = await execAsync(
      `DATABASE_URL="${testDatabaseUrl}" npx prisma migrate deploy`,
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      }
    );

    if (stdout) {
      console.log(stdout);
    }

    console.log('✅ Migrations completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:');
    if (error instanceof Error && 'stderr' in error) {
      console.error((error as any).stderr || error.message);
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    return false;
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('');
  console.log('━'.repeat(60));
  console.log('🧪 Test Database Setup');
  console.log('━'.repeat(60));
  console.log('');

  // Step 1: Check Docker container
  const dockerRunning = await checkDockerPostgres();
  if (!dockerRunning) {
    process.exit(1);
  }

  console.log('');

  // Step 2: Ensure test database exists
  const dbCreated = await ensureTestDatabase();
  if (!dbCreated) {
    process.exit(1);
  }

  console.log('');

  // Step 3: Run migrations
  const migrationsSuccess = await runMigrations();
  if (!migrationsSuccess) {
    process.exit(1);
  }

  console.log('');
  console.log('━'.repeat(60));
  console.log('✅ Test database setup complete!');
  console.log('━'.repeat(60));
  console.log('');
  console.log(`Database: ${TEST_DB_NAME}`);
  console.log(`URL: postgresql://${POSTGRES_USER}:***@${POSTGRES_HOST}:${POSTGRES_PORT}/${TEST_DB_NAME}`);
  console.log('');
  console.log('You can now run E2E tests with:');
  console.log('  npm run test:e2e');
  console.log('');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('');
    console.error('❌ Unexpected error:');
    console.error(error);
    process.exit(1);
  });
}
