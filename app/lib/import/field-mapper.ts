/**
 * CSV Field Mapper
 *
 * Maps CSV column names to database schema field names and applies type conversions.
 * Handles special mappings and default values for the pageview import process.
 *
 * Key Mappings:
 * - uuid → page_id
 * - is_robot → is_bot
 * - query → query_string
 *
 * Fields Not Stored (CSV-only derived fields):
 * - referrer_hostname
 * - referrer_path
 * - path_and_query
 * - lang_region
 * - datapoint (used for filtering only)
 * - added_date (use added_iso instead)
 * - added_unix (use added_iso instead)
 * - hostname_original (use hostname instead)
 */

import { init } from '@paralleldrive/cuid2';
import { extractDomainFromUrl, getCategoryFromDomain } from '../config/referrer-categories';

// Initialize CUID2 generator with length 24 (will prepend 'c' for 25 total)
const createCuid2 = init({ length: 24 });

/**
 * CSV row type representing the input data structure
 */
interface CsvRow {
  [key: string]: string | undefined;
}

/**
 * Mapped pageview data type matching database schema
 */
export interface MappedPageview {
  page_id: string;
  added_iso: string;
  session_id?: string;
  hostname?: string;
  path: string;
  hash?: string;
  query_string?: string;
  document_title?: string;
  document_referrer?: string;
  referrer_domain?: string | null;
  referrer_category?: string;
  is_internal_referrer: boolean;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;
  viewport_width?: number;
  viewport_height?: number;
  screen_width?: number;
  screen_height?: number;
  language?: string;
  timezone?: string;
  user_agent: string;
  country_code?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  duration_seconds: number;
  time_on_page_seconds?: number;
  scrolled_percentage?: number;
  visibility_changes: number;
  is_unique: boolean;
  is_bot: boolean;
}

/**
 * Generates a CUID2 page ID using industry-standard library
 *
 * Format: 'c' + 24 lowercase alphanumeric characters (25 chars total)
 * Example: clh7p1q8b0000qzrmn1h2w3x4
 *
 * Uses @paralleldrive/cuid2 library for guaranteed collision resistance.
 * The 'c' prefix is prepended to match the validation schema format: /^c[a-z0-9]{24}$/
 *
 * @returns A valid CUID2 string (25 characters starting with 'c')
 */
export function generatePageId(): string {
  return 'c' + createCuid2();
}

/**
 * CUID2 validation regex
 * Format: 'c' + 24 lowercase alphanumeric characters = 25 chars total
 * Matches the validation in pageview-schema.ts
 */
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Converts a value to a valid page ID or generates a new CUID2
 *
 * Handles three cases:
 * 1. Empty/undefined → Generate new CUID2
 * 2. Valid CUID2 format → Return as-is
 * 3. Invalid format (e.g., UUID v4) → Generate new CUID2 and return replacement
 *
 * This ensures all page_ids conform to the CUID2 format required by the database schema,
 * automatically converting legacy UUID v4 formats or other invalid formats.
 *
 * @param value - Page ID string from CSV or empty string
 * @returns A valid CUID2 page ID and a flag indicating if replacement occurred
 */
export function convertToPageId(value: string | undefined): { pageId: string; wasReplaced: boolean } {
  // Empty or undefined → generate new CUID2
  if (!value || value === '') {
    return { pageId: generatePageId(), wasReplaced: false };
  }

  // Check if value matches CUID2 format
  if (CUID_REGEX.test(value)) {
    return { pageId: value, wasReplaced: false };
  }

  // Invalid format (e.g., UUID v4) → generate new CUID2
  return { pageId: generatePageId(), wasReplaced: true };
}

/**
 * Converts a string value to a number, or undefined if invalid
 * Only accepts integer values (no decimals)
 */
export function convertToNumber(value: string | undefined): number | undefined {
  if (!value || value === '') return undefined;

  const num = parseInt(value, 10);

  // Check if parsing was successful and value doesn't contain decimal point
  if (isNaN(num) || value.includes('.')) return undefined;

  return num;
}

/**
 * Converts a string value to a boolean
 * Returns false for empty strings and undefined values
 */
export function convertToBoolean(value: string | undefined): boolean {
  if (!value || value === '') return false;
  return value.toLowerCase() === 'true';
}

/**
 * Validates and returns ISO 8601 datetime string
 * Returns the string as-is for validation by Zod schema later
 */
export function convertToDateTime(value: string | undefined): string {
  return value || '';
}

/**
 * Converts empty strings to undefined for optional fields
 */
function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || value === '') return undefined;
  return value;
}

/**
 * Sanitizes country_code values
 * Converts invalid values to undefined:
 * - Empty strings
 * - "(not set)" placeholder from analytics exports
 * - Values that aren't exactly 2 characters
 *
 * @param value - Country code string from CSV
 * @returns Valid 2-character country code or undefined
 */
function sanitizeCountryCode(value: string | undefined): string | undefined {
  if (!value || value === '' || value === '(not set)') {
    return undefined;
  }

  // Only accept exactly 2-character codes
  if (value.length !== 2) {
    return undefined;
  }

  return value;
}

/**
 * Extended mapped pageview type with metadata about transformations
 */
