/**
 * Tests for ImportSummary Test Data Correction (Task Group 7)
 *
 * Verifies ImportSummary interface compliance
 */

import { ImportSummary } from '../../lib/import/log-manager';

describe('ImportSummary Test Data Correction', () => {
  describe('ImportSummary interface structure', () => {
    test('ImportSummary has all required fields', () => {
      const summary: ImportSummary = {
        totalRows: 100,
        successCount: 95,
        failedCount: 5,
        skippedCount: 0,
        durationMs: 5000,
      };

      expect(summary.totalRows).toBeDefined();
      expect(summary.successCount).toBeDefined();
      expect(summary.failedCount).toBeDefined();
      expect(summary.skippedCount).toBeDefined();
      expect(summary.durationMs).toBeDefined();
    });

    test('field types match interface definition', () => {
      const summary: ImportSummary = {
        totalRows: 50,
        successCount: 45,
        failedCount: 3,
        skippedCount: 2,
        durationMs: 2500,
        batchesProcessed: 5,
        rowsPerSecond: 20,
      };

      expect(typeof summary.totalRows).toBe('number');
      expect(typeof summary.successCount).toBe('number');
      expect(typeof summary.failedCount).toBe('number');
      expect(typeof summary.skippedCount).toBe('number');
      expect(typeof summary.durationMs).toBe('number');
    });

    test('optional fields can be included', () => {
      const summary: ImportSummary = {
        totalRows: 1000,
        successCount: 980,
        failedCount: 20,
        skippedCount: 0,
        durationMs: 15000,
        batchesProcessed: 10,
        rowsPerSecond: 66,
      };

      expect(summary.batchesProcessed).toBeDefined();
      expect(summary.rowsPerSecond).toBeDefined();
    });
  });
});
