/**
 * Pageview validation utility
 * Validates and sanitizes pageview data before database insertion
 */

export interface PageviewInput {
  path: string;
  country_code?: string | null;
  device_type: string;
  document_referrer?: string | null;
  utm_source?: string | null;
  duration_seconds: number;
  added_iso: Date | string;
  is_unique?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'] as const;
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const MAX_PATH_LENGTH = 2000;
const MAX_REFERRER_LENGTH = 2000;
const MAX_UTM_SOURCE_LENGTH = 255;

/**
 * Validates pageview input data according to spec requirements
 * Returns array of validation errors (empty if valid)
 */
export function validatePageview(data: PageviewInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate path: required, max 2000 chars, must start with '/'
  if (!data.path) {
    errors.push({ field: 'path', message: 'Path is required' });
  } else if (typeof data.path !== 'string') {
    errors.push({ field: 'path', message: 'Path must be a string' });
  } else {
    if (data.path.length > MAX_PATH_LENGTH) {
      errors.push({
        field: 'path',
        message: `Path must be at most ${MAX_PATH_LENGTH} characters`
      });
    }
    if (!data.path.startsWith('/')) {
      errors.push({
        field: 'path',
        message: 'Path must start with "/"'
      });
    }
  }

  // Validate country_code: optional, if provided must be exactly 2 uppercase letters
  if (data.country_code !== null && data.country_code !== undefined) {
    if (typeof data.country_code !== 'string') {
      errors.push({
        field: 'country_code',
        message: 'Country code must be a string'
      });
    } else if (!COUNTRY_CODE_REGEX.test(data.country_code)) {
      errors.push({
        field: 'country_code',
        message: 'Country code must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)'
      });
    }
  }

  // Validate device_type: must be 'desktop', 'mobile', or 'tablet'
  if (!data.device_type) {
    errors.push({ field: 'device_type', message: 'Device type is required' });
  } else if (!DEVICE_TYPES.includes(data.device_type as typeof DEVICE_TYPES[number])) {
    errors.push({
      field: 'device_type',
      message: `Device type must be one of: ${DEVICE_TYPES.join(', ')}`
    });
  }

  // Validate document_referrer: optional, max 2000 chars, basic URL format if provided
  if (data.document_referrer !== null && data.document_referrer !== undefined) {
    if (typeof data.document_referrer !== 'string') {
      errors.push({
        field: 'document_referrer',
        message: 'Document referrer must be a string'
      });
    } else {
      if (data.document_referrer.length > MAX_REFERRER_LENGTH) {
        errors.push({
          field: 'document_referrer',
          message: `Document referrer must be at most ${MAX_REFERRER_LENGTH} characters`
        });
      }
      // Basic URL format validation if provided and not empty
      if (data.document_referrer.trim() !== '') {
        try {
          new URL(data.document_referrer);
        } catch {
          errors.push({
            field: 'document_referrer',
            message: 'Document referrer must be a valid URL format'
          });
        }
      }
    }
  }

  // Validate utm_source: optional, max 255 chars
  if (data.utm_source !== null && data.utm_source !== undefined) {
    if (typeof data.utm_source !== 'string') {
      errors.push({
        field: 'utm_source',
        message: 'UTM source must be a string'
      });
    } else if (data.utm_source.length > MAX_UTM_SOURCE_LENGTH) {
      errors.push({
        field: 'utm_source',
        message: `UTM source must be at most ${MAX_UTM_SOURCE_LENGTH} characters`
      });
    }
  }

  // Validate duration_seconds: required, must be >= 0
  if (data.duration_seconds === null || data.duration_seconds === undefined) {
    errors.push({ field: 'duration_seconds', message: 'Duration seconds is required' });
  } else if (typeof data.duration_seconds !== 'number') {
    errors.push({
      field: 'duration_seconds',
      message: 'Duration seconds must be a number'
    });
  } else if (data.duration_seconds < 0) {
    errors.push({
      field: 'duration_seconds',
      message: 'Duration seconds must be greater than or equal to 0'
    });
  } else if (!Number.isFinite(data.duration_seconds)) {
    errors.push({
      field: 'duration_seconds',
      message: 'Duration seconds must be a finite number'
    });
  }

  // Validate added_iso: required, must be valid Date
  if (!data.added_iso) {
    errors.push({ field: 'added_iso', message: 'Added ISO timestamp is required' });
  } else {
    const date = data.added_iso instanceof Date
      ? data.added_iso
      : new Date(data.added_iso);

    if (isNaN(date.getTime())) {
      errors.push({
        field: 'added_iso',
        message: 'Added ISO must be a valid date'
      });
    }
  }

  return errors;
}

/**
 * Sanitizes path string to prevent injection attacks
 * Removes null bytes and control characters
 */
export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (ASCII 0-31 and 127)
  return path.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Sanitizes referrer string to prevent injection attacks
 * Removes null bytes and control characters, returns null if empty after sanitization
 */
export function sanitizeReferrer(referrer: string | null | undefined): string | null {
  if (!referrer || typeof referrer !== 'string') {
    return null;
  }

  // Remove null bytes and control characters (ASCII 0-31 and 127)
  const sanitized = referrer.replace(/[\x00-\x1F\x7F]/g, '').trim();

  return sanitized === '' ? null : sanitized;
}
