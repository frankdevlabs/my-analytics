/**
 * Tests for pageview validation utility
 */

import {
  validatePageview,
  sanitizePath,
  sanitizeReferrer,
  PageviewInput
} from '../pageview';

describe('validatePageview', () => {
  const validData: PageviewInput = {
    path: '/home',
    country_code: 'US',
    device_type: 'desktop',
    document_referrer: 'https://example.com',
    utm_source: 'google',
    duration_seconds: 30,
    added_iso: new Date(),
    is_unique: true
  };

  it('should return no errors for valid data', () => {
    const errors = validatePageview(validData);
    expect(errors).toEqual([]);
  });

  it('should validate path is required', () => {
    const data = { ...validData, path: '' };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'path',
      message: 'Path is required'
    });
  });

  it('should validate path starts with /', () => {
    const data = { ...validData, path: 'home' };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'path',
      message: 'Path must start with "/"'
    });
  });

  it('should validate path max length', () => {
    const data = { ...validData, path: '/' + 'a'.repeat(2000) };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'path',
      message: 'Path must be at most 2000 characters'
    });
  });

  it('should validate country code format', () => {
    const data = { ...validData, country_code: 'USA' };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'country_code',
      message: 'Country code must be exactly 2 uppercase letters (ISO 3166-1 alpha-2)'
    });
  });

  it('should allow null country code', () => {
    const data = { ...validData, country_code: null };
    const errors = validatePageview(data);
    const countryCodeErrors = errors.filter(e => e.field === 'country_code');
    expect(countryCodeErrors).toEqual([]);
  });

  it('should validate device type is valid enum value', () => {
    const data = { ...validData, device_type: 'invalid' };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'device_type',
      message: 'Device type must be one of: desktop, mobile, tablet'
    });
  });

  it('should validate document referrer is valid URL when provided', () => {
    const data = { ...validData, document_referrer: 'not-a-url' };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'document_referrer',
      message: 'Document referrer must be a valid URL format'
    });
  });

  it('should validate duration_seconds is non-negative', () => {
    const data = { ...validData, duration_seconds: -5 };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'duration_seconds',
      message: 'Duration seconds must be greater than or equal to 0'
    });
  });

  it('should validate added_iso is a valid date', () => {
    const data = { ...validData, added_iso: 'invalid-date' };
    const errors = validatePageview(data);
    expect(errors).toContainEqual({
      field: 'added_iso',
      message: 'Added ISO must be a valid date'
    });
  });
});

describe('sanitizePath', () => {
  it('should remove null bytes', () => {
    const result = sanitizePath('/path\x00with\x00nulls');
    expect(result).toBe('/pathwithnulls');
  });

  it('should remove control characters', () => {
    const result = sanitizePath('/path\x01with\x1Fcontrols');
    expect(result).toBe('/pathwithcontrols');
  });

  it('should preserve valid path characters', () => {
    const result = sanitizePath('/path/to/page?query=value&other=123');
    expect(result).toBe('/path/to/page?query=value&other=123');
  });
});

describe('sanitizeReferrer', () => {
  it('should remove null bytes from referrer', () => {
    const result = sanitizeReferrer('https://example.com\x00/path');
    expect(result).toBe('https://example.com/path');
  });

  it('should return null for empty string', () => {
    const result = sanitizeReferrer('');
    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = sanitizeReferrer(null);
    expect(result).toBeNull();
  });

  it('should preserve valid referrer URLs', () => {
    const result = sanitizeReferrer('https://example.com/path?query=value');
    expect(result).toBe('https://example.com/path?query=value');
  });
});
