/**
 * Tests for User-Agent parsing utility
 */

import { parseUserAgent } from '../user-agent-parser';

describe('parseUserAgent', () => {
  describe('Desktop Browsers', () => {
    test('should extract Chrome browser information', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36';
      const result = parseUserAgent(chromeUA);

      expect(result.browser_name).toBe('Chrome');
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

    test('should extract Edge browser information', () => {
      const edgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62';
      const result = parseUserAgent(edgeUA);

      expect(result.browser_name).toBe('Edge');
      expect(result.browser_version).toMatch(/^96\./);
      expect(result.os_name).toBe('Windows');
    });
  });

  describe('Mobile Browsers', () => {
    test('should extract iOS Safari information', () => {
      const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1';
      const result = parseUserAgent(iosUA);

      expect(result.browser_name).toBe('Mobile Safari');
      expect(result.os_name).toBe('iOS');
      expect(result.os_version).toMatch(/^15/);
    });

    test('should extract Android Chrome information', () => {
      const androidUA = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36';
      const result = parseUserAgent(androidUA);

      expect(result.browser_name).toBe('Chrome');
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
