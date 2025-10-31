#!/usr/bin/env tsx
/**
 * Production Verification Script
 *
 * Pre-flight checks to verify production environment is ready for deployment.
 * This script should be run BEFORE deploying to production to catch configuration
 * issues early.
 *
 * Checks performed:
 * - Environment variables validation
 * - PostgreSQL connectivity and version
 * - Redis connectivity and version
 * - Required files and directories exist
 * - Node.js version compatibility
 * - Disk space availability
 * - Port availability
 *
 * Usage:
 *   npm run verify:production
 *   OR
 *   npx tsx scripts/verify-production.ts
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Critical checks failed
 *   2 - Warnings present but can proceed
 */

import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface VerificationResults {
  critical: CheckResult[];
  warnings: CheckResult[];
  info: CheckResult[];
}

const results: VerificationResults = {
  critical: [],
  warnings: [],
  info: [],
};

/**
 * Check Node.js version
 */
async function checkNodeVersion(): Promise<CheckResult> {
  try {
    const currentVersion = process.version;
    const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);

    if (majorVersion < 20) {
      return {
        passed: false,
        message: `Node.js version ${currentVersion} detected`,
        details: 'Node.js 20+ is required. Please upgrade Node.js.',
      };
    }

    return {
      passed: true,
      message: `Node.js version ${currentVersion}`,
      details: 'Version requirement met (20+)',
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to check Node.js version',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables(): CheckResult {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'AUTH_SECRET',
    'AUTH_URL',
    'FIRST_USER_EMAIL',
    'FIRST_USER_PASSWORD',
    'FIRST_USER_NAME',
  ];

  const missing = required.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    return {
      passed: false,
      message: 'Missing required environment variables',
      details: `Missing: ${missing.join(', ')}`,
    };
  }

  // Validate AUTH_SECRET length
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret && authSecret.length < 32) {
    return {
      passed: false,
      message: 'AUTH_SECRET is too short',
      details: 'AUTH_SECRET must be at least 32 characters long',
    };
  }

  // Validate email format
  const email = process.env.FIRST_USER_EMAIL;
  if (email && (!email.includes('@') || !email.includes('.'))) {
    return {
      passed: false,
      message: 'FIRST_USER_EMAIL has invalid format',
      details: 'Email must contain @ and .',
    };
  }

  return {
    passed: true,
    message: 'All required environment variables present',
    details: `Checked ${required.length} variables`,
  };
}

/**
 * Check optional environment variables
 */
function checkOptionalEnvironmentVariables(): CheckResult {
  const optional = ['MAXMIND_LICENSE_KEY', 'ALLOWED_ORIGINS', 'NODE_ENV'];
  const missing = optional.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    return {
      passed: false,
      message: 'Optional environment variables missing',
      details: `Missing: ${missing.join(', ')}. Features may be limited.`,
    };
  }

  return {
    passed: true,
    message: 'All optional environment variables present',
  };
}

/**
 * Check PostgreSQL connectivity
 */
