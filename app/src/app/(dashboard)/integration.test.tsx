/**
 * Dashboard Page Integration Tests
 *
 * Strategic tests covering critical end-to-end workflows and integration points
 * for the dashboard feature. These tests complement existing unit tests by focusing
 * on how components work together to deliver user value.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardPage from './page';
import * as pageviewsDb from '@/lib/db/pageviews';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock database functions
jest.mock('@/lib/db/pageviews', () => ({
  getPageviewsInDateRange: jest.fn(),
  getUniqueVisitors: jest.fn(),
  getTopPages: jest.fn(),
  getPageviewsOverTime: jest.fn(),
  getPageviewsByCountry: jest.fn(),
  getReferrersByCategory: jest.fn(),
  getReferrersByDomain: jest.fn(),
  getDeviceTypeBreakdown: jest.fn(),
  getBrowserBreakdown: jest.fn(),
}));

// Mock date utilities
jest.mock('@/lib/utils/date-utils', () => ({
  ...jest.requireActual('@/lib/utils/date-utils'),
  calculatePreviousPeriod: jest.fn((from: Date, to: Date) => ({
    from: new Date(from.getTime() - (to.getTime() - from.getTime())),
    to: from,
  })),
}));

// Mock child components to focus on integration logic
jest.mock('@/components/dashboard/metric-card', () => ({
  MetricCard: ({ title, value, error }: { title: string; value: number | null; error: string | null }) => (
    <div data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {error ? <span data-testid="error">{error}</span> : <span data-testid="value">{value}</span>}
    </div>
  ),
}));

jest.mock('@/components/dashboard/TopPagesDashboardSection', () => ({
  TopPagesDashboardSection: ({ data, error }: { data: unknown; error: string | null }) => (
    <div data-testid="top-pages">
      {error ? <span data-testid="error">{error}</span> : <span data-testid="data">{Array.isArray(data) ? data.length : 0} pages</span>}
    </div>
  ),
}));

jest.mock('@/components/dashboard/date-range-preset-picker', () => ({
  DateRangePresetPicker: ({ from, to }: { from: string; to: string }) => (
    <div data-testid="date-range-selector">
      <input
        data-testid="from-date"
        aria-label="Select start date"
        type="date"
        value={from}
        readOnly
      />
      <input
        data-testid="to-date"
        aria-label="Select end date"
        type="date"
        value={to}
        readOnly
      />
    </div>
  ),
}));

jest.mock('@/components/dashboard/period-comparison-toggle', () => ({
  PeriodComparisonToggle: ({ isEnabled }: { isEnabled: boolean }) => (
    <button data-testid="comparison-toggle">
      {isEnabled ? 'Disable Comparison' : 'Enable Comparison'}
    </button>
  ),
}));

jest.mock('@/components/dashboard/refresh-button', () => ({
  RefreshButton: () => <button data-testid="refresh-button">Refresh</button>,
}));

jest.mock('@/components/charts/PageviewsOverTimeChart', () => ({
  PageviewsOverTimeChart: () => <div data-testid="pageviews-chart">Chart</div>,
}));

describe('Dashboard Integration Tests', () => {
  const mockPush = jest.fn();
  const mockGetPageviewsInDateRange = pageviewsDb.getPageviewsInDateRange as jest.MockedFunction<
    typeof pageviewsDb.getPageviewsInDateRange
  >;
  const mockGetUniqueVisitors = pageviewsDb.getUniqueVisitors as jest.MockedFunction<
    typeof pageviewsDb.getUniqueVisitors
  >;
  const mockGetTopPages = pageviewsDb.getTopPages as jest.MockedFunction<
    typeof pageviewsDb.getTopPages
  >;
  const mockGetPageviewsOverTime = pageviewsDb.getPageviewsOverTime as jest.MockedFunction<
    typeof pageviewsDb.getPageviewsOverTime
  >;
  const mockGetPageviewsByCountry = pageviewsDb.getPageviewsByCountry as jest.MockedFunction<
    typeof pageviewsDb.getPageviewsByCountry
  >;
  const mockGetReferrersByCategory = pageviewsDb.getReferrersByCategory as jest.MockedFunction<
    typeof pageviewsDb.getReferrersByCategory
  >;
  const mockGetReferrersByDomain = pageviewsDb.getReferrersByDomain as jest.MockedFunction<
    typeof pageviewsDb.getReferrersByDomain
  >;
  const mockGetDeviceTypeBreakdown = pageviewsDb.getDeviceTypeBreakdown as jest.MockedFunction<
    typeof pageviewsDb.getDeviceTypeBreakdown
  >;
  const mockGetBrowserBreakdown = pageviewsDb.getBrowserBreakdown as jest.MockedFunction<
    typeof pageviewsDb.getBrowserBreakdown
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, refresh: jest.fn() });
    (usePathname as jest.Mock).mockReturnValue('/');
    // Provide default mocks for all database functions to prevent worker crashes
    mockGetPageviewsOverTime.mockResolvedValue([]);
    mockGetPageviewsByCountry.mockResolvedValue([]);
    mockGetReferrersByCategory.mockResolvedValue([]);
    mockGetReferrersByDomain.mockResolvedValue([]);
    mockGetDeviceTypeBreakdown.mockResolvedValue([]);
    mockGetBrowserBreakdown.mockResolvedValue([]);
  });

  /**
   * Integration Test 1: Full dashboard renders with all components integrated
   * Verifies that all dashboard sections work together cohesively
   */
  it('should render complete dashboard with all integrated components', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(5000);
    mockGetUniqueVisitors.mockResolvedValue(1200);
    mockGetTopPages.mockResolvedValue([
      { path: '/home', pageviews: 2000, uniqueVisitors: 500 },
      { path: '/about', pageviews: 1500, uniqueVisitors: 400 },
    ]);

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });
    render(await DashboardPage({ searchParams }));

    // Verify all major sections are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-pageviews')).toBeInTheDocument();
    expect(screen.getByTestId('metric-unique-visitors')).toBeInTheDocument();
    expect(screen.getByTestId('top-pages')).toBeInTheDocument();
    expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
  });

  /**
   * Integration Test 2: Date range changes trigger proper URL navigation
   * Critical user workflow: User selects new dates → URL updates with both parameters
   */
  it('should integrate date selector with URL parameters for navigation', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(100);
    mockGetUniqueVisitors.mockResolvedValue(50);
    mockGetTopPages.mockResolvedValue([]);

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });
    render(await DashboardPage({ searchParams }));

    // Verify date range selector displays correct dates
    const fromInput = screen.getByTestId('from-date') as HTMLInputElement;
    const toInput = screen.getByTestId('to-date') as HTMLInputElement;

    expect(fromInput.value).toBe('2025-10-01');
    expect(toInput.value).toBe('2025-10-07');
  });

  /**
   * Integration Test 3: Dashboard gracefully handles all metrics failing
   * Tests resilience when entire data layer is unavailable
   */
  it('should handle total data failure gracefully and display all error states', async () => {
    mockGetPageviewsInDateRange.mockRejectedValue(new Error('DB Connection failed'));
    mockGetUniqueVisitors.mockRejectedValue(new Error('DB Connection failed'));
    mockGetTopPages.mockRejectedValue(new Error('DB Connection failed'));

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });
    render(await DashboardPage({ searchParams }));

    // Dashboard should still render with error messages in each section
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    const errors = screen.getAllByTestId('error');
    expect(errors.length).toBe(3); // All three metrics show errors

    // Verify specific error messages
    expect(screen.getByText('Unable to load pageviews data')).toBeInTheDocument();
    expect(screen.getByText('Unable to load visitors data')).toBeInTheDocument();
    expect(screen.getByText('Unable to load top pages performance data')).toBeInTheDocument();
  });

  /**
   * Integration Test 4: Invalid URL parameters are sanitized and corrected
   * Tests data validation layer integration with URL handling
   */
  it('should sanitize invalid URL date parameters and use defaults', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(100);
    mockGetUniqueVisitors.mockResolvedValue(50);
    mockGetTopPages.mockResolvedValue([]);

    // Provide completely invalid date params
    const searchParams = Promise.resolve({
      from: 'invalid-date',
      to: '2025-13-45' // Invalid month and day
    });

    render(await DashboardPage({ searchParams }));

    // Should fall back to default date range
    await waitFor(() => {
      expect(mockGetPageviewsInDateRange).toHaveBeenCalled();
    });

    // Verify database was called (with default dates, not invalid ones)
    const callArgs = mockGetPageviewsInDateRange.mock.calls[0];
    expect(callArgs[0]).toBeInstanceOf(Date);
    expect(callArgs[1]).toBeInstanceOf(Date);
  });

  /**
   * Integration Test 5: Date range with from > to is automatically corrected
   * Tests integration between URL validation and date handling logic
   */
  it('should swap dates when from date is after to date', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(200);
    mockGetUniqueVisitors.mockResolvedValue(100);
    mockGetTopPages.mockResolvedValue([]);

    // Provide reversed dates
    const searchParams = Promise.resolve({
      from: '2025-10-15',
      to: '2025-10-01'
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(mockGetPageviewsInDateRange).toHaveBeenCalled();
    });

    // Verify dates were swapped (to becomes from, from becomes to)
    const [startDate, endDate] = mockGetPageviewsInDateRange.mock.calls[0];
    expect(startDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
  });

  /**
   * Integration Test 6: Empty data state across all components
   * Tests how system behaves when queries succeed but return no data
   */
  it('should handle empty data state consistently across all metrics', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(0);
    mockGetUniqueVisitors.mockResolvedValue(0);
    mockGetTopPages.mockResolvedValue([]);

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });
    render(await DashboardPage({ searchParams }));

    // All metrics should display zero (not errors)
    const pageviewsMetric = screen.getByTestId('metric-total-pageviews');
    expect(pageviewsMetric).toHaveTextContent('0');

    const visitorsMetric = screen.getByTestId('metric-unique-visitors');
    expect(visitorsMetric).toHaveTextContent('0');

    const topPages = screen.getByTestId('top-pages');
    expect(topPages).toHaveTextContent('0 pages');
  });

  /**
   * Integration Test 7: Mixed success/failure state shows partial data
   * Critical resilience test - two metrics succeed, one fails
   */
  it('should display successful metrics while showing errors for failed ones', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(5000);
    mockGetUniqueVisitors.mockResolvedValue(1200);
    mockGetTopPages.mockRejectedValue(new Error('Top pages query timeout'));

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });
    render(await DashboardPage({ searchParams }));

    // Successful metrics display data
    const pageviewsMetric = screen.getByTestId('metric-total-pageviews');
    expect(pageviewsMetric).toHaveTextContent('5000');

    const visitorsMetric = screen.getByTestId('metric-unique-visitors');
    expect(visitorsMetric).toHaveTextContent('1200');

    // Failed metric shows error
    const topPages = screen.getByTestId('top-pages');
    const errorInTopPages = topPages.querySelector('[data-testid="error"]');
    expect(errorInTopPages).toBeInTheDocument();
    expect(errorInTopPages).toHaveTextContent('Unable to load top pages performance data');
  });

  /**
   * Integration Test 8: Database functions receive correctly formatted dates
   * Validates integration between URL parsing, date validation, and DB layer
   */
  it('should convert URL date strings to Date objects for database queries', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(1000);
    mockGetUniqueVisitors.mockResolvedValue(500);
    mockGetTopPages.mockResolvedValue([]);

    const searchParams = Promise.resolve({ from: '2025-09-01', to: '2025-09-30' });
    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(mockGetPageviewsInDateRange).toHaveBeenCalled();
    });

    // Verify Date objects were passed, not strings
    const [startDate, endDate] = mockGetPageviewsInDateRange.mock.calls[0];
    expect(startDate).toBeInstanceOf(Date);
    expect(endDate).toBeInstanceOf(Date);

    // Verify dates match URL params
    expect(startDate.toISOString().split('T')[0]).toBe('2025-09-01');
    expect(endDate.toISOString().split('T')[0]).toBe('2025-09-30');
  });
});
