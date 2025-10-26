/**
 * Tests for Browser Major Version Extraction Utility
 *
 * Tests the extractMajorVersion function to ensure correct extraction of major version
 * numbers from browser version strings for cleaner analytics display.
 *
 * Task Group 2: User Agent Parsing Enhancement - Unit Tests
 */

import { extractMajorVersion } from '../extract-major-version';

describe('extractMajorVersion', () => {
  describe('Standard version formats', () => {
    it('should extract major version from standard Chrome version', () => {
      expect(extractMajorVersion('120.0.6099.109')).toBe('120');
    });

    it('should extract major version from Safari version', () => {
      expect(extractMajorVersion('17.1')).toBe('17');
    });

    it('should extract major version from single digit version', () => {
      expect(extractMajorVersion('10')).toBe('10');
    });

    it('should extract major version from multi-segment version', () => {
      expect(extractMajorVersion('1.2.3.4.5')).toBe('1');
    });
  });

  describe('Edge cases and null handling', () => {
    it('should return null for null input', () => {
      expect(extractMajorVersion(null)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractMajorVersion('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(extractMajorVersion('   ')).toBeNull();
    });

    it('should return null for non-numeric version', () => {
      expect(extractMajorVersion('Safari')).toBeNull();
    });

    it('should return null for alphanumeric version', () => {
      expect(extractMajorVersion('1a.2.3')).toBeNull();
    });

    it('should handle version with leading/trailing spaces', () => {
      expect(extractMajorVersion('  120.0.6099.109  ')).toBe('120');
    });
  });

  describe('Real-world browser versions', () => {
    it('should handle Firefox version', () => {
      expect(extractMajorVersion('121.0')).toBe('121');
    });

    it('should handle Edge version', () => {
      expect(extractMajorVersion('120.0.2210.144')).toBe('120');
    });

    it('should handle Opera version', () => {
      expect(extractMajorVersion('105.0.4970.48')).toBe('105');
    });
  });
});