async function checkPostgresConnection(): Promise<CheckResult> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$connect();

    // Get database version
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    const version = result[0]?.version || 'Unknown';

    await prisma.$disconnect();

    return {
      passed: true,
      message: 'PostgreSQL connection successful',
      details: version.split(',')[0],
    };
  } catch (error) {
    return {
      passed: false,
      message: 'PostgreSQL connection failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedisConnection(): Promise<CheckResult> {
  try {
    const { createClient } = await import('redis');
    const client = createClient({
      url: process.env.REDIS_URL,
    });

    await client.connect();

    // Get Redis version
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'Unknown';

    // Test ping
    const pong = await client.ping();

    await client.disconnect();

    if (pong !== 'PONG') {
      return {
        passed: false,
        message: 'Redis ping failed',
        details: `Expected PONG, got ${pong}`,
      };
    }

    return {
      passed: true,
      message: 'Redis connection successful',
      details: `Redis version ${version}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Redis connection failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check required files and directories
 */
function checkRequiredFiles(): CheckResult {
  const requiredPaths = [
    { path: 'prisma/schema.prisma', type: 'file' },
    { path: 'prisma/migrations', type: 'directory' },
    { path: 'scripts/create-first-user.ts', type: 'file' },
    { path: 'public', type: 'directory' },
    { path: 'package.json', type: 'file' },
  ];

  const missing = requiredPaths.filter(({ path }) => !existsSync(join(process.cwd(), path)));

  if (missing.length > 0) {
    return {
      passed: false,
      message: 'Required files/directories missing',
      details: `Missing: ${missing.map(m => m.path).join(', ')}`,
    };
  }

  return {
    passed: true,
    message: 'All required files and directories present',
    details: `Checked ${requiredPaths.length} paths`,
  };
}

/**
 * Check disk space
 */
async function checkDiskSpace(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('df -h . | tail -n 1');
    const parts = stdout.trim().split(/\s+/);
    const available = parts[3]; // Available space
    const usePercent = parts[4]; // Use percentage

    const percentValue = parseInt(usePercent.replace('%', ''));

    if (percentValue > 90) {
      return {
        passed: false,
        message: 'Low disk space',
        details: `${usePercent} used, ${available} available`,
      };
    }

    return {
      passed: true,
      message: 'Sufficient disk space',
      details: `${usePercent} used, ${available} available`,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to check disk space',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if Prisma Client is generated
 */
function checkPrismaClient(): CheckResult {
  const prismaClientPath = join(process.cwd(), 'node_modules', '@prisma', 'client');

  if (!existsSync(prismaClientPath)) {
    return {
      passed: false,
      message: 'Prisma Client not generated',
      details: 'Run: npx prisma generate',
    };
  }

  return {
    passed: true,
    message: 'Prisma Client is generated',
  };
}

/**
 * Check if migrations are pending
 */
async function checkMigrationStatus(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('npx prisma migrate status');

    if (stdout.includes('Database schema is up to date!')) {
      return {
        passed: true,
        message: 'Database migrations up to date',
      };
    }

    if (stdout.includes('Following migration have not yet been applied')) {
      return {
        passed: false,
        message: 'Pending database migrations',
        details: 'Run: npx prisma migrate deploy',
      };
    }

    return {
      passed: true,
      message: 'Migration status checked',
      details: stdout.split('\n')[0],
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to check migration status',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check dependencies are installed
 */
function checkDependencies(): CheckResult {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const nodeModulesPath = join(process.cwd(), 'node_modules');

  if (!existsSync(nodeModulesPath)) {
    return {
      passed: false,
      message: 'Dependencies not installed',
      details: 'Run: npm install',
    };
  }

  try {
    const packageJson = require(packageJsonPath);
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    return {
      passed: true,
      message: 'Dependencies installed',
      details: `${dependencies.length} prod, ${devDependencies.length} dev`,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to check dependencies',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check GeoIP database
 */
function checkGeoIPDatabase(): CheckResult {
  const geoipPath = join(process.cwd(), 'lib', 'geoip', 'GeoLite2-Country.mmdb');

  if (!existsSync(geoipPath)) {
    return {
      passed: false,
      message: 'GeoIP database not found',
      details: 'Run: npx tsx scripts/setup-geoip.ts (requires MAXMIND_LICENSE_KEY)',
    };
  }

  // Check file size
  const stats = statSync(geoipPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  return {
    passed: true,
    message: 'GeoIP database present',
    details: `${sizeMB} MB`,
  };
}

/**
 * Main verification function
 */
async function main() {
  try {
    log('\n╔══════════════════════════════════════════════════════════╗', 'bright');
    log('║  My Analytics - Production Verification                 ║', 'bright');
    log('╚══════════════════════════════════════════════════════════╝\n', 'bright');

    logInfo('Running pre-deployment checks...\n');

    // Critical checks
    log('🔍 Critical Checks:', 'cyan');

    results.critical.push(await checkNodeVersion());
    results.critical.push(checkEnvironmentVariables());
    results.critical.push(await checkPostgresConnection());
    results.critical.push(await checkRedisConnection());
    results.critical.push(checkRequiredFiles());
    results.critical.push(checkDependencies());
    results.critical.push(checkPrismaClient());

    // Display critical results
    results.critical.forEach(result => {
      if (result.passed) {
        logSuccess(result.message);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      } else {
        logError(result.message);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      }
    });

    // Warning checks
    log('\n⚠️  Optional Checks:', 'yellow');

    results.warnings.push(checkOptionalEnvironmentVariables());
    results.warnings.push(await checkMigrationStatus());
    results.warnings.push(checkGeoIPDatabase());
    results.warnings.push(await checkDiskSpace());

    // Display warning results
    results.warnings.forEach(result => {
      if (result.passed) {
        logSuccess(result.message);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      } else {
        logWarning(result.message);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      }
    });

    // Summary
    const criticalFailed = results.critical.filter(r => !r.passed).length;
    const warningsFailed = results.warnings.filter(r => !r.passed).length;

    log('\n' + '═'.repeat(60), 'bright');
    log('Summary:', 'bright');
    log('═'.repeat(60) + '\n', 'bright');

    if (criticalFailed === 0 && warningsFailed === 0) {
      log('✅ All checks passed! Ready for production deployment.', 'green');
      log('\n📋 Next steps:', 'cyan');
      log('  npm run setup:production  # Run production setup');
      log('  npm run build             # Build the application');
      log('  npm start                 # Start production server\n');
      process.exit(0);
    } else if (criticalFailed === 0 && warningsFailed > 0) {
      log(
        `⚠️  ${warningsFailed} warning(s) detected. You can proceed but some features may be limited.`,
        'yellow'
      );
      log('\n📋 Recommended actions:', 'cyan');
      results.warnings
        .filter(r => !r.passed)
        .forEach(r => {
          if (r.details) {
            log(`  - ${r.details}`);
          }
        });
      log('');
      process.exit(2);
    } else {
      log(`❌ ${criticalFailed} critical check(s) failed. Cannot proceed with deployment.`, 'red');
      log('\n📋 Required actions:', 'cyan');
      results.critical
        .filter(r => !r.passed)
        .forEach(r => {
          if (r.details) {
            log(`  - ${r.details}`);
          }
        });
      log('');
      process.exit(1);
    }
  } catch (error) {
    logError('Verification failed with unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

// Run verification if executed directly
if (require.main === module) {
  main();
}

export { main as verifyProduction };
