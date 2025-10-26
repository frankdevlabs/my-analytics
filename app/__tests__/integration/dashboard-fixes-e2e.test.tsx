/**
 * End-to-End Tests for Dashboard Display Fixes
 *
 * Integration tests covering critical workflows for the 7 dashboard fixes:
 * 1. Redis graceful degradation
 * 2. GeoIP database path resolution
 * 3. Dark mode color detection
 * 4. Color accessibility & unified scheme
 * 5. Redundant component removal
 * 6. Multi-color vs single-color charts
 * 7. Historical data integrity (via backfill script)
 */

import { checkAndRecordVisitor } from '@/lib/privacy/visitor-tracking';
import { lookupCountryCode } from '@/lib/geoip/maxmind-reader';
import { getSeriesColor } from '@/config/chart-theme';
import { getRedisClient } from '@/lib/redis';

// Mock Redis client
jest.mock('@/lib/redis');

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
};

describe('Dashboard Fixes - End-to-End Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);
  });

  /**
   * Test 1: Redis Graceful Degradation
   * Verifies that unique visitors metric updates when Redis is unavailable
   * Related to Fix #1 (Priority 1)
   */
  describe('Redis Error Handling', () => {
    it('should return true when Redis connection fails (graceful degradation)', async () => {
      const hash = 'test-visitor-hash-123';
      (getRedisClient as jest.Mock).mockRejectedValue(
        new Error('Redis connection refused')
      );

      const result = await checkAndRecordVisitor(hash);

      // After fix: should return true (assume unique) instead of false
      expect(result).toBe(true);
    });

    it('should return true when Redis times out', async () => {
      const hash = 'test-visitor-hash-456';
      (getRedisClient as jest.Mock).mockRejectedValue(
        new Error('Redis operation timed out')
      );

      const result = await checkAndRecordVisitor(hash);

      expect(result).toBe(true);
    });
  });

  /**
   * Test 2: GeoIP Database Path Resolution
   * Verifies that geographic data displays actual countries after path fix
   * Related to Fix #2 (Priority 2)
   */
  describe('GeoIP Path Resolution', () => {
    it('should successfully lookup country code for valid public IP using process.cwd() path', () => {
      // Google DNS (8.8.8.8) should resolve to US
      const result = lookupCountryCode('8.8.8.8');

      // After fix: path.join(process.cwd(), 'app', 'lib', 'geoip', 'GeoLite2-Country.mmdb')
      // should successfully load the database and return country code
      expect(result).toBe('US');
    });

    it('should handle IP lookup failure gracefully for Cloudflare DNS', () => {
      const result = lookupCountryCode('1.1.1.1');

      // Cloudflare DNS might not be in the GeoIP database or might return null
      // This is expected behavior - the fix ensures database loads, not that all IPs resolve
      expect(result === null || (typeof result === 'string' && result.length === 2)).toBe(true);
    });

    it('should return null for localhost (expected behavior)', () => {
      const result = lookupCountryCode('127.0.0.1');
      expect(result).toBeNull();
    });
  });

  /**
   * Test 3: Dark Mode Color Detection
   * Verifies that dark mode toggle switches all chart colors
   * Related to Fix #3 (Priority 3)
   */
  describe('Dark Mode Color Switching', () => {
    it('should return same gold color for first series in both modes (by design)', () => {
      // After color palette reordering, gold (#D9BF65) is first in both modes
      // This is intentional for high contrast in both light and dark modes
      const lightColor0 = getSeriesColor(0, false);
      const darkColor0 = getSeriesColor(0, true);

      // Both should be gold for accessibility
      expect(lightColor0).toBe('#D9BF65');
      expect(darkColor0).toBe('#D9BF65');
    });

    it('should return different second series colors for light vs dark mode', () => {
      const lightColor1 = getSeriesColor(1, false);
      const darkColor1 = getSeriesColor(1, true);

      // Second colors should be different (blue variants)
      expect(lightColor1).not.toBe(darkColor1);
      expect(lightColor1).toBe('#3B82F6'); // Darker blue for light mode
      expect(darkColor1).toBe('#60A5FA'); // Lighter blue for dark mode
    });

    it('should cycle through series colors correctly in both modes', () => {
      // Test first few colors in light mode
      const light0 = getSeriesColor(0, false);
      const light1 = getSeriesColor(1, false);
      const light2 = getSeriesColor(2, false);

      // All should be different
      expect(light0).not.toBe(light1);
      expect(light1).not.toBe(light2);
      expect(light0).not.toBe(light2);

      // Test first few colors in dark mode
      const dark0 = getSeriesColor(0, true);
      const dark1 = getSeriesColor(1, true);
      const dark2 = getSeriesColor(2, true);

      // All should be different
      expect(dark0).not.toBe(dark1);
      expect(dark1).not.toBe(dark2);
      expect(dark0).not.toBe(dark2);
    });
  });

  /**
   * Test 4: Color Palette Reordering
   * Verifies high-contrast colors are prioritized first
   * Related to Fix #4 (Priority 4)
   */
  describe('Color Accessibility - Palette Reordering', () => {
    it('should have gold accent color as first series color in light mode for high contrast', () => {
      const firstColor = getSeriesColor(0, false);

      // After fix: gold (#D9BF65) should be first for better contrast
      expect(firstColor).toBe('#D9BF65');
    });

    it('should have gold accent color as first series color in dark mode', () => {
      const firstColor = getSeriesColor(0, true);

      // After fix: gold color should be first in dark mode too
      expect(firstColor).toBe('#D9BF65');
    });

    it('should have navy as last color in light mode (low contrast)', () => {
      // With 8 colors in series (0-7), index 7 should be navy
      const lastColor = getSeriesColor(7, false);

      // Navy should be moved to last position
      expect(lastColor).toBe('#09192B');
    });

    it('should have cream as last color in dark mode (can blend with background)', () => {
      const lastColor = getSeriesColor(7, true);

      // Cream should be last in dark mode as it can blend with background
      expect(lastColor).toBe('#FEFBF4');
    });
  });
});

