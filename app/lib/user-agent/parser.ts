/**
 * User Agent Parser Service
 * Parses user agent strings to extract device type using ua-parser-js
 * Implements graceful fallback to 'desktop' if parsing fails
 */

import UAParser from 'ua-parser-js';
import type { DeviceType } from '../validation/pageview-schema';

/**
 * Parse device type from user agent string
 *
 * Maps ua-parser-js device types to our DeviceType enum:
 * - 'mobile' -> 'mobile'
 * - 'tablet' -> 'tablet'
 * - undefined, null, or anything else -> 'desktop'
 *
 * @param userAgent - User agent string from request headers
 * @returns Device type: 'desktop', 'mobile', or 'tablet'
 *
 * @example
 * ```typescript
 * parseDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)...')
 * // Returns: 'mobile'
 *
 * parseDeviceType('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)...')
 * // Returns: 'tablet'
 *
 * parseDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...')
 * // Returns: 'desktop'
 *
 * parseDeviceType('')
 * // Returns: 'desktop' (graceful fallback)
 * ```
 */
export function parseDeviceType(userAgent: string): DeviceType {
  // Handle empty or invalid user agent gracefully
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
    return 'desktop';
  }

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const deviceType = result.device?.type;

    // Map ua-parser-js device types to our enum
    switch (deviceType) {
      case 'mobile':
        return 'mobile';
      case 'tablet':
        return 'tablet';
      default:
        // Desktop, undefined, or any other value defaults to desktop
        return 'desktop';
    }
  } catch (error) {
    // Graceful fallback: if parsing throws error, default to desktop
    console.warn('User agent parsing failed, defaulting to desktop:', error);
    return 'desktop';
  }
}

/**
 * Validate client-provided device type against parsed user agent
 * Overrides client value if mismatch detected (server-side validation)
 *
 * This prevents clients from sending incorrect device types and ensures
 * accurate analytics data based on actual user agent strings.
 *
 * @param clientDeviceType - Device type provided by client
 * @param userAgent - User agent string from request headers
 * @returns Validated device type (potentially overridden)
 *
 * @example
 * ```typescript
 * // Client sends 'mobile' but UA indicates desktop
 * validateAndOverrideDeviceType('mobile', 'Mozilla/5.0 (Windows NT 10.0)...')
 * // Returns: 'desktop'
 * // Logs: "Device type mismatch: client sent 'mobile', server parsed 'desktop'. Using server value."
 *
 * // Client sends correct device type
 * validateAndOverrideDeviceType('mobile', 'Mozilla/5.0 (iPhone; ...)...')
 * // Returns: 'mobile'
 * // No log message
 * ```
 */
export function validateAndOverrideDeviceType(
  clientDeviceType: DeviceType,
  userAgent: string
): DeviceType {
  const parsedDeviceType = parseDeviceType(userAgent);

  // Check for mismatch between client and server-parsed device type
  if (clientDeviceType !== parsedDeviceType) {
    console.info(
      `Device type mismatch: client sent '${clientDeviceType}', ` +
      `server parsed '${parsedDeviceType}'. Using server value.`
    );
  }

  // Always use server-parsed value for data integrity
  return parsedDeviceType;
}
