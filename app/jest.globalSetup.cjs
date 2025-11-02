/**
 * Jest Global Setup
 * Runs ONCE before all test suites to prepare the test environment
 *
 * Steps:
 * 1. Ensure test database exists
 * 2. Run migrations
 * 3. Truncate all tables for clean slate
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const { Client } = require('pg');

const execAsync = promisify(exec);

// Configuration from environment or defaults
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
const TEST_DB_NAME = 'my_analytics_test';

/**
 * Check if test database exists, create and migrate if needed
 */
async function ensureTestDatabase() {
  console.log('🔧 Setting up test database...');

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

    if (result.rows.length === 0) {
      console.log(`📦 Creating test database "${TEST_DB_NAME}"...`);
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`✅ Test database created`);
    }

    await client.end();

    // Run migrations on test database
    const testDatabaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${TEST_DB_NAME}`;

    try {
      await execAsync(`DATABASE_URL="${testDatabaseUrl}" npx prisma migrate deploy`, {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      });
      console.log('✅ Migrations applied');
    } catch (migrationError) {
      // Migrations may fail if already applied - that's okay
      if (!migrationError.stderr?.includes('No pending migrations')) {
        console.warn('⚠️  Migration warning (this may be okay):', migrationError.message);
      }
    }

    return testDatabaseUrl;
  } catch (error) {
    console.error('❌ Failed to set up test database:', error.message);
    console.error('');
    console.error('Make sure PostgreSQL is running:');
    console.error('  docker-compose up -d postgres');
    console.error('');
    throw error;
  }
}

/**
 * Truncate all tables in the test database for a clean slate
 * Preserves schema, deletes all data
 */
async function truncateDatabase(databaseUrl) {
  console.log('🧹 Cleaning test database...');

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();

    // Get all table names (excluding internal tables)
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename != '_prisma_migrations'
    `);

    const tables = tablesResult.rows.map(row => row.tablename);

    if (tables.length > 0) {
      // Truncate all tables with CASCADE to handle foreign keys
      const truncateQuery = tables
        .map(table => `TRUNCATE TABLE "${table}" CASCADE`)
        .join('; ');

      await client.query(truncateQuery);
      console.log(`✅ Cleaned ${tables.length} tables`);
    } else {
      console.log('✅ No tables to clean');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Failed to truncate database:', error.message);
    await client.end().catch(() => {});
    throw error;
  }
}

module.exports = async () => {
  try {
    const databaseUrl = await ensureTestDatabase();
    await truncateDatabase(databaseUrl);
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('Test database setup failed. Tests may fail.');
    // Don't throw - let tests run and fail with better error messages
  }
};