export interface MappedPageviewWithMeta {
  data: MappedPageview;
  pageIdReplaced: boolean;
  originalPageId?: string;
}

/**
 * Maps a CSV row to the pageview database schema format
 *
 * Performs field name mapping, type conversions, and applies default values.
 * Does not perform validation - that is handled separately by the validation adapter.
 * Tracks when page_id values are replaced (e.g., UUID v4 → CUID2).
 *
 * @param csvRow - Raw CSV row data
 * @returns Mapped pageview object ready for validation with metadata
 */
export function mapCsvRowToPageview(csvRow: CsvRow): MappedPageviewWithMeta {
  const pageIdResult = convertToPageId(csvRow.uuid);

  // Extract referrer domain and category from document_referrer
  // Pass hostname to detect internal referrers (franksblog.nl → Direct)
  // This matches the live tracking API logic for consistency
  const referrerDomain = extractDomainFromUrl(csvRow.document_referrer || null);
  const referrerCategory = getCategoryFromDomain(referrerDomain, csvRow.hostname || null);

  return {
    data: {
      // Critical Fields - Required
      page_id: pageIdResult.pageId,
      added_iso: convertToDateTime(csvRow.added_iso),
      path: csvRow.path || '',
      user_agent: csvRow.user_agent || '',
      device_type: (csvRow.device_type as 'desktop' | 'mobile' | 'tablet') || 'desktop',

    // Identity & Session Fields - Optional
    session_id: emptyToUndefined(csvRow.session_id),
    hostname: emptyToUndefined(csvRow.hostname),

    // Page Context Fields - Optional
    hash: undefined, // Not in CSV
    query_string: emptyToUndefined(csvRow.query),
    document_title: undefined, // Not in CSV
    document_referrer: emptyToUndefined(csvRow.document_referrer),

    // Referrer Analytics Fields - Server-extracted
    referrer_domain: referrerDomain || undefined,
    referrer_category: referrerCategory,

    // Visitor Classification - Defaults
    is_internal_referrer: false, // Always false per spec
    is_unique: convertToBoolean(csvRow.is_unique),
    is_bot: convertToBoolean(csvRow.is_robot), // Map is_robot → is_bot

    // Device & Browser Fields - Optional
    browser_name: emptyToUndefined(csvRow.browser_name),
    browser_version: emptyToUndefined(csvRow.browser_version),
    os_name: emptyToUndefined(csvRow.os_name),
    os_version: emptyToUndefined(csvRow.os_version),
    viewport_width: convertToNumber(csvRow.viewport_width),
    viewport_height: convertToNumber(csvRow.viewport_height),
    screen_width: convertToNumber(csvRow.screen_width),
    screen_height: convertToNumber(csvRow.screen_height),

    // Locale & Environment - Optional
    language: emptyToUndefined(csvRow.lang_language),
    timezone: emptyToUndefined(csvRow.timezone),
    country_code: sanitizeCountryCode(csvRow.country_code),

    // Marketing Attribution - Optional
    utm_source: emptyToUndefined(csvRow.utm_source),
    utm_medium: emptyToUndefined(csvRow.utm_medium),
    utm_campaign: emptyToUndefined(csvRow.utm_campaign),
    utm_content: emptyToUndefined(csvRow.utm_content),
    utm_term: emptyToUndefined(csvRow.utm_term),

      // Engagement Metrics - Required with defaults
      duration_seconds: convertToNumber(csvRow.duration_seconds) ?? 0,
      time_on_page_seconds: undefined, // Not in CSV
      scrolled_percentage: convertToNumber(csvRow.scrolled_percentage),
      visibility_changes: 0, // Always 0 per spec
    },
    // Metadata about transformations
    pageIdReplaced: pageIdResult.wasReplaced,
    originalPageId: pageIdResult.wasReplaced ? csvRow.uuid : undefined,
  };
}

/**
 * Validates critical fields before full schema validation
 * Returns an array of validation errors for critical fields
 *
 * Critical fields that must be validated before proceeding:
 * - added_iso: Must be valid ISO 8601 datetime
 * - path: Must start with '/'
 * - country_code: Must be 2 characters if present
 * - scrolled_percentage: Must be 0-100 if present
 */
export function validateCriticalFields(data: MappedPageview): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate added_iso is present
  if (!data.added_iso) {
    errors.push({
      field: 'added_iso',
      message: 'Added ISO datetime is required'
    });
  }

  // Validate path starts with '/'
  if (!data.path || !data.path.startsWith('/')) {
    errors.push({
      field: 'path',
      message: 'Path must start with "/"'
    });
  }

  // Validate country_code is 2 characters if present
  if (data.country_code && data.country_code.length !== 2) {
    errors.push({
      field: 'country_code',
      message: 'Country code must be exactly 2 characters'
    });
  }

  // Validate scrolled_percentage is 0-100 if present
  if (data.scrolled_percentage !== undefined) {
    if (data.scrolled_percentage < 0 || data.scrolled_percentage > 100) {
      errors.push({
        field: 'scrolled_percentage',
        message: 'Scrolled percentage must be between 0 and 100'
      });
    }
  }

  return errors;
}
