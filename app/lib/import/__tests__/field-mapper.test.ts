/**
 * Tests for CSV field mapper utility
 * Tests critical field mappings and type conversions
 */

import { mapCsvRowToPageview, convertToNumber, convertToBoolean, convertToDateTime, generatePageId, convertToPageId } from '../field-mapper';

describe('mapCsvRowToPageview', () => {
  it('should map critical CSV fields to database schema fields', () => {
    const csvRow = {
      uuid: 'clh1234567890abcdefghijk1', // Valid CUID2 format
      is_robot: 'false',
      query: 'search=test',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test-page',
      duration_seconds: '30',
      is_unique: 'true',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0'
    };

    const result = mapCsvRowToPageview(csvRow);

    expect(result.data.page_id).toBe('clh1234567890abcdefghijk1');
    expect(result.data.is_bot).toBe(false);
    expect(result.data.query_string).toBe('search=test');
  });

  it('should convert string numbers to integers for dimension fields', () => {
    const csvRow = {
      uuid: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      duration_seconds: '45',
      scrolled_percentage: '75',
      viewport_width: '1920',
      viewport_height: '1080',
      screen_width: '2560',
      screen_height: '1440',
      is_unique: 'false',
      device_type: 'desktop',
      user_agent: 'test-agent'
    };

    const result = mapCsvRowToPageview(csvRow);

    expect(result.data.duration_seconds).toBe(45);
    expect(result.data.scrolled_percentage).toBe(75);
    expect(result.data.viewport_width).toBe(1920);
    expect(result.data.viewport_height).toBe(1080);
    expect(result.data.screen_width).toBe(2560);
    expect(result.data.screen_height).toBe(1440);
  });

  it('should convert empty strings to null for optional fields', () => {
    const csvRow = {
      uuid: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      hostname: '',
      session_id: '',
      document_referrer: '',
      country_code: '',
      duration_seconds: '0',
      is_unique: 'false',
      device_type: 'mobile',
      user_agent: 'test-agent'
    };

    const result = mapCsvRowToPageview(csvRow);

    expect(result.data.hostname).toBeUndefined();
    expect(result.data.session_id).toBeUndefined();
    expect(result.data.document_referrer).toBeUndefined();
    expect(result.data.country_code).toBeUndefined();
  });

  it('should apply default values for missing fields', () => {
    const csvRow = {
      uuid: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      device_type: 'tablet',
      user_agent: 'test-agent'
      // Missing: duration_seconds, is_unique, is_robot
    };

    const result = mapCsvRowToPageview(csvRow);

    expect(result.data.duration_seconds).toBe(0);
    expect(result.data.is_unique).toBe(false);
    expect(result.data.is_bot).toBe(false);
    expect(result.data.is_internal_referrer).toBe(false);
    expect(result.data.visibility_changes).toBe(0);
    expect(result.data.time_on_page_seconds).toBeUndefined();
    expect(result.data.document_title).toBeUndefined();
    expect(result.data.hash).toBeUndefined();
  });

  it('should handle boolean string conversions correctly', () => {
    const csvRow1 = {
      uuid: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      is_unique: 'true',
      is_robot: 'true',
      duration_seconds: '0',
      device_type: 'desktop',
      user_agent: 'test-agent'
    };

    const csvRow2 = {
      uuid: 'clh9876543210zyxwvutsrqpo9',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      is_unique: 'false',
      is_robot: 'false',
      duration_seconds: '0',
      device_type: 'desktop',
      user_agent: 'test-agent'
    };

    const result1 = mapCsvRowToPageview(csvRow1);
    const result2 = mapCsvRowToPageview(csvRow2);

    expect(result1.data.is_unique).toBe(true);
    expect(result1.data.is_bot).toBe(true);
    expect(result2.data.is_unique).toBe(false);
    expect(result2.data.is_bot).toBe(false);
  });

  it('should preserve all valid pageview fields from CSV', () => {
    const csvRow = {
      uuid: 'clh1234567890abcdefghijk1', // Valid CUID2 format
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/products/item-1',
      hostname: 'example.com',
      session_id: 'session-abc',
      device_type: 'mobile',
      browser_name: 'Chrome',
      browser_version: '120.0',
      os_name: 'Android',
      os_version: '14',
      screen_width: '1080',
      screen_height: '2400',
      viewport_width: '1080',
      viewport_height: '2200',
      user_agent: 'Mozilla/5.0 (Android)',
      document_referrer: 'https://google.com/search',
      query: 'id=123',
      country_code: 'US',
      lang_language: 'en-US',
      timezone: 'America/New_York',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'spring-sale',
      utm_content: 'ad-variant-a',
      utm_term: 'running-shoes',
      duration_seconds: '120',
      scrolled_percentage: '85',
      is_unique: 'true',
      is_robot: 'false'
    };

    const result = mapCsvRowToPageview(csvRow);

    expect(result.data.page_id).toBe('clh1234567890abcdefghijk1'); // Returned as-is (valid CUID2)
    expect(result.data.path).toBe('/products/item-1');
    expect(result.data.hostname).toBe('example.com');
    expect(result.data.session_id).toBe('session-abc');
    expect(result.data.browser_name).toBe('Chrome');
    expect(result.data.query_string).toBe('id=123');
    expect(result.data.language).toBe('en-US');
    expect(result.data.utm_source).toBe('facebook');
    expect(result.data.duration_seconds).toBe(120);
    expect(result.data.is_bot).toBe(false);
  });

  it('should auto-generate page_id when uuid is missing or empty', () => {
    const csvRow = {
      uuid: '', // Empty uuid
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      duration_seconds: '0',
      is_unique: 'false',
      device_type: 'desktop',
      user_agent: ''
    };

    const result = mapCsvRowToPageview(csvRow);

    // Verify page_id was auto-generated in CUID2 format
    expect(result.data.page_id).toBeDefined();
    expect(result.data.page_id.length).toBe(25); // 'c' (1) + 24 alphanumeric
    expect(result.data.page_id).toMatch(/^c[a-z0-9]{24}$/); // CUID2 format
  });

  it('should allow empty user_agent for historical CSV imports', () => {
    const csvRow = {
      uuid: 'clh1234567890abcdefghijk1',
      added_iso: '2024-10-24T10:00:00.000Z',
      path: '/test',
      duration_seconds: '0',
      is_unique: 'false',
      device_type: 'desktop',
      user_agent: '' // Empty user agent
    };

    const result = mapCsvRowToPageview(csvRow);

    expect(result.data.user_agent).toBe('');
  });
});

