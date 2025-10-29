/**
 * Tests for User-Agent parsing utility
 */

import { parseUserAgent, normalizeBrowserName } from '../user-agent-parser';

describe('parseUserAgent', () => {
  describe('Desktop Browsers', () => {
    test('should extract Chrome browser information with normalized name', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36';
      const result = parseUserAgent(chromeUA);

      expect(result.browser_name).toBe('Google Chrome');
      expect(result.browser_version).toMatch(/^96\./);
      expect(result.os_name).toBe('Windows');
      expect(result.os_version).toBe('10');
    });

    test('should extract Firefox browser information', () => {
      const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0';
      const result = parseUserAgent(firefoxUA);

      expect(result.browser_name).toBe('Firefox');
      expect(result.browser_version).toMatch(/^95/);
      expect(result.os_name).toBe('Windows');
      expect(result.os_version).toBe('10');
    });

    test('should extract Safari browser information', () => {
      const safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15';
      const result = parseUserAgent(safariUA);

      expect(result.browser_name).toBe('Safari');
      expect(result.os_name).toBe('Mac OS');
      expect(result.os_version).toMatch(/^10\.15/);
    });

    test('should extract Edge browser information with normalized name', () => {
      const edgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62';
      const result = parseUserAgent(edgeUA);

      expect(result.browser_name).toBe('Microsoft Edge');
      expect(result.browser_version).toMatch(/^96\./);
      expect(result.os_name).toBe('Windows');
    });
  });

  describe('Mobile Browsers', () => {
    test('should extract iOS Safari information with normalized name', () => {
      const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1';
      const result = parseUserAgent(iosUA);

      expect(result.browser_name).toBe('iOS Safari');
      expect(result.os_name).toBe('iOS');
      expect(result.os_version).toMatch(/^15/);
    });

    test('should extract Android Chrome information with normalized name', () => {
      const androidUA = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36';
      const result = parseUserAgent(androidUA);

      expect(result.browser_name).toBe('Google Chrome');
      expect(result.os_name).toBe('Android');
      expect(result.os_version).toMatch(/^11/);
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed User-Agent gracefully', () => {
      const malformedUA = 'InvalidUserAgent!!!';
      const result = parseUserAgent(malformedUA);

      // Should not throw, returns structure with available data or nulls
      expect(result).toHaveProperty('browser_name');
      expect(result).toHaveProperty('browser_version');
      expect(result).toHaveProperty('os_name');
      expect(result).toHaveProperty('os_version');
    });

    test('should handle empty string gracefully', () => {
      const result = parseUserAgent('');

      expect(result.browser_name).toBeNull();
      expect(result.browser_version).toBeNull();
      expect(result.os_name).toBeNull();
      expect(result.os_version).toBeNull();
    });
  });
});

describe('normalizeBrowserName', () => {
  describe('Chrome variants', () => {
    test('should normalize "Chrome" to "Google Chrome"', () => {
      expect(normalizeBrowserName('Chrome')).toBe('Google Chrome');
    });

    test('should normalize "chrome" (lowercase) to "Google Chrome"', () => {
      expect(normalizeBrowserName('chrome')).toBe('Google Chrome');
    });

    test('should normalize "Chrome Mobile" to "Google Chrome"', () => {
      expect(normalizeBrowserName('Chrome Mobile')).toBe('Google Chrome');
    });

    test('should normalize "Chrome WebView" to "Google Chrome"', () => {
      expect(normalizeBrowserName('Chrome WebView')).toBe('Google Chrome');
    });

    test('should keep "Chromium" as "Chromium"', () => {
      expect(normalizeBrowserName('Chromium')).toBe('Chromium');
    });
  });

  describe('Safari variants', () => {
    test('should keep "Safari" as "Safari"', () => {
      expect(normalizeBrowserName('Safari')).toBe('Safari');
    });

    test('should normalize "Mobile Safari" to "iOS Safari"', () => {
      expect(normalizeBrowserName('Mobile Safari')).toBe('iOS Safari');
    });

    test('should normalize "iOS Safari" to "iOS Safari"', () => {
      expect(normalizeBrowserName('iOS Safari')).toBe('iOS Safari');
    });
  });

  describe('Edge variants', () => {
    test('should normalize "Edge" to "Microsoft Edge"', () => {
      expect(normalizeBrowserName('Edge')).toBe('Microsoft Edge');
    });

    test('should normalize "Edg" to "Microsoft Edge"', () => {
      expect(normalizeBrowserName('Edg')).toBe('Microsoft Edge');
    });

    test('should normalize "Edge Mobile" to "Microsoft Edge"', () => {
      expect(normalizeBrowserName('Edge Mobile')).toBe('Microsoft Edge');
    });
  });

  describe('Firefox variants', () => {
    test('should keep "Firefox" as "Firefox"', () => {
      expect(normalizeBrowserName('Firefox')).toBe('Firefox');
    });

    test('should normalize "Firefox Mobile" to "Firefox"', () => {
      expect(normalizeBrowserName('Firefox Mobile')).toBe('Firefox');
    });
  });

  describe('Other browsers', () => {
    test('should keep "Opera" as "Opera"', () => {
      expect(normalizeBrowserName('Opera')).toBe('Opera');
    });

    test('should normalize "Samsung Browser" to "Samsung Internet"', () => {
      expect(normalizeBrowserName('Samsung Browser')).toBe('Samsung Internet');
    });

    test('should keep "Brave" as "Brave"', () => {
      expect(normalizeBrowserName('Brave')).toBe('Brave');
    });

    test('should normalize "IE" to "Internet Explorer"', () => {
      expect(normalizeBrowserName('IE')).toBe('Internet Explorer');
    });
  });

  describe('Edge cases', () => {
    test('should return null for null input', () => {
      expect(normalizeBrowserName(null)).toBeNull();
    });

    test('should return original name for unknown browsers', () => {
      expect(normalizeBrowserName('UnknownBrowser')).toBe('UnknownBrowser');
    });

    test('should handle whitespace in browser names', () => {
      expect(normalizeBrowserName('  Chrome  ')).toBe('Google Chrome');
    });

    test('should handle case-insensitive matching', () => {
      expect(normalizeBrowserName('CHROME')).toBe('Google Chrome');
      expect(normalizeBrowserName('FiReFoX')).toBe('Firefox');
    });
  });
});
