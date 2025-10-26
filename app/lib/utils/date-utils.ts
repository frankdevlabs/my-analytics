/**
 * Date Utility Functions
 *
 * Utilities for date validation, default date range calculation, and date format conversion
 * for dashboard URL parameters and data fetching.
 *
 * All dates are handled in UTC for consistency with database `added_iso` field.
 */

/**
 * Validates if a string matches YYYY-MM-DD format and represents a valid date
 *
 * @param dateStr - The date string to validate
 * @returns true if valid YYYY-MM-DD format and valid date, false otherwise
 *
 * @example
 * isValidDateString('2025-01-15') // returns true
 * isValidDateString('2025-13-01') // returns false (invalid month)
 * isValidDateString('01/15/2025') // returns false (wrong format)
 */
export function isValidDateString(dateStr: string): boolean {
  // Check format using regex (YYYY-MM-DD)
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  // Validate that the date is actually valid (catches invalid dates like 2025-02-30)
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Verify the date string matches the parsed date (prevents issues like 2025-02-30 becoming 2025-03-02)
  const isoString = date.toISOString().split('T')[0];
  return isoString === dateStr;
}

/**
 * Returns default date range of last 7 days from current date
 *
 * @returns Object with 'from' and 'to' date strings in YYYY-MM-DD format
 *
 * @example
 * getDefaultDateRange()
 * // returns { from: '2025-10-17', to: '2025-10-24' } (if today is 2025-10-24)
 */
export function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

/**
 * Safely converts a date string to a Date object
 *
 * @param dateStr - The date string to convert (should be YYYY-MM-DD format)
 * @returns Date object if conversion successful, null if invalid
 *
 * @example
 * convertToDateObject('2025-01-15') // returns Date object
 * convertToDateObject('invalid')    // returns null
 */
export function convertToDateObject(dateStr: string): Date | null {
  if (!isValidDateString(dateStr)) {
    return null;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Preset date range options
 */
export type DatePreset = 'Today' | 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days' | 'This Month' | 'Last Month';

/**
 * Calculates date range for preset options
 *
 * @param preset - The preset name
 * @returns Object with 'from' and 'to' Date objects
 *
 * @example
 * calculatePresetRange('Last 7 Days')
 * // returns { from: Date(...), to: Date(...) } for last 7 days
 */
export function calculatePresetRange(preset: DatePreset): { from: Date; to: Date } {
  const today = new Date();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Start of today
  let from: Date;

  switch (preset) {
    case 'Today':
      from = new Date(to);
      break;

    case 'Last 7 Days':
      from = new Date(to);
      from.setDate(from.getDate() - 7);
      break;

    case 'Last 30 Days':
      from = new Date(to);
      from.setDate(from.getDate() - 30);
      break;

    case 'Last 90 Days':
      from = new Date(to);
      from.setDate(from.getDate() - 90);
      break;

    case 'This Month':
      from = new Date(to.getFullYear(), to.getMonth(), 1); // First day of current month
      break;

    case 'Last Month':
      from = new Date(to.getFullYear(), to.getMonth() - 1, 1); // First day of previous month
      to.setMonth(to.getMonth() - 1); // Move to previous month
      to.setDate(1); // First of that month
      to.setMonth(to.getMonth() + 1); // Move to next month
      to.setDate(0); // Last day of previous month
      break;

    default:
      // Fallback to Last 7 Days
      from = new Date(to);
      from.setDate(from.getDate() - 7);
  }

  return { from, to };
}

/**
 * Calculates the previous period for comparison
 *
 * @param from - Start date of current period
 * @param to - End date of current period
 * @returns Object with 'from' and 'to' Date objects for previous period
 *
 * @example
 * // For current period Oct 9-16 (7 days)
 * calculatePreviousPeriod(new Date('2025-10-09'), new Date('2025-10-16'))
 * // returns { from: Oct 1, to: Oct 8 }
 */
export function calculatePreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  // Calculate duration in milliseconds
  const duration = to.getTime() - from.getTime();

  // Calculate previous period end as the day before current period start
  const previousTo = new Date(from);
  previousTo.setDate(previousTo.getDate() - 1);

  // Calculate previous period start
  const previousFrom = new Date(previousTo.getTime() - duration);

  return {
    from: previousFrom,
    to: previousTo,
  };
}

/**
 * Formats a date range for display
 *
 * @param from - Start date
 * @param to - End date
 * @returns Formatted string like "Oct 1 - Oct 16"
 *
 * @example
 * formatDateRangeDisplay(new Date('2025-10-01'), new Date('2025-10-16'))
 * // returns "Oct 1 - Oct 16"
 */
export function formatDateRangeDisplay(from: Date, to: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const fromStr = formatter.format(from);
  const toStr = formatter.format(to);

  return `${fromStr} - ${toStr}`;
}

/**
 * Clamps a date to the 2-year historical data limit
 *
 * @param date - The date to clamp
 * @returns Clamped date (not older than 2 years from today)
 *
 * @example
 * clampDateToLimit(new Date('2020-01-01'))
 * // returns date 2 years ago from today if input is older
 */
export function clampDateToLimit(date: Date): Date {
  const today = new Date();
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // If date is older than 2 years ago, return 2 years ago
  if (date < twoYearsAgo) {
    return twoYearsAgo;
  }

  return date;
}

/**
 * Calculates percentage change between current and previous values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change, or null if previous is zero
 *
 * @example
 * calculatePercentageChange(115, 100) // returns 15
 * calculatePercentageChange(85, 100)  // returns -15
 * calculatePercentageChange(50, 0)    // returns null (division by zero)
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  // Handle division by zero
  if (previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}
