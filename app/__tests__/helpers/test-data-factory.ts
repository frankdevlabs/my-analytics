/**
 * Test Data Factory
 *
 * Generates unique test data for integration tests to prevent collisions.
 * Uses Jest worker ID + timestamp + random values to ensure uniqueness
 * even when tests run in parallel.
 *
 * Usage:
 *   const pageview = createTestPageview({ path: '/my-page' });
 *   // Generates unique page_id, session_id, etc.
 */

import { init as initCuid } from '@paralleldrive/cuid2';

const createId = initCuid({ length: 32 });

/**
 * Get unique test prefix based on worker ID and file
 */
function getTestPrefix(): string {
  const workerId = process.env.JEST_WORKER_ID || '1';
  const timestamp = Date.now();
  return `test-w${workerId}-${timestamp}`;
}

/**
 * Generate unique page_id using CUID2 format
 */
export function generateTestPageId(): string {
  return createId();
}

/**
 * Generate unique session_id for test data
 */
export function generateTestSessionId(): string {
  const prefix = getTestPrefix();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-session-${random}`;
}

/**
 * Generate unique path for test data
 */
export function generateTestPath(basePath?: string): string {
  const prefix = getTestPrefix();
  const random = Math.random().toString(36).substring(7);
  const base = basePath || '/test-page';
  return `${base}-${prefix}-${random}`;
}

/**
 * Generate unique hostname for test data
 */
export function generateTestHostname(): string {
  const prefix = getTestPrefix();
  const random = Math.random().toString(36).substring(7);
  return `test-${prefix}-${random}.com`;
}

/**
 * Create a complete test pageview object with unique fields
 */
export interface TestPageviewOptions {
  path?: string;
  hostname?: string;
  session_id?: string;
  page_id?: string;
  added_iso?: Date;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  browser_name?: string;
  os_name?: string;
  country_code?: string;
  is_unique?: boolean;
  is_bot?: boolean;
  duration_seconds?: number;
  user_agent?: string;
}

/**
 * Factory function to create test pageview data with sensible defaults
 */
export function createTestPageviewData(
  options: TestPageviewOptions = {}
): Record<string, any> {
  const now = options.added_iso || new Date();

  return {
    page_id: options.page_id || generateTestPageId(),
    session_id: options.session_id || generateTestSessionId(),
    hostname: options.hostname || generateTestHostname(),
    path: options.path || generateTestPath(),
    added_iso: now,
    device_type: options.device_type || 'desktop',
    browser_name: options.browser_name || 'Chrome',
    browser_version: '120.0',
    browser_major_version: '120',
    os_name: options.os_name || 'Windows',
    os_version: '10',
    country_code: options.country_code || 'US',
    is_unique: options.is_unique !== undefined ? options.is_unique : true,
    is_bot: options.is_bot || false,
    duration_seconds: options.duration_seconds || 30,
    user_agent: options.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    language: 'en-US',
    timezone: 'America/New_York',
    screen_width: 1920,
    screen_height: 1080,
    viewport_width: 1200,
    viewport_height: 800,
    document_title: 'Test Page',
    visibility_changes: 0,
    scrolled_percentage: 75,
    time_on_page_seconds: 45,
  };
}

/**
 * Create multiple test pageviews with unique data
 */
export function createBulkTestPageviewData(
  count: number,
  baseOptions: TestPageviewOptions = {}
): Record<string, any>[] {
  return Array.from({ length: count }, () =>
    createTestPageviewData(baseOptions)
  );
}

/**
 * Generate unique referrer URL for testing
 */
export function generateTestReferrer(): string {
  const prefix = getTestPrefix();
  const random = Math.random().toString(36).substring(7);
  return `https://test-referrer-${prefix}-${random}.com/page`;
}

/**
 * Create test data for CSV import testing
 */
export interface TestCsvRowOptions {
  hostname?: string;
  path?: string;
  added_iso?: string;
  session_id?: string;
  device_type?: string;
  include_optional_fields?: boolean;
}

export function createTestCsvRow(options: TestCsvRowOptions = {}): Record<string, string> {
  const timestamp = options.added_iso || new Date().toISOString();
  const pageviewData = createTestPageviewData({
    hostname: options.hostname,
    path: options.path,
    session_id: options.session_id,
    added_iso: new Date(timestamp),
    device_type: options.device_type as any,
  });

  const csvRow: Record<string, string> = {
    added_iso: timestamp,
    hostname: pageviewData.hostname,
    path: pageviewData.path,
    session_id: pageviewData.session_id,
    device_type: pageviewData.device_type,
    duration_seconds: pageviewData.duration_seconds.toString(),
    is_unique: pageviewData.is_unique.toString(),
    is_bot: pageviewData.is_bot.toString(),
  };

  if (options.include_optional_fields !== false) {
    csvRow.browser_name = pageviewData.browser_name;
    csvRow.browser_version = pageviewData.browser_version;
    csvRow.os_name = pageviewData.os_name;
    csvRow.os_version = pageviewData.os_version;
    csvRow.country_code = pageviewData.country_code;
    csvRow.language = pageviewData.language;
    csvRow.user_agent = pageviewData.user_agent;
  }

  return csvRow;
}

/**
 * Helper to clean up test data by prefix
 * Use in afterAll hooks to remove test-specific data
 */
export function getTestDataCleanupPattern(): string {
  const workerId = process.env.JEST_WORKER_ID || '1';
  return `%test-w${workerId}-%`;
}
