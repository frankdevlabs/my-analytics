/**
 * MaxMind GeoIP Lookup Service
 * Performs country code lookups from IP addresses using GeoLite2 Country database
 * Implements graceful fallback returning null if lookup fails
 */

import path from 'path';
import fs from 'fs';
import { Reader } from '@maxmind/geoip2-node';

// Database file path - use process.cwd() for correct resolution in Next.js builds
const DATABASE_PATH = path.join(process.cwd(), 'lib', 'geoip', 'GeoLite2-Country.mmdb');

// Singleton reader instance (lazy-loaded)
let readerInstance: Reader | null = null;

/**
 * Initialize MaxMind database reader (lazy loading)
 * Returns null if database file is not available
 */
function getReader(): Reader | null {
  if (readerInstance !== null) {
    return readerInstance;
  }

  try {
    // Check if database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      console.warn(
        `MaxMind database not found at ${DATABASE_PATH}. ` +
        `Current working directory: ${process.cwd()}. ` +
        'GeoIP lookups will return null. Run setup-geoip.ts to download database.'
      );
      return null;
    }

    // Load database file
    readerInstance = Reader.openBuffer(fs.readFileSync(DATABASE_PATH));
    console.log('MaxMind GeoIP database loaded successfully');
    return readerInstance;
  } catch (error) {
    console.warn(
      `Failed to load MaxMind database at ${DATABASE_PATH}. ` +
      `Current working directory: ${process.cwd()}. ` +
      `Error:`, error
    );
    return null;
  }
}

/**
 * Look up country code from IP address
 *
 * Returns 2-letter uppercase country code (ISO 3166-1 alpha-2) or null if:
 * - Database file is not available
 * - IP address is invalid
 * - IP address is not found in database (private IPs, localhost, etc.)
 * - Lookup fails for any other reason
 *
 * Handles both IPv4 and IPv6 addresses.
 *
 * @param ip - IP address to look up (IPv4 or IPv6)
 * @returns 2-letter country code (e.g., 'US', 'NL', 'GB') or null
 *
 * @example
 * ```typescript
 * lookupCountryCode('8.8.8.8')
 * // Returns: 'US'
 *
 * lookupCountryCode('2a00:1450:400e:80d::200e')
 * // Returns: 'NL' (or other EU country)
 *
 * lookupCountryCode('127.0.0.1')
 * // Returns: null (localhost/private IP)
 *
 * lookupCountryCode('invalid-ip')
 * // Returns: null (graceful failure)
 * ```
 */
export function lookupCountryCode(ip: string): string | null {
  // Validate IP address is provided
  if (!ip || typeof ip !== 'string' || ip.trim() === '') {
    console.warn('Invalid IP address provided to lookupCountryCode');
    return null;
  }

  try {
    // Get reader instance (lazy-loaded)
    const reader = getReader();
    if (!reader) {
      // Database not available, already logged warning in getReader()
      return null;
    }

    // Perform country lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (reader as any).country(ip);

    // Extract country ISO code
    const countryCode = response?.country?.isoCode;

    if (!countryCode) {
      // IP found but no country data (private IP, localhost, etc.)
      console.warn(`No country data found for IP: ${ip}`);
      return null;
    }

    // Return uppercase 2-letter country code
    return countryCode.toUpperCase();
  } catch (error) {
    // Lookup failed (invalid IP, database error, etc.)
    // Log warning but don't throw - graceful degradation
    console.warn(`GeoIP lookup failed for IP ${ip}:`, error);
    return null;
  }
}
