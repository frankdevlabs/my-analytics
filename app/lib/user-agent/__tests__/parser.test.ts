/**
 * User Agent Parser Tests
 * Tests device type parsing and validation with graceful fallbacks
 */

import { parseDeviceType, validateAndOverrideDeviceType } from '../parser';

describe('parseDeviceType', () => {
  test('parses Chrome mobile user agent as mobile', () => {
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
    expect(parseDeviceType(mobileUA)).toBe('mobile');
  });

  test('parses Safari desktop user agent as desktop', () => {
    const desktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    expect(parseDeviceType(desktopUA)).toBe('desktop');
  });

  test('parses iPad user agent as tablet', () => {
    const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
    expect(parseDeviceType(tabletUA)).toBe('tablet');
  });

  test('returns desktop for invalid user agent string', () => {
    expect(parseDeviceType('')).toBe('desktop');
    expect(parseDeviceType('invalid-ua-string')).toBe('desktop');
  });
});

describe('validateAndOverrideDeviceType', () => {
  test('overrides client mobile to desktop when UA indicates desktop', () => {
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    const result = validateAndOverrideDeviceType('mobile', desktopUA);
    expect(result).toBe('desktop');
  });

  test('keeps client value when it matches parsed value', () => {
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
    const result = validateAndOverrideDeviceType('mobile', mobileUA);
    expect(result).toBe('mobile');
  });
});
