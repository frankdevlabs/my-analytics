/**
 * User-Agent Parsing Utility
 *
 * Extracts browser and operating system information from User-Agent strings
 * using the ua-parser-js library for comprehensive parsing.
 *
 * Library Selection Rationale:
 * - ua-parser-js was selected for its comprehensive browser/OS parsing capabilities
 * - Size: ~18KB (acceptable for server-side use)
 * - License: MIT (open-source compatible)
 * - Well-maintained with regular updates for new user agents
 * - Returns structured data with clear browser/OS separation
 */

import UAParser from 'ua-parser-js';

/**
 * Parsed User-Agent information
 */
export interface ParsedUserAgent {
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
}

/**
 * Normalize browser names to user-friendly display names
 *
 * Maps raw browser names from ua-parser-js to consistent, recognizable display names.
 * Handles mobile browser variants and ensures consistent naming across the application.
 *
 * @param browserName - Raw browser name from ua-parser-js (e.g., "Chrome", "Mobile Safari")
 * @returns Normalized display name (e.g., "Google Chrome", "iOS Safari"), or null if input is null
 *
 * @example
 * ```typescript
 * normalizeBrowserName('Chrome')          // Returns: 'Google Chrome'
 * normalizeBrowserName('Mobile Safari')   // Returns: 'iOS Safari'
 * normalizeBrowserName('Edge')            // Returns: 'Microsoft Edge'
 * normalizeBrowserName('Firefox')         // Returns: 'Firefox'
 * normalizeBrowserName(null)              // Returns: null
 * ```
 */
export function normalizeBrowserName(browserName: string | null): string | null {
  if (!browserName) {
    return null;
  }

  // Normalize to lowercase for case-insensitive matching
  const normalized = browserName.toLowerCase().trim();

  // Browser name mapping (raw name from parser → display name)
  const browserMapping: Record<string, string> = {
    // Chrome variants
    'chrome': 'Google Chrome',
    'chrome mobile': 'Google Chrome',
    'chrome webview': 'Google Chrome',
    'chromium': 'Chromium',

    // Safari variants
    'safari': 'Safari',
    'mobile safari': 'iOS Safari',
    'ios safari': 'iOS Safari',

    // Firefox variants
    'firefox': 'Firefox',
    'firefox mobile': 'Firefox',

    // Edge variants
    'edge': 'Microsoft Edge',
    'edg': 'Microsoft Edge',
    'edge mobile': 'Microsoft Edge',

    // Opera variants
    'opera': 'Opera',
    'opera mobile': 'Opera',

    // Samsung Internet
    'samsung browser': 'Samsung Internet',
    'samsung internet': 'Samsung Internet',

    // Other common browsers
    'brave': 'Brave',
    'vivaldi': 'Vivaldi',
    'ie': 'Internet Explorer',
    'internet explorer': 'Internet Explorer',
  };

  // Look up normalized name in mapping
  const displayName = browserMapping[normalized];

  // Return mapped name if found, otherwise return original (capitalized)
  return displayName || browserName;
}

/**
 * Parse User-Agent string to extract browser and OS information
 *
 * Gracefully handles malformed or unusual User-Agent strings by returning
 * null values for fields that cannot be parsed.
 *
 * @param uaString - The User-Agent string from the HTTP request
 * @returns Parsed browser and OS information with null values for unparseable fields
 *
 * @example
 * ```typescript
 * const parsed = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
 * // Returns: {
 * //   browser_name: 'Chrome',
 * //   browser_version: '96.0.4664.110',
 * //   os_name: 'Windows',
 * //   os_version: '10'
 * // }
 * ```
 */
export function parseUserAgent(uaString: string): ParsedUserAgent {
  try {
    // Handle empty or invalid input
    if (!uaString || typeof uaString !== 'string') {
      return {
        browser_name: null,
        browser_version: null,
        os_name: null,
        os_version: null,
      };
    }

    const parser = new UAParser(uaString);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    // Normalize browser name for consistent display across the application
    const normalizedBrowserName = normalizeBrowserName(browser.name || null);

    return {
      browser_name: normalizedBrowserName,
      browser_version: browser.version || null,
      os_name: os.name || null,
      os_version: os.version || null,
    };
  } catch (error) {
    // Gracefully handle parsing errors by returning nulls
    console.warn('User-Agent parsing failed:', error);
    return {
      browser_name: null,
      browser_version: null,
      os_name: null,
      os_version: null,
    };
  }
}
