/**
 * Apply Migration Raw SQL Script
 *
 * This script applies the migration SQL step by step with error handling.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('Applying database migration...');
  console.log('');

  try {
    // Step 1: Add browser_major_version column
    console.log('Step 1: Adding browser_major_version column...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "pageviews"
          ADD COLUMN "browser_major_version" VARCHAR(10);
      `);
      console.log('✓ Column added successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  Column already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 2: Add device_type index
    console.log('Step 2: Adding device_type index...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "idx_pageviews_device_timestamp"
          ON "pageviews"("device_type", "added_iso");
      `);
      console.log('✓ Index created successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  Index already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 3: Add browser_name index
    console.log('Step 3: Adding browser_name index...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "idx_pageviews_browser_timestamp"
          ON "pageviews"("browser_name", "added_iso");
      `);
      console.log('✓ Index created successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  Index already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Run: tsx scripts/backfill-browser-major-version.ts');
    console.log('3. Verify: tsx scripts/verify-schema.ts');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
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
