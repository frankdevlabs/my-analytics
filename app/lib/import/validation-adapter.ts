/**
 * Validation Adapter for CSV Import
 *
 * Wraps the existing pageviewSchema to validate CSV-imported data.
 * Pre-validates critical fields before full schema validation.
 * Formats validation errors for logging and user feedback.
 */

import { PageviewPayloadSchema, PageviewPayload } from '../validation/pageview-schema';
import { MappedPageview } from './field-mapper';
import { ZodError } from 'zod';

/**
 * Validation result structure
 */
export interface ValidationResult {
  success: boolean;
  data?: PageviewPayload;
  errors?: string;
}

/**
 * Validates a mapped CSV pageview record using the existing pageviewSchema
 *
 * This adapter:
 * 1. Pre-validates critical fields (added_iso, path) for fast-fail
 * 2. Passes data through pageviewSchema.safeParse() for full validation
 * 3. Returns structured result with formatted error messages
 *
 * @param data - Mapped pageview data from CSV field mapper
 * @returns ValidationResult with success status, validated data, or error details
 */
export function validateCsvPageview(data: MappedPageview): ValidationResult {
  // Pre-validate critical fields for fast-fail behavior
  const criticalErrors = validateCriticalFields(data);

  if (criticalErrors.length > 0) {
    return {
      success: false,
      errors: formatCriticalFieldErrors(criticalErrors),
    };
  }

  // Perform full validation with pageviewSchema
  const result = PageviewPayloadSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Format Zod validation errors for logging
  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Pre-validates critical fields that must pass before full validation
 *
 * Critical fields:
 * - added_iso: Must be non-empty (Zod validates format)
 * - path: Must be non-empty and start with '/'
 *
 * @param data - Mapped pageview data
 * @returns Array of validation errors for critical fields
 */
function validateCriticalFields(
  data: MappedPageview
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate added_iso is present
  if (!data.added_iso || data.added_iso === '') {
    errors.push({
      field: 'added_iso',
      message: 'Added ISO timestamp is required and cannot be empty',
    });
  }

  // Validate path is present and starts with '/'
  if (!data.path || data.path === '') {
    errors.push({
      field: 'path',
      message: 'Path is required and cannot be empty',
    });
  } else if (!data.path.startsWith('/')) {
    errors.push({
      field: 'path',
      message: 'Path must start with "/"',
    });
  }

  return errors;
}

/**
 * Formats critical field validation errors into a human-readable string
 *
 * @param errors - Array of critical field validation errors
 * @returns Formatted error string for logging
 */
function formatCriticalFieldErrors(
  errors: Array<{ field: string; message: string }>
): string {
  return errors
    .map(err => `${err.field}: ${err.message}`)
    .join('; ');
}

/**
 * Formats Zod validation errors into a human-readable string
 *
 * Extracts field name, error message, and invalid value from Zod errors
 * for detailed logging and troubleshooting.
 *
 * @param zodError - Zod validation error object
 * @returns Formatted error string with field names and messages
 */
function formatZodErrors(zodError: ZodError): string {
  return zodError.issues
    .map(issue => {
      const fieldPath = issue.path.join('.');
      return `${fieldPath}: ${issue.message}`;
    })
    .join('; ');
}

/**
 * Formats validation errors from Zod error issues for external consumption
 *
 * Used by tests and external callers to format error arrays.
 * Provides consistent error formatting across the application.
 *
 * @param errors - Array of Zod error issues
 * @returns Formatted error string
 */
export function formatValidationErrors(
  errors: Array<{ path: (string | number)[]; message: string }>
): string {
  if (errors.length === 0) {
    return '';
  }

  return errors
    .map(err => {
      const fieldPath = err.path.join('.');
      return `${fieldPath}: ${err.message}`;
    })
    .join('; ');
}
