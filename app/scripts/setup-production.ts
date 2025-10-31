#!/usr/bin/env tsx
/**
 * Production Setup Script
 *
 * Comprehensive, idempotent script for setting up the analytics application
 * in a production environment. This script performs all necessary initialization
 * steps including database setup, migrations, user creation, and GeoIP database.
 *
 * Features:
 * - Idempotent: Safe to run multiple times
 * - Validates environment variables before proceeding
 * - Checks service connectivity (PostgreSQL, Redis)
 * - Applies database migrations
 * - Generates Prisma Client
 * - Creates first user account
 * - Downloads GeoIP database
 * - Provides detailed progress feedback
 *
 * Usage:
 *   npm run setup:production
 *   OR
 *   npx tsx scripts/setup-production.ts
 *
 * Requirements:
 * - Node.js 20+
 * - PostgreSQL accessible and running
 * - Redis accessible and running
 * - All required environment variables set in .env
 */

import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: number, total: number, message: string) {
  log(`\n[${step}/${total}] ${message}`, 'cyan');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Required environment variables for production setup
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'AUTH_SECRET',
  'AUTH_URL',
  'FIRST_USER_EMAIL',
  'FIRST_USER_PASSWORD',
  'FIRST_USER_NAME',
] as const;

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = [
  'MAXMIND_LICENSE_KEY',
  'ALLOWED_ORIGINS',
  'DATA_RETENTION_MONTHS',
  'NODE_ENV',
] as const;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that all required environment variables are set
 */
