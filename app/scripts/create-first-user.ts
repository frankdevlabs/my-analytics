#!/usr/bin/env tsx
/**
 * Create First User Script
 * Creates the first user account from environment variables
 *
 * This script is idempotent - it can be run multiple times without errors.
 * If a user already exists, it logs success and exits with code 0.
 *
 * Environment Variables Required:
 * - FIRST_USER_EMAIL: Email address for the first user
 * - FIRST_USER_PASSWORD: Password (will be hashed with bcrypt)
 * - FIRST_USER_NAME: Display name for the user
 *
 * Usage:
 * - Manual: npm run create-user
 * - Seed: npx prisma db seed
 * - Post-migration: Runs automatically after migrations
 */

import { getUserCount, createUser, getUserByEmail } from '../lib/db/users';
import { hashPassword, verifyPassword } from '../lib/auth/hash';
import { disconnectPrisma } from '../lib/db/prisma';

/**
 * Validate environment variables exist and meet basic requirements
 * Throws descriptive errors for missing or invalid variables
 */
export function validateEnvironmentVariables(): {
  email: string;
  password: string;
  name: string;
} {
  const email = process.env.FIRST_USER_EMAIL;
  const password = process.env.FIRST_USER_PASSWORD;
  const name = process.env.FIRST_USER_NAME;

  // Check for missing variables
  if (!email) {
    throw new Error(
      'FIRST_USER_EMAIL environment variable is required. Please set it in your .env file.'
    );
  }

  if (!password) {
    throw new Error(
      'FIRST_USER_PASSWORD environment variable is required. Please set it in your .env file.'
    );
  }

  if (!name) {
    throw new Error(
      'FIRST_USER_NAME environment variable is required. Please set it in your .env file.'
    );
  }

  // Validate email format (basic check - must contain @ and .)
  if (!email.includes('@') || !email.includes('.')) {
    throw new Error(
      `Invalid email format: "${email}". Email must contain @ and . (example: admin@example.com)`
    );
  }

  // Validate password is not empty
  if (password.trim().length === 0) {
    throw new Error('FIRST_USER_PASSWORD cannot be empty');
  }

  // Validate name is not empty
  if (name.trim().length === 0) {
    throw new Error('FIRST_USER_NAME cannot be empty');
  }

  return { email, password, name };
}

/**
 * Check if any users exist in the database
 * Returns true if users exist, false otherwise
 */
export async function checkUserExists(): Promise<boolean> {
  const userCount = await getUserCount();
  return userCount > 0;
}

/**
 * Create user and verify password hash
 * Throws error if password verification fails
 */
export async function createAndVerifyUser(
  email: string,
  password: string,
  name: string
): Promise<void> {
  // Hash the password
  console.log('🔐 Hashing password...');
  const hashedPassword = await hashPassword(password);

  // Create the user
  console.log('👤 Creating user...');
  const user = await createUser({
    email,
    password: hashedPassword,
    name
  });

  console.log(`✅ User created successfully: ${user.email}`);

  // Verify password hash
  console.log('🔍 Verifying password hash...');
  const retrievedUser = await getUserByEmail(email);

  if (!retrievedUser) {
    throw new Error('Failed to retrieve user after creation');
  }

  const isPasswordValid = await verifyPassword(password, retrievedUser.password);

  if (!isPasswordValid) {
    throw new Error('Password verification failed - hash may be invalid');
  }

  console.log('✅ Password hash verified successfully');
  console.log(`\n🎉 First user setup complete!`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name || '(not set)'}`);
  console.log(`   ID: ${user.id}`);
}

/**
 * Main function to create first user
 * Idempotent - succeeds even if user already exists
 */
export async function createFirstUser(): Promise<void> {
  try {
    console.log('🚀 Starting first user creation...\n');

    // Validate environment variables
    console.log('📋 Validating environment variables...');
    const { email, password, name } = validateEnvironmentVariables();
    console.log('✅ Environment variables validated\n');

    // Check if user already exists
    console.log('🔍 Checking if users exist...');
    const userExists = await checkUserExists();

    if (userExists) {
      console.log('✅ User already exists - skipping creation');
      console.log('🎉 First user is already configured!\n');
      process.exit(0);
    }

    console.log('📝 No users found - creating first user...\n');

    // Create and verify user
    await createAndVerifyUser(email, password, name);

    // Success!
    process.exit(0);
  } catch (error) {
    // Log error and exit with failure code
    console.error('\n❌ Failed to create first user:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    // Always clean up database connection
    await disconnectPrisma();
  }
}

// Run the script if executed directly (not imported)
if (require.main === module) {
  createFirstUser();
}