describe('generatePageId', () => {
  it('should generate a valid CUID2 format (25 chars, starts with "c")', () => {
    const pageId = generatePageId();

    expect(pageId).toMatch(/^c[a-z0-9]{24}$/);
    expect(pageId.length).toBe(25);
  });

  it('should generate unique IDs on each call', () => {
    const id1 = generatePageId();
    const id2 = generatePageId();
    const id3 = generatePageId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });
});

describe('convertToPageId', () => {
  it('should generate new CUID2 when value is empty', () => {
    const result = convertToPageId('');

    expect(result.pageId).toMatch(/^c[a-z0-9]{24}$/);
    expect(result.pageId.length).toBe(25);
  });

  it('should generate new CUID2 when value is undefined', () => {
    const result = convertToPageId(undefined);

    expect(result.pageId).toMatch(/^c[a-z0-9]{24}$/);
    expect(result.pageId.length).toBe(25);
  });

  it('should return valid CUID2 as-is', () => {
    const existingCuid = 'clh1234567890abcdefghijk1';
    const result = convertToPageId(existingCuid);

    expect(result.pageId).toBe(existingCuid);
  });

  it('should return any non-empty value as-is (assumes valid CUID2)', () => {
    const cuid2 = 'cm3abc123def456ghi789jkl0';
    const result = convertToPageId(cuid2);

    expect(result.pageId).toBe(cuid2);
  });
});

describe('convertToNumber', () => {
  it('should convert valid number strings to integers', () => {
    expect(convertToNumber('42')).toBe(42);
    expect(convertToNumber('0')).toBe(0);
    expect(convertToNumber('1920')).toBe(1920);
  });

  it('should return undefined for empty strings', () => {
    expect(convertToNumber('')).toBeUndefined();
  });

  it('should return undefined for invalid number strings', () => {
    expect(convertToNumber('abc')).toBeUndefined();
    expect(convertToNumber('12.34')).toBeUndefined();
  });
});

describe('convertToBoolean', () => {
  it('should convert "true" string to boolean true', () => {
    expect(convertToBoolean('true')).toBe(true);
  });

  it('should convert "false" string to boolean false', () => {
    expect(convertToBoolean('false')).toBe(false);
  });

  it('should return false for empty strings', () => {
    expect(convertToBoolean('')).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(convertToBoolean(undefined)).toBe(false);
  });
});

describe('convertToDateTime', () => {
  it('should preserve valid ISO 8601 datetime strings', () => {
    const iso = '2024-10-24T10:30:00.000Z';
    expect(convertToDateTime(iso)).toBe(iso);
  });

  it('should preserve ISO datetime with timezone offset', () => {
    const iso = '2024-10-24T10:30:00+05:00';
    expect(convertToDateTime(iso)).toBe(iso);
  });
});
