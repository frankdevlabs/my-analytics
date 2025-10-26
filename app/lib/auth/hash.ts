/**
 * Password Hashing Utilities
 * Secure password hashing and verification using bcrypt
 */

import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password using bcrypt with cost factor 12
 * Uses bcrypt worker threads to prevent blocking the event loop
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hash string
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Cost factor 12 provides strong security while maintaining acceptable performance
    // Hashing takes ~100-500ms depending on hardware
    const hash = await bcrypt.hash(password, 12);
    return hash;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a plain text password against a bcrypt hash
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    // Don't throw on verification errors - return false for security
    // This prevents enumeration attacks based on error messages
    console.error('Password verification failed:', error);
    return false;
  }
}
