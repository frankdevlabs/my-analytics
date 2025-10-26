import { getRetentionMonths, getRetentionCutoffDate } from '../retention';

describe('Retention Configuration', () => {
  const originalEnv = process.env.DATA_RETENTION_MONTHS;

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.DATA_RETENTION_MONTHS = originalEnv;
    } else {
      delete process.env.DATA_RETENTION_MONTHS;
    }
  });

  describe('getRetentionMonths', () => {
    it('should return default 24 months when environment variable not set', () => {
      delete process.env.DATA_RETENTION_MONTHS;

      const result = getRetentionMonths();

      expect(result).toBe(24);
    });

    it('should return custom retention period from environment variable', () => {
      process.env.DATA_RETENTION_MONTHS = '12';

      const result = getRetentionMonths();

      expect(result).toBe(12);
    });

    it('should return default for invalid non-numeric value', () => {
      process.env.DATA_RETENTION_MONTHS = 'invalid';

      const result = getRetentionMonths();

      expect(result).toBe(24);
    });

    it('should return default for negative value', () => {
      process.env.DATA_RETENTION_MONTHS = '-5';

      const result = getRetentionMonths();

      expect(result).toBe(24);
    });

    it('should return default for zero value', () => {
      process.env.DATA_RETENTION_MONTHS = '0';

      const result = getRetentionMonths();

      expect(result).toBe(24);
    });

    it('should handle large retention periods', () => {
      process.env.DATA_RETENTION_MONTHS = '60';

      const result = getRetentionMonths();

      expect(result).toBe(60);
    });
  });

  describe('getRetentionCutoffDate', () => {
    it('should return date 24 months ago by default', () => {
      delete process.env.DATA_RETENTION_MONTHS;

      const result = getRetentionCutoffDate();
      const expected = new Date();
      expected.setMonth(expected.getMonth() - 24);

      // Check year and month match (ignore day/time for flexibility)
      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
    });

    it('should return date based on custom retention period', () => {
      process.env.DATA_RETENTION_MONTHS = '12';

      const result = getRetentionCutoffDate();
      const expected = new Date();
      expected.setMonth(expected.getMonth() - 12);

      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
    });

    it('should return date in the past', () => {
      const result = getRetentionCutoffDate();
      const now = new Date();

      expect(result.getTime()).toBeLessThan(now.getTime());
    });
  });
});
