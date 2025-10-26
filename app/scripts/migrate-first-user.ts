#!/usr/bin/env tsx
/**
 * Data Migration: Ensure First User
 *
 * This is a data migration script that ensures the first user exists in the database.
 * It's designed to be idempotent and can be run multiple times safely.
 *
 * This script is separate from schema migrations and handles data initialization.
 *
 * Execution:
 * - Automatically: Via postmigrate hook after `npx prisma migrate deploy`
 * - Manually: npm run create-user
 * - Via seed: npx prisma db seed
 *
 * Environment Variables Required:
 * - FIRST_USER_EMAIL: Email address for the first user
 * - FIRST_USER_PASSWORD: Password (will be hashed with bcrypt)
 * - FIRST_USER_NAME: Display name for the user
 *
 * Design Notes:
 * - Uses TypeScript instead of raw SQL for better error handling and testability
 * - Leverages existing DAL functions for consistency
 * - Idempotent: checks if user exists before creating
 * - Exit codes: 0 for success (including when user exists), 1 for errors
 */

import { createFirstUser } from './create-first-user';

/**
 * Main migration function
 * Wraps createFirstUser with migration-specific logging
 */
async function runMigration() {
  console.log('📦 Running data migration: ensure_first_user\n');

  try {
    await createFirstUser();
    console.log('✅ Data migration completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Data migration failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
