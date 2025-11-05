/**
 * Backup Codes Utilities
 * Generate and verify one-time backup codes for account recovery
 */

import { randomBytes } from 'crypto';
import { hashPassword, verifyPassword } from './hash';

/**
 * Format for a single backup code
 */
export interface BackupCode {
  code: string; // Plain text code (only shown once to user)
  hashedCode: string; // Bcrypt hashed version for storage
}

/**
 * Generate a single backup code
 * Format: XXXX-XXXX (8 characters, split for readability)
 *
 * @returns 8-character alphanumeric code in format XXXX-XXXX
 */
function generateSingleCode(): string {
  // Generate 4 random bytes (32 bits of entropy)
  const buffer = randomBytes(4);

  // Convert to alphanumeric string (exclude ambiguous characters)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 chars (no 0, O, 1, I)
  let code = '';

  for (let i = 0; i < 8; i++) {
    const index = buffer[i % 4] % chars.length;
    code += chars[index];

    // Add hyphen after 4 characters for readability
    if (i === 3) {
      code += '-';
    }
  }

  return code;
}

/**
 * Generate multiple backup codes
 * Each code is unique and can only be used once
 *
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes with plain text and hashed versions
 */
export async function generateBackupCodes(count: number = 10): Promise<BackupCode[]> {
  const codes: BackupCode[] = [];
  const usedCodes = new Set<string>();

  for (let i = 0; i < count; i++) {
    let code: string;

    // Ensure uniqueness
    do {
      code = generateSingleCode();
    } while (usedCodes.has(code));

    usedCodes.add(code);

    // Hash the code for secure storage
    const hashedCode = await hashPassword(code);

    codes.push({
      code,
      hashedCode,
    });
  }

  return codes;
}

/**
 * Verify a backup code against stored hashes
 * Uses constant-time comparison via bcrypt
 *
 * @param inputCode - Code entered by user (may include hyphens or spaces)
 * @param hashedCode - Bcrypt hash from database
 * @returns Promise resolving to true if code matches, false otherwise
 */
export async function verifyBackupCode(
  inputCode: string,
  hashedCode: string
): Promise<boolean> {
  try {
    // Normalize input: remove spaces and hyphens, convert to uppercase
    const normalizedCode = inputCode
      .replace(/[\s-]/g, '')
      .toUpperCase();

    // Verify format (8 alphanumeric characters)
    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      return false;
    }

    // Add hyphen back for consistent format (XXXX-XXXX)
    const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;

    // Use bcrypt comparison for constant-time verification
    return await verifyPassword(formattedCode, hashedCode);
  } catch (error) {
    console.error('Backup code verification failed:', error);
    return false;
  }
}

/**
 * Format backup codes for display to user
 * Adds visual grouping and numbering
 *
 * @param codes - Array of backup codes
 * @returns Array of formatted strings for display
 */
export function formatCodesForDisplay(codes: BackupCode[]): string[] {
  return codes.map((code, index) => {
    const number = (index + 1).toString().padStart(2, '0');
    return `${number}. ${code.code}`;
  });
}
