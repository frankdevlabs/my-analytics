/**
 * User Query Helpers
 * Database operations for user authentication and management
 */

import { User } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Custom error classes for specific error handling
 */
export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserValidationError';
  }
}

export class DatabaseError extends Error {
  public code?: string;
  public cause?: Error;

  constructor(message: string, code?: string, cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Type guard to check if error is a Prisma error with code
 */
interface PrismaError extends Error {
  code?: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Error && 'code' in error;
}

/**
 * Retry helper with exponential backoff for transient database failures
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error = new Error('Operation failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry validation errors or constraint violations
      if (
        error instanceof UserValidationError ||
        (isPrismaError(error) && error.code === 'P2002') || // Unique constraint
        (isPrismaError(error) && error.code === 'P2003') || // Foreign key constraint
        (isPrismaError(error) && error.code === 'P2025')    // Record not found
      ) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.error(
        `Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new DatabaseError(
    'Database operation failed after retries',
    isPrismaError(lastError) ? lastError.code : undefined,
    lastError
  );
}

/**
 * Get user by email address
 * Returns null if user not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    return await retryWithBackoff(async () => {
      return await prisma.user.findUnique({
        where: {
          email: email.toLowerCase().trim()
        }
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get user by email:', {
        error: error.message,
        code: error.code
      });
      throw new DatabaseError(
        'Failed to retrieve user',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve user',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Create a new user
 * Validates email uniqueness and creates user record
 */
export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<User> {
  // Basic validation
  if (!data.email || !data.password) {
    throw new UserValidationError('Email and password are required');
  }

  if (data.email.length > 255) {
    throw new UserValidationError('Email must be 255 characters or less');
  }

  if (data.password.length > 255) {
    throw new UserValidationError('Password hash must be 255 characters or less');
  }

  try {
    return await retryWithBackoff(async () => {
      return await prisma.$transaction(
        async (tx) => {
          return await tx.user.create({
            data: {
              email: data.email.toLowerCase().trim(),
              password: data.password,
              name: data.name || null
            }
          });
        },
        {
          maxWait: 10000, // 10 seconds max wait
          timeout: 10000  // 10 seconds timeout
        }
      );
    });
  } catch (error: unknown) {
    // Handle constraint violations with specific error messages
    if (isPrismaError(error) && error.code === 'P2002') {
      throw new DatabaseError(
        'A user with this email already exists',
        'P2002',
        error
      );
    }

    // Log all database errors with context
    if (isPrismaError(error)) {
      console.error('Failed to create user:', {
        error: error.message,
        code: error.code,
        email: data.email
      });

      // Return user-friendly error message (hide internal details)
      throw new DatabaseError(
        'Failed to create user. Please try again.',
        error.code,
        error
      );
    }

    // Handle non-Prisma errors
    throw new DatabaseError(
      'Failed to create user. Please try again.',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get total count of users in the system
 * Used to enforce single-user constraint
 */
export async function getUserCount(): Promise<number> {
  try {
    return await retryWithBackoff(async () => {
      return await prisma.user.count();
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get user count:', {
        error: error.message,
        code: error.code
      });
      throw new DatabaseError(
        'Failed to retrieve user count',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve user count',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Update user MFA settings
 * Enables/disables MFA and stores encrypted secret
 */
export async function updateUserMFA(
  userId: string,
  data: {
    mfaEnabled: boolean;
    mfaSecret: string | null;
  }
): Promise<User> {
  try {
    return await retryWithBackoff(async () => {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: data.mfaEnabled,
          mfaSecret: data.mfaSecret,
        },
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to update user MFA:', {
        error: error.message,
        code: error.code,
        userId
      });
      throw new DatabaseError(
        'Failed to update MFA settings',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to update MFA settings',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Create backup codes for a user
 * Replaces existing codes with new ones
 */
export async function createBackupCodes(
  userId: string,
  hashedCodes: string[]
): Promise<void> {
  try {
    await retryWithBackoff(async () => {
      return await prisma.$transaction(async (tx) => {
        // Delete existing backup codes
        await tx.backupCode.deleteMany({
          where: { userId },
        });

        // Create new backup codes
        await tx.backupCode.createMany({
          data: hashedCodes.map(code => ({
            userId,
            code,
          })),
        });
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to create backup codes:', {
        error: error.message,
        code: error.code,
        userId
      });
      throw new DatabaseError(
        'Failed to create backup codes',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to create backup codes',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get unused backup codes for a user
 */
export async function getUnusedBackupCodes(userId: string) {
  try {
    return await retryWithBackoff(async () => {
      return await prisma.backupCode.findMany({
        where: {
          userId,
          used: false,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get backup codes:', {
        error: error.message,
        code: error.code,
        userId
      });
      throw new DatabaseError(
        'Failed to retrieve backup codes',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve backup codes',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Mark a backup code as used
 */
export async function markBackupCodeUsed(codeId: string): Promise<void> {
  try {
    await retryWithBackoff(async () => {
      await prisma.backupCode.update({
        where: { id: codeId },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to mark backup code as used:', {
        error: error.message,
        code: error.code,
        codeId
      });
      throw new DatabaseError(
        'Failed to mark backup code as used',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to mark backup code as used',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
