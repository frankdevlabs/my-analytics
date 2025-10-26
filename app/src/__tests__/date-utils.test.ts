/**
 * Date Utility Functions Tests
 * Focused tests for critical date calculation behaviors
 */

import {
  calculatePresetRange,
  calculatePreviousPeriod,
  formatDateRangeDisplay,
  clampDateToLimit,
  calculatePercentageChange,
} from '@/lib/utils/date-utils';

describe('Date Utilities - Critical Behaviors', () => {
  test('calculatePresetRange returns correct range for Last 7 Days', () => {
    const result = calculatePresetRange('Last 7 Days');

    // Calculate expected values
    const today = new Date();
    const expectedTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const expectedFrom = new Date(expectedTo);
    expectedFrom.setDate(expectedFrom.getDate() - 7);

    // Compare dates (ignoring time)
    expect(result.to.toDateString()).toBe(expectedTo.toDateString());
    expect(result.from.toDateString()).toBe(expectedFrom.toDateString());
  });

  test('calculatePresetRange returns correct range for This Month', () => {
    const result = calculatePresetRange('This Month');

    const today = new Date();
    const expectedFrom = new Date(today.getFullYear(), today.getMonth(), 1);
    const expectedTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    expect(result.from.toDateString()).toBe(expectedFrom.toDateString());
    expect(result.to.toDateString()).toBe(expectedTo.toDateString());
  });

  test('calculatePreviousPeriod returns correct previous period for 7-day range', () => {
    // Current period: Oct 9-16 (7 days)
    const from = new Date('2025-10-09');
    const to = new Date('2025-10-16');

    const result = calculatePreviousPeriod(from, to);

    // Previous period should be Oct 1-8
    expect(result.from.toDateString()).toBe(new Date('2025-10-01').toDateString());
    expect(result.to.toDateString()).toBe(new Date('2025-10-08').toDateString());
  });

  test('calculatePreviousPeriod handles month boundaries correctly', () => {
    // Current period: Sep 25 - Oct 5 (10 days crossing month boundary)
    const from = new Date('2025-09-25');
    const to = new Date('2025-10-05');

    const result = calculatePreviousPeriod(from, to);

    // Previous period should be Sep 14-24 (same duration, before Sep 25)
    expect(result.from.toDateString()).toBe(new Date('2025-09-14').toDateString());
    expect(result.to.toDateString()).toBe(new Date('2025-09-24').toDateString());
  });

  test('formatDateRangeDisplay returns correct format', () => {
    const from = new Date('2025-10-01');
    const to = new Date('2025-10-16');

    const result = formatDateRangeDisplay(from, to);

    // Should match "Oct 1 - Oct 16" pattern
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2} - [A-Z][a-z]{2} \d{1,2}$/);
    expect(result).toContain('Oct');
  });

  test('clampDateToLimit returns date within 2-year limit', () => {
    const oldDate = new Date('2020-01-01');

    const result = clampDateToLimit(oldDate);

    const today = new Date();
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Result should be >= 2 years ago
    expect(result.getTime()).toBeGreaterThanOrEqual(twoYearsAgo.getTime());
  });

  test('clampDateToLimit returns same date if within limit', () => {
    const recentDate = new Date('2024-01-01');

    const result = clampDateToLimit(recentDate);

    expect(result.toDateString()).toBe(recentDate.toDateString());
  });

  test('calculatePercentageChange returns correct positive change', () => {
    const result = calculatePercentageChange(115, 100);

    expect(result).toBe(15);
  });

  test('calculatePercentageChange returns correct negative change', () => {
    const result = calculatePercentageChange(85, 100);

    expect(result).toBe(-15);
  });

  test('calculatePercentageChange handles division by zero', () => {
    const result = calculatePercentageChange(50, 0);

    expect(result).toBeNull();
  });
});
