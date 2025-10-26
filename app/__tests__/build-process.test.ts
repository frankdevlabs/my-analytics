/**
 * Focused tests for build process
 * Testing critical outcomes: minified file exists, bundle size < 3KB, script validity
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Build Process Critical Checks', () => {
  const publicDir = path.join(__dirname, '../public');
  const trackerPath = path.join(publicDir, 'tracker.js');
  const minifiedPath = path.join(publicDir, 'tracker.min.js');

  describe('Minified File Generation', () => {
    test('should generate tracker.min.js file', () => {
      expect(fs.existsSync(minifiedPath)).toBe(true);
    });

    test('should contain minified JavaScript code', () => {
      const content = fs.readFileSync(minifiedPath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
      // Should start with comment and IIFE
      expect(content).toMatch(/^\/\*/);
      expect(content).toContain('function');
    });
  });

  describe('Bundle Size Constraint', () => {
    test('should be less than 3KB (3072 bytes)', () => {
      const stats = fs.statSync(minifiedPath);
      const sizeInBytes = stats.size;
      const maxSize = 3072; // 3KB

      expect(sizeInBytes).toBeLessThan(maxSize);

      // Log actual size for visibility
      console.log(`Minified bundle size: ${sizeInBytes} bytes (${(sizeInBytes / 1024).toFixed(2)} KB)`);
    });

    test('should achieve significant compression ratio', () => {
      const originalStats = fs.statSync(trackerPath);
      const minifiedStats = fs.statSync(minifiedPath);

      const compressionRatio = 1 - (minifiedStats.size / originalStats.size);

      // Should compress by at least 50%
      expect(compressionRatio).toBeGreaterThan(0.5);

      console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);
    });
  });

  describe('Script Validity', () => {
    test('should be valid JavaScript without syntax errors', () => {
      const content = fs.readFileSync(minifiedPath, 'utf8');

      // Should not throw syntax error when evaluated
      expect(() => {
        new Function(content);
      }).not.toThrow();
    });

    test('should include version comment in preamble', () => {
      const content = fs.readFileSync(minifiedPath, 'utf8');
      expect(content).toMatch(/Privacy-First Analytics Tracker/);
      expect(content).toMatch(/v1\.0\.0/);
    });
  });

  describe('Original Tracker File', () => {
    test('should have unminified source file', () => {
      expect(fs.existsSync(trackerPath)).toBe(true);

      const stats = fs.statSync(trackerPath);
      expect(stats.size).toBeGreaterThan(1000);
    });
  });
});
