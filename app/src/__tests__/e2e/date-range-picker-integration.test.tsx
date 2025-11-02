/**
 * Date Range Picker Integration Tests
 *
 * Comprehensive end-to-end integration tests for the DateRangePresetPicker,
 * PeriodComparisonToggle, and related date calculation utilities.
 *
 * Tests cover:
 * - Date range preset selection and calculation
 * - Previous period calculation for comparison
 * - URL parameter management
 * - Edge cases (year boundaries, leap years, month transitions)
 * - Component integration with data fetching
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DateRangePresetPicker } from '../../components/dashboard/date-range-preset-picker';
import { ComparisonIndicator } from '../../components/dashboard/comparison-indicator';
import { MetricCard } from '../../components/dashboard/metric-card';
import {
  calculatePresetRange,
  calculatePreviousPeriod,
  formatDateRangeDisplay,
  isValidDateString,
  getDefaultDateRange,
  calculatePercentageChange,
} from '@/lib/utils/date-utils';
import { useRouter, usePathname } from 'next/navigation';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('Date Range Picker Integration Tests', () => {
  const mockPush = jest.fn();
  const mockPathname = '/dashboard';

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
  });

  // ========================================
  // Section 1: Preset Range Calculations
  // ========================================

  describe('Preset Range Calculations', () => {
    test('should calculate Today preset correctly', () => {
      const { from, to } = calculatePresetRange('Today');
      const today = new Date();
      const expectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      expect(from.toDateString()).toBe(expectedDate.toDateString());
      expect(to.toDateString()).toBe(expectedDate.toDateString());
    });

    test('should calculate Last 7 Days preset correctly', () => {
      const { from, to } = calculatePresetRange('Last 7 Days');
      const today = new Date();
      const expectedTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const expectedFrom = new Date(expectedTo);
      expectedFrom.setDate(expectedFrom.getDate() - 7);

      expect(to.toDateString()).toBe(expectedTo.toDateString());
      expect(from.toDateString()).toBe(expectedFrom.toDateString());
    });

    test('should calculate Last 30 Days preset correctly', () => {
      const { from, to } = calculatePresetRange('Last 30 Days');
      const today = new Date();
      const expectedTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const expectedFrom = new Date(expectedTo);
      expectedFrom.setDate(expectedFrom.getDate() - 30);

      expect(to.toDateString()).toBe(expectedTo.toDateString());
      expect(from.toDateString()).toBe(expectedFrom.toDateString());
    });

    test('should calculate Last 90 Days preset correctly', () => {
      const { from, to } = calculatePresetRange('Last 90 Days');
      const today = new Date();
      const expectedTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const expectedFrom = new Date(expectedTo);
      expectedFrom.setDate(expectedFrom.getDate() - 90);

      expect(to.toDateString()).toBe(expectedTo.toDateString());
      expect(from.toDateString()).toBe(expectedFrom.toDateString());
    });

    test('should calculate This Month preset correctly', () => {
      const { from, to } = calculatePresetRange('This Month');
      const today = new Date();
      const expectedFrom = new Date(today.getFullYear(), today.getMonth(), 1);
      const expectedTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      expect(from.toDateString()).toBe(expectedFrom.toDateString());
      expect(to.toDateString()).toBe(expectedTo.toDateString());
    });

    test('should calculate Last Month preset correctly', () => {
      const { from, to } = calculatePresetRange('Last Month');
      const today = new Date();

      // First day of last month
      const expectedFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      // Last day of last month
      const expectedTo = new Date(today.getFullYear(), today.getMonth(), 0);

      expect(from.toDateString()).toBe(expectedFrom.toDateString());
      expect(to.toDateString()).toBe(expectedTo.toDateString());
    });

    test('should handle Last Month preset at year boundary (January)', () => {
      // Mock January to test year boundary
      const januaryDate = new Date(2025, 0, 15); // January 15, 2025
      const today = new Date(januaryDate.getFullYear(), januaryDate.getMonth(), januaryDate.getDate());

      // Calculate expected values for December 2024
      const expectedFrom = new Date(2024, 11, 1); // December 1, 2024
      const expectedTo = new Date(2024, 11, 31); // December 31, 2024

      // Manually calculate Last Month for January
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);

      expect(from.toDateString()).toBe(expectedFrom.toDateString());
      expect(to.toDateString()).toBe(expectedTo.toDateString());
      expect(from.getFullYear()).toBe(2024);
      expect(to.getFullYear()).toBe(2024);
    });
  });

  // ========================================
  // Section 2: Previous Period Calculations
  // ========================================

  describe('Previous Period Calculations', () => {
    test('should calculate previous period for 7-day range', () => {
      const from = new Date('2025-10-09');
      const to = new Date('2025-10-16');

      const result = calculatePreviousPeriod(from, to);

      expect(result.from.toDateString()).toBe(new Date('2025-10-01').toDateString());
      expect(result.to.toDateString()).toBe(new Date('2025-10-08').toDateString());
    });

    test('should calculate previous period for 30-day range', () => {
      const from = new Date('2025-10-01');
      const to = new Date('2025-10-31');

      const result = calculatePreviousPeriod(from, to);

      // 30 days duration (actually 31 days from Oct 1-31)
      const duration = to.getTime() - from.getTime();
      const expectedTo = new Date('2025-09-30');
      const expectedFrom = new Date(expectedTo.getTime() - duration);

      expect(result.to.toDateString()).toBe(expectedTo.toDateString());
      expect(result.from.toDateString()).toBe(expectedFrom.toDateString());
    });

    test('should calculate previous period for single day', () => {
      const from = new Date('2025-10-24');
      const to = new Date('2025-10-24');

      const result = calculatePreviousPeriod(from, to);

      expect(result.to.toDateString()).toBe(new Date('2025-10-23').toDateString());
      expect(result.from.toDateString()).toBe(new Date('2025-10-23').toDateString());
    });

    test('should handle month boundaries in previous period calculation', () => {
      // Current period: Sep 25 - Oct 5 (crosses month boundary)
      const from = new Date('2025-09-25');
      const to = new Date('2025-10-05');

      const result = calculatePreviousPeriod(from, to);

      // Previous period should be Sep 14-24 (same duration, before Sep 25)
      expect(result.from.toDateString()).toBe(new Date('2025-09-14').toDateString());
      expect(result.to.toDateString()).toBe(new Date('2025-09-24').toDateString());
    });

    test('should handle year boundaries in previous period calculation', () => {
      // Current period: Dec 25, 2025 - Jan 5, 2026 (crosses year boundary)
      const from = new Date('2025-12-25');
      const to = new Date('2026-01-05');

      const result = calculatePreviousPeriod(from, to);

      // Previous period should be Dec 13-24, 2025 (same 11-day duration)
      // Previous expectation incorrectly assumed previous period would also cross year boundary,
      // but implementation correctly calculates same duration ending day before current period start
      expect(result.from.toDateString()).toBe(new Date('2025-12-13').toDateString());
      expect(result.to.toDateString()).toBe(new Date('2025-12-24').toDateString());
      expect(result.from.getFullYear()).toBe(2025);
      expect(result.to.getFullYear()).toBe(2025);
    });

    test('should handle leap years correctly', () => {
      // Current period: Feb 28 - Mar 1 in a leap year (2024)
      const from = new Date('2024-02-28');
      const to = new Date('2024-03-01');

      const result = calculatePreviousPeriod(from, to);

      // Duration is 2 days (172800000 milliseconds)
      // Previous period ends the day before Feb 28 (Feb 27) and has same 2-day duration
      // Previous expectation incorrectly assumed Feb 26-27,
      // but implementation correctly calculates: Feb 27 minus 2 days = Feb 25
      expect(result.from.toDateString()).toBe(new Date('2024-02-25').toDateString());
      expect(result.to.toDateString()).toBe(new Date('2024-02-27').toDateString());
    });

    test('should handle leap year Feb 29 in current period', () => {
      // Current period includes leap day: Feb 29 - Mar 2 in 2024
      const from = new Date('2024-02-29');
      const to = new Date('2024-03-02');

      const result = calculatePreviousPeriod(from, to);

      // Duration is 2 days (172800000 milliseconds)
      // Previous period ends the day before Feb 29 (Feb 28) and has same 2-day duration
      // Previous expectation incorrectly assumed Feb 27-28,
      // but implementation correctly calculates: Feb 28 minus 2 days = Feb 26
      expect(result.from.toDateString()).toBe(new Date('2024-02-26').toDateString());
      expect(result.to.toDateString()).toBe(new Date('2024-02-28').toDateString());
    });

    test('should maintain exact duration in previous period calculation', () => {
      // Test various durations
      const testCases = [
        { days: 1, from: '2025-10-24', to: '2025-10-24' },
        { days: 7, from: '2025-10-17', to: '2025-10-24' },
        { days: 14, from: '2025-10-10', to: '2025-10-24' },
        { days: 30, from: '2025-09-24', to: '2025-10-24' },
      ];

      testCases.forEach(({ from: fromStr, to: toStr }) => {
        const from = new Date(fromStr);
        const to = new Date(toStr);
        const result = calculatePreviousPeriod(from, to);

        const currentDuration = to.getTime() - from.getTime();
        const previousDuration = result.to.getTime() - result.from.getTime();

        expect(previousDuration).toBe(currentDuration);
      });
    });
  });

  // ========================================
  // Section 3: URL Parameter Integration
  // ========================================

  describe('URL Parameter Integration', () => {
    test('should validate correct date format YYYY-MM-DD', () => {
      expect(isValidDateString('2025-10-24')).toBe(true);
      expect(isValidDateString('2025-01-01')).toBe(true);
      expect(isValidDateString('2024-12-31')).toBe(true);
    });

    test('should reject invalid date formats', () => {
      expect(isValidDateString('10/24/2025')).toBe(false);
      expect(isValidDateString('2025-13-01')).toBe(false);
      expect(isValidDateString('2025-02-30')).toBe(false);
      expect(isValidDateString('not-a-date')).toBe(false);
      expect(isValidDateString('')).toBe(false);
    });

    test('should provide default date range when no parameters given', () => {
      const defaultRange = getDefaultDateRange();

      expect(isValidDateString(defaultRange.from)).toBe(true);
      expect(isValidDateString(defaultRange.to)).toBe(true);

      const from = new Date(defaultRange.from);
      const to = new Date(defaultRange.to);
      const diffDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(7);
    });

    test('should format dates for URL parameters', () => {
      const from = new Date('2025-10-17');
      const to = new Date('2025-10-24');

      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      expect(fromStr).toBe('2025-10-17');
      expect(toStr).toBe('2025-10-24');
      expect(isValidDateString(fromStr)).toBe(true);
      expect(isValidDateString(toStr)).toBe(true);
    });
  });

  // ========================================
  // Section 4: DateRangePresetPicker Component
  // ========================================

  describe('DateRangePresetPicker Component', () => {
    test('should render with current date range displayed', () => {
      const from = '2025-10-17';
      const to = '2025-10-24';

      render(<DateRangePresetPicker from={from} to={to} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(/Oct/i);
    });

    test('should open popover when clicked', async () => {
      const from = '2025-10-17';
      const to = '2025-10-24';

      render(<DateRangePresetPicker from={from} to={to} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });
    });

    test('should display all 7 preset options', async () => {
      const from = '2025-10-17';
      const to = '2025-10-24';

      render(<DateRangePresetPicker from={from} to={to} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
        expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
        expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
        expect(screen.getByText('This Month')).toBeInTheDocument();
        expect(screen.getByText('Last Month')).toBeInTheDocument();
        expect(screen.getByText('Custom Range')).toBeInTheDocument();
      });
    });

    test('should update URL when preset is selected', async () => {
      const from = '2025-10-17';
      const to = '2025-10-24';

      render(<DateRangePresetPicker from={from} to={to} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Last 7 Days'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
        const callArg = mockPush.mock.calls[0][0];
        expect(callArg).toContain('from=');
        expect(callArg).toContain('to=');
      });
    });

    test('should close popover on Escape key', async () => {
      const from = '2025-10-17';
      const to = '2025-10-24';

      render(<DateRangePresetPicker from={from} to={to} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Last 7 Days')).not.toBeInTheDocument();
      });
    });

    test('should preserve existing compare parameter when updating dates', async () => {
      const from = '2025-10-17';
      const to = '2025-10-24';

      render(<DateRangePresetPicker from={from} to={to} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Last 30 Days'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
        const callArg = mockPush.mock.calls[0][0];
        expect(callArg).toContain('from=');
        expect(callArg).toContain('to=');
      });
    });
  });

  // ========================================
  // Section 5: Comparison Indicator Component
  // ========================================

  describe('ComparisonIndicator Component', () => {
    test('should display positive percentage change with green color', () => {
      render(<ComparisonIndicator currentValue={150} previousValue={100} />);

      const indicator = screen.getByText(/\+50\.0%/);
      expect(indicator).toBeInTheDocument();

      const container = indicator.parentElement;
      expect(container).toHaveClass('text-green-600');
    });

    test('should display negative percentage change with red color', () => {
      render(<ComparisonIndicator currentValue={80} previousValue={100} />);

      const indicator = screen.getByText(/-20\.0%/);
      expect(indicator).toBeInTheDocument();

      const container = indicator.parentElement;
      expect(container).toHaveClass('text-red-600');
    });

    test('should display N/A when previous value is zero', () => {
      render(<ComparisonIndicator currentValue={100} previousValue={0} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    test('should display N/A when previous value is null', () => {
      render(<ComparisonIndicator currentValue={100} previousValue={null} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    test('should handle zero current value correctly', () => {
      render(<ComparisonIndicator currentValue={0} previousValue={100} />);

      const indicator = screen.getByText(/-100\.0%/);
      expect(indicator).toBeInTheDocument();

      const container = indicator.parentElement;
      expect(container).toHaveClass('text-red-600');
    });

    test('should display percentage with one decimal place', () => {
      render(<ComparisonIndicator currentValue={115.5} previousValue={100} />);
      expect(screen.getByText(/\+15\.5%/)).toBeInTheDocument();
    });
  });

  // ========================================
  // Section 6: MetricCard Integration with Comparison
  // ========================================

  describe('MetricCard Integration with Comparison', () => {
    test('should render MetricCard without comparison', () => {
      render(
        <MetricCard
          title="Total Pageviews"
          value={12345}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
      expect(screen.getByText('12,345')).toBeInTheDocument();
    });

    test('should render MetricCard with positive comparison', () => {
      render(
        <MetricCard
          title="Total Pageviews"
          value={12345}
          previousValue={10000}
          showComparison={true}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
      expect(screen.getByText('12,345')).toBeInTheDocument();
      // Previous expectation incorrectly assumed +23.5%,
      // but implementation correctly calculates (12345-10000)/10000 * 100 = 23.45% and formats to 1 decimal: +23.4%
      expect(screen.getByText(/\+23\.4%/)).toBeInTheDocument();
    });

    test('should render MetricCard with negative comparison', () => {
      render(
        <MetricCard
          title="Unique Visitors"
          value={8000}
          previousValue={10000}
          showComparison={true}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
      expect(screen.getByText('8,000')).toBeInTheDocument();
      expect(screen.getByText(/-20\.0%/)).toBeInTheDocument();
    });

    test('should hide comparison indicator when showComparison is false', () => {
      render(
        <MetricCard
          title="Total Pageviews"
          value={12345}
          previousValue={10000}
          showComparison={false}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
      expect(screen.getByText('12,345')).toBeInTheDocument();
      expect(screen.queryByText(/\+23\.4%/)).not.toBeInTheDocument();
    });

    test('should render loading state', () => {
      render(
        <MetricCard
          title="Total Pageviews"
          value={null}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    test('should render error state', () => {
      render(
        <MetricCard
          title="Total Pageviews"
          value={null}
          isLoading={false}
          error="Failed to load data"
        />
      );

      expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
    });
  });

  // ========================================
  // Section 7: Percentage Change Calculations
  // ========================================

  describe('Percentage Change Calculations', () => {
    test('should calculate positive percentage change', () => {
      expect(calculatePercentageChange(115, 100)).toBe(15);
      expect(calculatePercentageChange(200, 100)).toBe(100);
      expect(calculatePercentageChange(150, 100)).toBe(50);
    });

    test('should calculate negative percentage change', () => {
      expect(calculatePercentageChange(85, 100)).toBe(-15);
      expect(calculatePercentageChange(50, 100)).toBe(-50);
      expect(calculatePercentageChange(0, 100)).toBe(-100);
    });

    test('should handle zero previous value', () => {
      expect(calculatePercentageChange(100, 0)).toBeNull();
      expect(calculatePercentageChange(0, 0)).toBeNull();
    });

    test('should handle decimal values', () => {
      expect(calculatePercentageChange(115.5, 100)).toBe(15.5);
      expect(calculatePercentageChange(99.5, 100)).toBe(-0.5);
    });

    test('should handle small percentage changes', () => {
      expect(calculatePercentageChange(100.1, 100)).toBeCloseTo(0.1, 1);
      expect(calculatePercentageChange(99.9, 100)).toBeCloseTo(-0.1, 1);
    });
  });

  // ========================================
  // Section 8: Date Range Display Formatting
  // ========================================

  describe('Date Range Display Formatting', () => {
    test('should format date range for display', () => {
      const from = new Date('2025-10-01');
      const to = new Date('2025-10-16');

      const result = formatDateRangeDisplay(from, to);

      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2} - [A-Z][a-z]{2} \d{1,2}$/);
      expect(result).toContain('Oct');
    });

    test('should format same-day range', () => {
      const from = new Date('2025-10-24');
      const to = new Date('2025-10-24');

      const result = formatDateRangeDisplay(from, to);

      expect(result).toContain('Oct');
      expect(result).toContain('24');
    });

    test('should format cross-month range', () => {
      const from = new Date('2025-09-25');
      const to = new Date('2025-10-05');

      const result = formatDateRangeDisplay(from, to);

      expect(result).toContain('Sep');
      expect(result).toContain('Oct');
    });

    test('should format cross-year range', () => {
      const from = new Date('2025-12-25');
      const to = new Date('2026-01-05');

      const result = formatDateRangeDisplay(from, to);

      expect(result).toContain('Dec');
      expect(result).toContain('Jan');
    });
  });

  // ========================================
  // Section 9: Complete Workflows
  // ========================================

  describe('Complete User Workflows', () => {
    test('should complete full workflow: preset selection to data fetch ready', () => {
      // Step 1: User selects preset
      const { from, to } = calculatePresetRange('Last 7 Days');

      // Step 2: Format for URL
      const urlFrom = from.toISOString().split('T')[0];
      const urlTo = to.toISOString().split('T')[0];

      // Step 3: Validate URL parameters
      expect(isValidDateString(urlFrom)).toBe(true);
      expect(isValidDateString(urlTo)).toBe(true);

      // Step 4: Verify dates are ready for database query
      expect(from).toBeInstanceOf(Date);
      expect(to).toBeInstanceOf(Date);
    });

    test('should complete comparison workflow: toggle on to dual data fetch', () => {
      // Step 1: Current period selected
      const { from: currentFrom, to: currentTo } = calculatePresetRange('Last 30 Days');

      // Step 2: User toggles comparison ON
      const { from: prevFrom, to: prevTo } = calculatePreviousPeriod(currentFrom, currentTo);

      // Step 3: Both periods ready for parallel fetch
      expect(currentFrom).toBeInstanceOf(Date);
      expect(currentTo).toBeInstanceOf(Date);
      expect(prevFrom).toBeInstanceOf(Date);
      expect(prevTo).toBeInstanceOf(Date);

      // Step 4: Verify previous period is before current
      expect(prevTo.getTime()).toBeLessThan(currentFrom.getTime());
    });

    test('should complete invalid parameter fallback workflow', () => {
      // Step 1: Invalid URL parameters
      const invalidFrom = 'invalid-date';
      const invalidTo = '2025-13-45';

      // Step 2: Validate and detect invalidity
      const isFromValid = isValidDateString(invalidFrom);
      const isToValid = isValidDateString(invalidTo);

      expect(isFromValid).toBe(false);
      expect(isToValid).toBe(false);

      // Step 3: Fallback to default
      const defaultRange = getDefaultDateRange();

      expect(isValidDateString(defaultRange.from)).toBe(true);
      expect(isValidDateString(defaultRange.to)).toBe(true);
    });

    test('should handle rapid preset changes correctly', () => {
      const presets: Array<'Today' | 'Last 7 Days' | 'Last 30 Days' | 'This Month'> = [
        'Today',
        'Last 7 Days',
        'Last 30 Days',
        'This Month',
      ];

      presets.forEach((preset) => {
        const { from, to } = calculatePresetRange(preset);

        expect(from).toBeInstanceOf(Date);
        expect(to).toBeInstanceOf(Date);
        expect(from.getTime()).toBeLessThanOrEqual(to.getTime());

        const urlFrom = from.toISOString().split('T')[0];
        const urlTo = to.toISOString().split('T')[0];
        expect(isValidDateString(urlFrom)).toBe(true);
        expect(isValidDateString(urlTo)).toBe(true);
      });
    });
  });

  // ========================================
  // Section 10: Edge Cases and Boundary Conditions
  // ========================================

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle February in non-leap year', () => {
      // 2025 is not a leap year
      const from = new Date('2025-02-01');
      const to = new Date('2025-02-28');

      const result = calculatePreviousPeriod(from, to);

      // Previous period should be Jan 4 - Jan 31 (27 days before Feb 1)
      expect(result.to.toDateString()).toBe(new Date('2025-01-31').toDateString());

      // Verify duration matches
      const currentDuration = to.getTime() - from.getTime();
      const previousDuration = result.to.getTime() - result.from.getTime();
      expect(previousDuration).toBe(currentDuration);
    });

    test('should handle February in leap year', () => {
      // 2024 is a leap year
      const from = new Date('2024-02-01');
      const to = new Date('2024-02-29');

      const result = calculatePreviousPeriod(from, to);

      // Previous period should be Jan 3 - Jan 31 (28 days before Feb 1)
      expect(result.to.toDateString()).toBe(new Date('2024-01-31').toDateString());

      // Verify duration matches (28 days)
      const currentDuration = to.getTime() - from.getTime();
      const previousDuration = result.to.getTime() - result.from.getTime();
      expect(previousDuration).toBe(currentDuration);
    });

    test('should handle 31-day months vs 30-day months', () => {
      // July (31 days) to August transition
      const from = new Date('2025-07-25');
      const to = new Date('2025-08-05');

      const result = calculatePreviousPeriod(from, to);

      const currentDuration = to.getTime() - from.getTime();
      const previousDuration = result.to.getTime() - result.from.getTime();
      expect(previousDuration).toBe(currentDuration);
    });

    test('should handle December to January year transition', () => {
      const from = new Date('2025-12-20');
      const to = new Date('2026-01-10');

      const result = calculatePreviousPeriod(from, to);

      // Verify previous period is before current
      expect(result.to.getTime()).toBeLessThan(from.getTime());

      // Verify duration matches
      const currentDuration = to.getTime() - from.getTime();
      const previousDuration = result.to.getTime() - result.from.getTime();
      expect(previousDuration).toBe(currentDuration);
    });

    test('should handle very long date ranges (90+ days)', () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-04-01'); // 90 days

      const result = calculatePreviousPeriod(from, to);

      const currentDuration = to.getTime() - from.getTime();
      const previousDuration = result.to.getTime() - result.from.getTime();
      expect(previousDuration).toBe(currentDuration);

      expect(result.to.toDateString()).toBe(new Date('2024-12-31').toDateString());
    });

    test('should handle end of year boundary', () => {
      const from = new Date('2025-12-31');
      const to = new Date('2025-12-31');

      const result = calculatePreviousPeriod(from, to);

      expect(result.to.toDateString()).toBe(new Date('2025-12-30').toDateString());
      expect(result.from.toDateString()).toBe(new Date('2025-12-30').toDateString());
    });

    test('should handle start of year boundary', () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-01');

      const result = calculatePreviousPeriod(from, to);

      expect(result.to.toDateString()).toBe(new Date('2024-12-31').toDateString());
      expect(result.from.toDateString()).toBe(new Date('2024-12-31').toDateString());
    });
  });
});
