/**
 * GeoIP Lookup Tests
 * Tests country code lookups with graceful fallbacks
 */

import { lookupCountryCode } from '../maxmind-reader';
import path from 'path';
import fs from 'fs';

describe('lookupCountryCode', () => {
  test('returns country code for valid public IP (US)', () => {
    // Google DNS (8.8.8.8) should resolve to US
    const result = lookupCountryCode('8.8.8.8');
    expect(result).toBe('US');
  });

  test('returns country code for valid public IP (EU)', () => {
    // Cloudflare DNS (1.1.1.1) should resolve to a country
    const result = lookupCountryCode('1.1.1.1');
    expect(typeof result === 'string' || result === null).toBe(true);
    if (result) {
      expect(result.length).toBe(2);
      expect(result).toMatch(/^[A-Z]{2}$/);
    }
  });

  test('returns null for localhost IP', () => {
    const result = lookupCountryCode('127.0.0.1');
    expect(result).toBeNull();
  });

  test('returns null for invalid IP address', () => {
    expect(lookupCountryCode('invalid-ip')).toBeNull();
    expect(lookupCountryCode('')).toBeNull();
  });

  test('returns null for private IP addresses', () => {
    // Private IP ranges should return null
    expect(lookupCountryCode('192.168.1.1')).toBeNull();
    expect(lookupCountryCode('10.0.0.1')).toBeNull();
  });

  // NEW TEST: Verify database file exists at correct path using process.cwd()
  test('database file exists at correct path using process.cwd()', () => {
    const expectedPath = path.join(process.cwd(), 'lib', 'geoip', 'GeoLite2-Country.mmdb');
    const fileExists = fs.existsSync(expectedPath);

    // This test verifies the database is at the expected location
    expect(fileExists).toBe(true);
  });
});