function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check optional variables
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable not set: ${varName}`);
    }
  }

  // Validate specific formats
  const email = process.env.FIRST_USER_EMAIL;
  if (email && !email.includes('@')) {
    errors.push('FIRST_USER_EMAIL must be a valid email address');
  }

  const authSecret = process.env.AUTH_SECRET;
  if (authSecret && authSecret.length < 32) {
    errors.push('AUTH_SECRET must be at least 32 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Test PostgreSQL connection
 */
async function testPostgresConnection(): Promise<boolean> {
  try {
    // Import Prisma and test connection
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$connect();
    await prisma.$disconnect();

    return true;
  } catch (error) {
    logError('Failed to connect to PostgreSQL');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection(): Promise<boolean> {
  try {
    const { createClient } = await import('redis');
    const client = createClient({
      url: process.env.REDIS_URL,
    });

    await client.connect();
    await client.ping();
    await client.disconnect();

    return true;
  } catch (error) {
    logError('Failed to connect to Redis');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Generate Prisma Client
 */
async function generatePrismaClient(): Promise<boolean> {
  try {
    logInfo('Generating Prisma Client...');
    const { stdout, stderr } = await execAsync('npx prisma generate');

    if (stderr && !stderr.includes('Generated Prisma Client')) {
      console.error(stderr);
    }

    return true;
  } catch (error) {
    logError('Failed to generate Prisma Client');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Apply database migrations
 */
async function applyMigrations(): Promise<boolean> {
  try {
    logInfo('Applying database migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

    if (stderr) {
      console.error(stderr);
    }

    console.log(stdout);
    return true;
  } catch (error) {
    logError('Failed to apply migrations');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Create first user
 */
async function createFirstUser(): Promise<boolean> {
  try {
    logInfo('Creating first user...');

    // Import and run the create-first-user script
    const createUserModule = await import('./create-first-user');
    await createUserModule.createFirstUser();

    return true;
  } catch (error) {
    // Check if error is "user already exists"
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('already exists') || errorMessage.includes('Unique constraint')) {
      logWarning('User already exists - skipping creation');
      return true;
    }

    logError('Failed to create first user');
    console.error(errorMessage);
    return false;
  }
}

/**
 * Setup GeoIP database
 */
async function setupGeoIP(): Promise<boolean> {
  try {
    if (!process.env.MAXMIND_LICENSE_KEY) {
      logWarning('MAXMIND_LICENSE_KEY not set - skipping GeoIP setup');
      logInfo('GeoIP functionality will be disabled. Set MAXMIND_LICENSE_KEY to enable location tracking.');
      return true;
    }

    logInfo('Downloading GeoIP database...');

    // Check if GeoIP database already exists
    const geoipPath = join(process.cwd(), 'lib', 'geoip', 'GeoLite2-Country.mmdb');
    if (existsSync(geoipPath)) {
      logWarning('GeoIP database already exists - skipping download');
      return true;
    }

    const { stdout, stderr } = await execAsync('npx tsx scripts/setup-geoip.ts');

    if (stderr) {
      console.error(stderr);
    }

    console.log(stdout);
    return true;
  } catch (error) {
    logError('Failed to setup GeoIP database');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Verify installation
 */
async function verifyInstallation(): Promise<boolean> {
  try {
    logInfo('Verifying installation...');

    // Check Prisma Client is generated
    const prismaClientPath = join(process.cwd(), 'node_modules', '@prisma', 'client');
    if (!existsSync(prismaClientPath)) {
      logError('Prisma Client not found');
      return false;
    }

    // Check database connection
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      await prisma.$connect();

      // Check if user exists
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        logError('No users found in database');
        return false;
      }

      logSuccess(`Found ${userCount} user(s) in database`);

      await prisma.$disconnect();
    } catch (error) {
      logError('Database verification failed');
      console.error(error instanceof Error ? error.message : String(error));
      return false;
    }

    return true;
  } catch (error) {
    logError('Installation verification failed');
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Main setup function
 */
async function main() {
  try {
    log('\n╔══════════════════════════════════════════════════════════╗', 'bright');
    log('║  My Analytics - Production Setup                        ║', 'bright');
    log('╚══════════════════════════════════════════════════════════╝\n', 'bright');

    const totalSteps = 8;
    let currentStep = 0;

    // Step 1: Validate environment variables
    logStep(++currentStep, totalSteps, 'Validating environment variables');
    const validation = validateEnvironment();

    if (!validation.isValid) {
      logError('Environment validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      logWarning('Environment validation warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    logSuccess('Environment variables validated');

    // Step 2: Test PostgreSQL connection
    logStep(++currentStep, totalSteps, 'Testing PostgreSQL connection');
    const postgresOk = await testPostgresConnection();

    if (!postgresOk) {
      logError('PostgreSQL connection failed. Please ensure PostgreSQL is running and DATABASE_URL is correct.');
      process.exit(1);
    }

    logSuccess('PostgreSQL connection successful');

    // Step 3: Test Redis connection
    logStep(++currentStep, totalSteps, 'Testing Redis connection');
    const redisOk = await testRedisConnection();

    if (!redisOk) {
      logError('Redis connection failed. Please ensure Redis is running and REDIS_URL is correct.');
      process.exit(1);
    }

    logSuccess('Redis connection successful');

    // Step 4: Generate Prisma Client
    logStep(++currentStep, totalSteps, 'Generating Prisma Client');
    const prismaGenerated = await generatePrismaClient();

    if (!prismaGenerated) {
      logError('Failed to generate Prisma Client');
      process.exit(1);
    }

    logSuccess('Prisma Client generated');

    // Step 5: Apply database migrations
    logStep(++currentStep, totalSteps, 'Applying database migrations');
    const migrationsApplied = await applyMigrations();

    if (!migrationsApplied) {
      logError('Failed to apply migrations');
      process.exit(1);
    }

    logSuccess('Database migrations applied');

    // Step 6: Create first user
    logStep(++currentStep, totalSteps, 'Creating first user');
    const userCreated = await createFirstUser();

    if (!userCreated) {
      logError('Failed to create first user');
      process.exit(1);
    }

    logSuccess('First user created');

    // Step 7: Setup GeoIP database
    logStep(++currentStep, totalSteps, 'Setting up GeoIP database');
    const geoipSetup = await setupGeoIP();

    if (!geoipSetup) {
      logWarning('GeoIP setup failed - location tracking will be disabled');
    } else {
      logSuccess('GeoIP database configured');
    }

    // Step 8: Verify installation
    logStep(++currentStep, totalSteps, 'Verifying installation');
    const verified = await verifyInstallation();

    if (!verified) {
      logError('Installation verification failed');
      process.exit(1);
    }

    logSuccess('Installation verified');

    // Success summary
    log('\n╔══════════════════════════════════════════════════════════╗', 'bright');
    log('║  ✅ Production Setup Complete!                          ║', 'green');
    log('╚══════════════════════════════════════════════════════════╝\n', 'bright');

    log('\n📋 Next Steps:', 'cyan');
    log('  1. Build the application:');
    log('     npm run build\n');
    log('  2. Start the production server:');
    log('     npm start\n');
    log('  3. Access the dashboard at:');
    log(`     ${process.env.AUTH_URL || 'http://localhost:3000'}\n`);
    log('  4. Login with:');
    log(`     Email: ${process.env.FIRST_USER_EMAIL}`);
    log('     Password: (the one you set in FIRST_USER_PASSWORD)\n');

    process.exit(0);
  } catch (error) {
    logError('Setup failed with unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

// Run setup if executed directly
if (require.main === module) {
  main();
}

export { main as setupProduction };
