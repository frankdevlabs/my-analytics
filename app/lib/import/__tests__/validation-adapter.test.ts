/**
 * Tests for CSV validation adapter
 * Tests integration with pageviewSchema and validation error handling
 */

import { validateCsvPageview, formatValidationErrors } from '../validation-adapter';
import { MappedPageview } from '../field-mapper';

describe('validateCsvPageview', () => {
  it('should validate a complete valid pageview record', () => {
    const validPageview: MappedPageview = {
      page_id: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      session_id: 'session-123',
      hostname: 'example.com',
      path: '/test-page',
      hash: undefined,
      query_string: 'id=123',
      document_title: undefined,
      document_referrer: 'https://google.com',
      is_internal_referrer: false,
      device_type: 'desktop',
      browser_name: 'Chrome',
      browser_version: '120.0',
      os_name: 'Windows',
      os_version: '11',
      viewport_width: 1920,
      viewport_height: 1080,
      screen_width: 2560,
      screen_height: 1440,
      language: 'en-US',
      timezone: 'America/New_York',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      country_code: 'US',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'spring-sale',
      utm_content: 'ad-1',
      utm_term: 'shoes',
      duration_seconds: 120,
      time_on_page_seconds: undefined,
      scrolled_percentage: 75,
      visibility_changes: 0,
      is_unique: true,
      is_bot: false,
    };

    const result = validateCsvPageview(validPageview);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('should reject pageview with invalid added_iso timestamp', () => {
    const invalidPageview: MappedPageview = {
      page_id: 'clh1234567890abcdefghijk1',
      added_iso: 'not-a-valid-timestamp',
      path: '/test',
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(invalidPageview);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors).toContain('added_iso');
  });

  it('should reject pageview with invalid path (not starting with /)', () => {
    const invalidPageview: MappedPageview = {
      page_id: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: 'test-without-slash',
      user_agent: 'Mozilla/5.0',
      device_type: 'mobile',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(invalidPageview);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors).toContain('path');
  });

  it('should reject pageview with empty path', () => {
    const invalidPageview: MappedPageview = {
      page_id: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '',
      user_agent: 'Mozilla/5.0',
      device_type: 'tablet',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(invalidPageview);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors).toContain('path');
  });

  it('should reject pageview with invalid page_id (not CUID format)', () => {
    const invalidPageview: MappedPageview = {
      page_id: 'invalid-id-format',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(invalidPageview);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors).toContain('page_id');
  });

  it('should accept pageview with only required fields', () => {
    const minimalPageview: MappedPageview = {
      page_id: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(minimalPageview);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should accept pageview with empty user_agent for historical CSV imports', () => {
    const pageviewWithEmptyUA: MappedPageview = {
      page_id: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      user_agent: '', // Empty user agent for historical data
      device_type: 'desktop',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(pageviewWithEmptyUA);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.user_agent).toBe('');
  });

  it('should return multiple validation errors for multiple invalid fields', () => {
    const invalidPageview: MappedPageview = {
      page_id: 'bad-id',
      added_iso: 'bad-timestamp',
      path: 'no-leading-slash',
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop',
      duration_seconds: 0,
      visibility_changes: 0,
      is_internal_referrer: false,
      is_unique: false,
      is_bot: false,
    };

    const result = validateCsvPageview(invalidPageview);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(1);
  });
});

describe('formatValidationErrors', () => {
  it('should format Zod validation errors into human-readable messages', () => {
    const mockZodErrors = [
      { path: ['added_iso'], message: 'Added ISO must be a valid ISO 8601 timestamp' },
      { path: ['path'], message: 'Path must start with "/"' },
    ];

    const formatted = formatValidationErrors(mockZodErrors);

    expect(formatted).toContain('added_iso');
    expect(formatted).toContain('Added ISO must be a valid ISO 8601 timestamp');
    expect(formatted).toContain('path');
    expect(formatted).toContain('Path must start with "/"');
  });

  it('should handle nested path arrays in error formatting', () => {
    const mockZodErrors = [
      { path: ['device_type'], message: 'Invalid device type' },
    ];

    const formatted = formatValidationErrors(mockZodErrors);

    expect(formatted).toContain('device_type');
    expect(formatted).toContain('Invalid device type');
  });

  it('should format empty error array', () => {
    const formatted = formatValidationErrors([]);

    expect(formatted).toBe('');
  });
});
