/**
 * Date Utilities Tests
 *
 * Tests critical date handling behaviors for dashboard date range functionality.
 * Covers: default date range calculation, format validation, and date conversion.
 */

import {
  isValidDateString,
  getDefaultDateRange,
  convertToDateObject
} from './date-utils';

describe('Date Utilities', () => {
  /**
   * Test 1: Default date range returns last 7 days
   */
  test('getDefaultDateRange returns last 7 days from current date', () => {
    const result = getDefaultDateRange();

    expect(result).toHaveProperty('from');
    expect(result).toHaveProperty('to');

    // Validate format is YYYY-MM-DD
    expect(result.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify date range is approximately 7 days (allow for timing variations)
    const fromDate = new Date(result.from);
    const toDate = new Date(result.to);
    const diffInDays = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    expect(diffInDays).toBe(7);
  });

  /**
   * Test 2: Valid YYYY-MM-DD format validation passes
   */
  test('isValidDateString accepts valid YYYY-MM-DD format', () => {
    expect(isValidDateString('2025-01-15')).toBe(true);
    expect(isValidDateString('2024-12-31')).toBe(true);
    expect(isValidDateString('2025-10-24')).toBe(true);
  });

  /**
   * Test 3: Invalid date format rejection
   */
  test('isValidDateString rejects invalid date formats', () => {
    expect(isValidDateString('2025-1-5')).toBe(false);        // Missing leading zeros
    expect(isValidDateString('01/15/2025')).toBe(false);      // Wrong format
    expect(isValidDateString('2025-13-01')).toBe(false);      // Invalid month
    expect(isValidDateString('2025-02-30')).toBe(false);      // Invalid day
    expect(isValidDateString('not-a-date')).toBe(false);      // Not a date
    expect(isValidDateString('')).toBe(false);                // Empty string
  });

  /**
   * Test 4: Date conversion to Date object
   */
  test('convertToDateObject safely converts valid string to Date', () => {
    const dateStr = '2025-01-15';
    const result = convertToDateObject(dateStr);

    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString().split('T')[0]).toBe(dateStr);
  });

  /**
   * Test 5: Date conversion handles invalid input
   */
  test('convertToDateObject returns null for invalid date string', () => {
    expect(convertToDateObject('invalid')).toBeNull();
    expect(convertToDateObject('2025-13-45')).toBeNull();
    expect(convertToDateObject('')).toBeNull();
  });

  /**
   * Test 6: Date comparison - from date should be before to date
   */
  test('default date range has from date before to date', () => {
    const { from, to } = getDefaultDateRange();
    const fromDate = new Date(from);
    const toDate = new Date(to);

    expect(fromDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
  });
});
