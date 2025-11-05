/**
 * Apply MFA Migration Script
 *
 * This script applies the MFA-related database schema changes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('Applying MFA database migration...');
  console.log('');

  try {
    // Step 1: Add mfaEnabled column
    console.log('Step 1: Adding mfaEnabled column to users table...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
          ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✓ mfaEnabled column added successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  mfaEnabled column already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 2: Add mfaSecret column
    console.log('Step 2: Adding mfaSecret column to users table...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
          ADD COLUMN "mfaSecret" VARCHAR(500);
      `);
      console.log('✓ mfaSecret column added successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  mfaSecret column already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 3: Create backup_codes table
    console.log('Step 3: Creating backup_codes table...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "backup_codes" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "code" VARCHAR(255) NOT NULL,
          "used" BOOLEAN NOT NULL DEFAULT false,
          "usedAt" TIMESTAMPTZ(3),
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "backup_codes_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('✓ backup_codes table created successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  backup_codes table already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    // Step 4: Create index on userId
    console.log('Step 4: Creating index on backup_codes.userId...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "idx_backup_codes_user_id" ON "backup_codes"("userId");
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

    // Step 5: Add foreign key constraint
    console.log('Step 5: Adding foreign key constraint...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "backup_codes"
          ADD CONSTRAINT "backup_codes_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('✓ Foreign key constraint added successfully');
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes('already exists')) {
        console.log('⚠️  Foreign key constraint already exists - skipping');
      } else {
        throw error;
      }
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('MFA migration completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. The schema now supports MFA functionality');
    console.log('2. Users can set up TOTP-based two-factor authentication');
    console.log('3. Backup codes are available for account recovery');

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
