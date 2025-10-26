/**
 * Manual Migration Application Script
 *
 * This script applies the browser_major_version migration directly to the database.
 * Use this if `prisma migrate dev` has issues with modified migrations.
 *
 * Usage:
 *   tsx scripts/apply-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const MIGRATION_NAME = '20251024000000_add_browser_major_version_and_analytics_indexes';
const MIGRATION_PATH = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  MIGRATION_NAME,
  'migration.sql'
);

async function applyMigration() {
  console.log('Applying migration manually...');
  console.log(`Migration: ${MIGRATION_NAME}`);
  console.log('');

  try {
    // Read migration SQL file
    const migrationSQL = fs.readFileSync(MIGRATION_PATH, 'utf-8');

    console.log('Migration SQL:');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('');

    // Execute migration
    console.log('Executing migration...');
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✓ Migration applied successfully!');
    console.log('');

    // Record migration in _prisma_migrations table
    console.log('Recording migration in _prisma_migrations table...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES
        (gen_random_uuid()::text, '', NOW(), '${MIGRATION_NAME}', '', NULL, NOW(), 1)
      ON CONFLICT DO NOTHING;
    `);

    console.log('✓ Migration recorded successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run backfill script: tsx scripts/backfill-browser-major-version.ts');
    console.log('2. Verify data: Check sample records have browser_major_version populated');

  } catch (error: unknown) {
    if (error instanceof Error && (('code' in error && error.code === 'P2010') || error.message?.includes('already exists'))) {
      console.log('⚠️  Migration already applied (column or indexes already exist).');
      console.log('   This is OK - skipping migration.');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    await applyMigration();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
