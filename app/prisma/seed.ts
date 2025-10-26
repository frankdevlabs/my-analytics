#!/usr/bin/env tsx
/**
 * Prisma Seed Script
 *
 * This script seeds the database with initial data, specifically creating
 * the first user account from environment variables.
 *
 * Execution:
 * - Automatically: npx prisma db seed
 * - After reset: npx prisma migrate reset (runs seed automatically)
 *
 * Environment Variables Required:
 * - FIRST_USER_EMAIL: Email address for the first user
 * - FIRST_USER_PASSWORD: Password (will be hashed with bcrypt)
 * - FIRST_USER_NAME: Display name for the user
 */

import { createFirstUser } from '../scripts/create-first-user';

/**
 * Main seed function
 * Creates the first user using the idempotent create-first-user script
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Create first user (idempotent - safe to run multiple times)
    await createFirstUser();

    console.log('✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('❌ Database seeding failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

// Execute main function
main();