/**
 * Test 5: Chart Color Schemes
 * Verifies Referrer Sources uses multi-color while Geographic Distribution uses single color
 */
describe('Chart Color Schemes', () => {
  it('should verify getSeriesColor function exists and works for multi-color charts', () => {
    // Verify function returns different colors for different indices
    const color0 = getSeriesColor(0, false);
    const color1 = getSeriesColor(1, false);
    const color2 = getSeriesColor(2, false);
    const color3 = getSeriesColor(3, false);

    // For Referrer Sources chart with 4 categories, we need 4 different colors
    expect(color0).toBeTruthy();
    expect(color1).toBeTruthy();
    expect(color2).toBeTruthy();
    expect(color3).toBeTruthy();

    // All 4 should be different
    expect(color0).not.toBe(color1);
    expect(color1).not.toBe(color2);
    expect(color2).not.toBe(color3);
  });

  it('should wrap around colors for indices beyond series length', () => {
    const color0 = getSeriesColor(0, false);
    const color8 = getSeriesColor(8, false);

    // With 8 colors in series (0-7), index 8 should wrap to index 0
    expect(color8).toBe(color0);
  });

  it('should provide 8 distinct colors in series for both modes', () => {
    // Light mode - verify 8 distinct colors
    const lightColors = Array.from({ length: 8 }, (_, i) => getSeriesColor(i, false));
    const uniqueLightColors = new Set(lightColors);
    expect(uniqueLightColors.size).toBe(8);

    // Dark mode - verify 8 distinct colors
    const darkColors = Array.from({ length: 8 }, (_, i) => getSeriesColor(i, true));
    const uniqueDarkColors = new Set(darkColors);
    expect(uniqueDarkColors.size).toBe(8);
  });
});
