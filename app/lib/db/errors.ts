/**
 * Database Error Classes
 * Shared error types for database operations
 */

/**
 * General database error class
 */
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
 * Validation error class
 */
export class ValidationError extends Error {
  public errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}