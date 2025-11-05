/**
 * Multi-Factor Authentication (MFA) Utilities
 * TOTP-based 2FA with secret encryption and verification
 */

import { authenticator } from '@otplib/preset-default';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Configure TOTP settings
authenticator.options = {
  step: 30, // 30 second time step (standard)
  window: 1, // Allow 1 time step before/after for clock drift (60 second window)
};

/**
 * Generate a new TOTP secret for a user
 * @returns Base32 encoded secret string
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate an otpauth:// URI for QR code generation
 * @param email - User's email address
 * @param secret - Base32 encoded TOTP secret
 * @param issuer - Application name (default: "My Analytics")
 * @returns otpauth URI string
 */
export function generateOtpauthUrl(
  email: string,
  secret: string,
  issuer: string = 'My Analytics'
): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify a TOTP token against a secret
 * @param token - 6-digit TOTP code from user
 * @param secret - Base32 encoded TOTP secret
 * @returns true if token is valid, false otherwise
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    // Remove any spaces or formatting from token
    const cleanToken = token.replace(/\s/g, '');

    // Verify token is 6 digits
    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    return authenticator.verify({ token: cleanToken, secret });
  } catch (error) {
    console.error('TOTP verification failed:', error);
    return false;
  }
}

/**
 * Encrypt a TOTP secret for secure database storage
 * Uses AES-256-GCM encryption with a random IV
 *
 * @param secret - Plain text TOTP secret
 * @returns Encrypted string in format: iv:authTag:encrypted
 * @throws Error if encryption key is not configured
 */
export function encryptSecret(secret: string): string {
  const encryptionKey = process.env.MFA_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('MFA_ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure key is 32 bytes for AES-256
  const key = Buffer.from(encryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
  }

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt the secret
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag
  const authTag = cipher.getAuthTag().toString('hex');

  // Return IV:authTag:encrypted format
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a TOTP secret from database storage
 *
 * @param encryptedSecret - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted TOTP secret
 * @throws Error if decryption fails or key is not configured
 */
export function decryptSecret(encryptedSecret: string): string {
  const encryptionKey = process.env.MFA_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('MFA_ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure key is 32 bytes for AES-256
  const key = Buffer.from(encryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
  }

  // Parse the encrypted string
  const parts = encryptedSecret.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the secret
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random encryption key for MFA secrets
 * Use this to generate the MFA_ENCRYPTION_KEY environment variable
 *
 * @returns 32-byte hex string suitable for AES-256-GCM
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
