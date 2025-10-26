/**
 * End-to-End Workflow Tests for Date Range Picker and Comparison Features
 *
 * Tests critical user workflows from user action through URL updates to data refetch readiness.
 * Focuses on business logic and integration points without complex UI rendering.
 */

import {
  calculatePresetRange,
  calculatePreviousPeriod,
  formatDateRangeDisplay,
  clampDateToLimit,
  isValidDateString,
  getDefaultDateRange,
} from '@/lib/utils/date-utils';

describe('Date Range Selection Workflows', () => {
  /**
   * Workflow Test 1: Complete preset selection flow
   * User selects "Last 7 Days" → dates calculated → formatted for display → ready for URL
   */
  test('should complete full workflow: preset selection to URL-ready format', () => {
    // Step 1: User selects "Last 7 Days" preset
    const preset = 'Last 7 Days';

    // Step 2: Calculate date range
    const { from, to } = calculatePresetRange(preset);

    // Step 3: Format for display
    const displayText = formatDateRangeDisplay(from, to);

    // Step 4: Convert to URL format (YYYY-MM-DD)
    const urlFrom = from.toISOString().split('T')[0];
    const urlTo = to.toISOString().split('T')[0];

    // Verify complete workflow
    expect(from).toBeInstanceOf(Date);
    expect(to).toBeInstanceOf(Date);
    expect(displayText).toMatch(/^[A-Z][a-z]{2} \d{1,2} - [A-Z][a-z]{2} \d{1,2}$/);
    expect(isValidDateString(urlFrom)).toBe(true);
    expect(isValidDateString(urlTo)).toBe(true);
  });

  /**
   * Workflow Test 2: Comparison toggle workflow
   * User enables comparison → previous period calculated → both periods ready for data fetch
   */
  test('should calculate previous period when comparison is enabled', () => {
    // Step 1: User has current period selected (Last 7 Days)
    const { from: currentFrom, to: currentTo } = calculatePresetRange('Last 7 Days');

    // Step 2: User toggles comparison ON
    const { from: prevFrom, to: prevTo } = calculatePreviousPeriod(currentFrom, currentTo);

    // Step 3: Verify both periods are ready for data fetching
    const currentFromStr = currentFrom.toISOString().split('T')[0];
    const currentToStr = currentTo.toISOString().split('T')[0];
    const prevFromStr = prevFrom.toISOString().split('T')[0];
    const prevToStr = prevTo.toISOString().split('T')[0];

    expect(isValidDateString(currentFromStr)).toBe(true);
    expect(isValidDateString(currentToStr)).toBe(true);
    expect(isValidDateString(prevFromStr)).toBe(true);
    expect(isValidDateString(prevToStr)).toBe(true);

    // Verify previous period ends before current period starts
    expect(prevTo.getTime()).toBeLessThan(currentFrom.getTime());
  });

  /**
   * Workflow Test 3: Invalid URL parameter fallback
   * User arrives with invalid URL parameters → fallback to default "Last 7 Days"
   */
  test('should fallback to default when URL parameters are invalid', () => {
    // Step 1: Simulate invalid URL parameters
    const invalidFrom = '2025-13-45'; // Invalid month and day
    const invalidTo = 'not-a-date';

    // Step 2: Validate parameters
    const isFromValid = isValidDateString(invalidFrom);
    const isToValid = isValidDateString(invalidTo);

    // Step 3: Both invalid → use default
    if (!isFromValid || !isToValid) {
      const defaultRange = getDefaultDateRange();

      expect(defaultRange).toHaveProperty('from');
      expect(defaultRange).toHaveProperty('to');
      expect(isValidDateString(defaultRange.from)).toBe(true);
      expect(isValidDateString(defaultRange.to)).toBe(true);
    }
  });

  /**
   * Workflow Test 4: Date clamping in workflow
   * User tries to select date beyond 2-year limit → date clamped → workflow continues
   */
  test('should clamp dates beyond 2-year limit and continue workflow', () => {
    // Step 1: User tries to select very old date (5 years ago)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // Step 2: Date is clamped to 2-year limit
    const clampedDate = clampDateToLimit(fiveYearsAgo);

    // Step 3: Verify clamped date is within allowed range
    const today = new Date();
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    expect(clampedDate.getTime()).toBeGreaterThanOrEqual(twoYearsAgo.getTime());
    expect(clampedDate.getTime()).toBeLessThanOrEqual(today.getTime());

    // Step 4: Clamped date can be used in workflow
    const urlDate = clampedDate.toISOString().split('T')[0];
    expect(isValidDateString(urlDate)).toBe(true);
  });

  /**
   * Workflow Test 5: Multiple preset changes
   * User changes presets multiple times → each change produces valid dates
   */
  test('should handle rapid preset changes correctly', () => {
    const presets: Array<'Today' | 'Last 7 Days' | 'Last 30 Days' | 'This Month'> = [
      'Today',
      'Last 7 Days',
      'Last 30 Days',
      'This Month',
    ];

    presets.forEach((preset) => {
      const { from, to } = calculatePresetRange(preset);

      // Each preset should produce valid dates
      expect(from).toBeInstanceOf(Date);
      expect(to).toBeInstanceOf(Date);
      expect(from.getTime()).toBeLessThanOrEqual(to.getTime());

      // Dates should be convertible to URL format
      const urlFrom = from.toISOString().split('T')[0];
      const urlTo = to.toISOString().split('T')[0];
      expect(isValidDateString(urlFrom)).toBe(true);
      expect(isValidDateString(urlTo)).toBe(true);
    });
  });
});
