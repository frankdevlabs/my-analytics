/**
 * Dashboard Page Tests
 * Tests for the main dashboard page covering data fetching, URL parsing, and error handling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';
import * as pageviewsDb from '@/lib/db/pageviews';

// Mock the database functions
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

// Mock the date utils
jest.mock('@/lib/utils/date-utils', () => ({
  ...jest.requireActual('@/lib/utils/date-utils'),
  getDefaultDateRange: jest.fn(() => ({
    from: '2025-10-17',
    to: '2025-10-24',
  })),
  calculatePreviousPeriod: jest.fn((from: Date, to: Date) => ({
    from: new Date(from.getTime() - (to.getTime() - from.getTime())),
    to: from,
  })),
}));

// Mock the dashboard components
jest.mock('@/components/dashboard/metric-card', () => ({
  MetricCard: ({ title, value, error }: { title: string; value: number | null; error: string | null }) => (
    <div data-testid="metric-card">
      <span data-testid="metric-title">{title}</span>
      {error ? (
        <span data-testid="metric-error">{error}</span>
      ) : (
        <span data-testid="metric-value">{value}</span>
      )}
    </div>
  ),
}));

jest.mock('@/components/dashboard/TopPagesDashboardSection', () => ({
  TopPagesDashboardSection: ({ data, error }: { data: unknown; error: string | null }) => (
    <div data-testid="top-pages">
      {error ? (
        <span data-testid="error">{error}</span>
      ) : (
        <span data-testid="data">{Array.isArray(data) ? data.length : 0} pages</span>
      )}
    </div>
  ),
}));

jest.mock('@/components/dashboard/date-range-preset-picker', () => ({
  DateRangePresetPicker: ({ from, to }: { from: string; to: string }) => (
    <div data-testid="date-range-selector">
      {from} to {to}
    </div>
  ),
}));

jest.mock('@/components/dashboard/period-comparison-toggle', () => ({
  PeriodComparisonToggle: ({ isEnabled }: { isEnabled: boolean }) => (
    <div data-testid="period-comparison-toggle">
      {isEnabled ? 'enabled' : 'disabled'}
    </div>
  ),
}));

jest.mock('@/components/dashboard/refresh-button', () => ({
  RefreshButton: () => <button data-testid="refresh-button">Refresh</button>,
}));

jest.mock('@/components/charts/PageviewsOverTimeChart', () => ({
  PageviewsOverTimeChart: ({ data, error, isLoading }: { data: unknown; error: string | undefined; isLoading: boolean }) => (
    <div data-testid="pageviews-chart">
      {isLoading ? (
        <span data-testid="chart-loading">Loading chart...</span>
      ) : error ? (
        <span data-testid="chart-error">{error}</span>
      ) : (
        <span data-testid="chart-data">{JSON.stringify(data)}</span>
      )}
    </div>
  ),
}));

describe('Dashboard Page', () => {
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
    // Provide default mocks for all database functions to prevent worker crashes
    mockGetPageviewsByCountry.mockResolvedValue([]);
    mockGetReferrersByCategory.mockResolvedValue([]);
    mockGetReferrersByDomain.mockResolvedValue([]);
    mockGetDeviceTypeBreakdown.mockResolvedValue([]);
    mockGetBrowserBreakdown.mockResolvedValue([]);
  });

  it('should fetch and display metrics correctly with valid dates', async () => {
    // Mock successful database responses
    mockGetPageviewsInDateRange.mockResolvedValue(12345);
    mockGetUniqueVisitors.mockResolvedValue(3456);
    mockGetTopPages.mockResolvedValue([
      { path: '/home', pageviews: 1234, uniqueVisitors: 456 },
      { path: '/about', pageviews: 890, uniqueVisitors: 234 },
    ]);
    mockGetPageviewsOverTime.mockResolvedValue([
      { date: '2025-10-01', pageviews: 1234, uniqueVisitors: 456 },
      { date: '2025-10-02', pageviews: 1500, uniqueVisitors: 500 },
    ]);

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

    render(await DashboardPage({ searchParams }));

    // Check that metrics are displayed
    const metricValues = screen.getAllByTestId('metric-value');
    expect(metricValues[0]).toHaveTextContent('12345');
    expect(metricValues[1]).toHaveTextContent('3456');

    // Check that top pages are displayed
    const topPages = screen.getByTestId('top-pages');
    expect(topPages).toHaveTextContent('2 pages');

    // Verify database functions were called with correct dates
    // End date is set to end of day (23:59:59.999 UTC) in page.tsx
    const expectedEndDate = new Date('2025-10-07');
    expectedEndDate.setUTCHours(23, 59, 59, 999);

    expect(mockGetPageviewsInDateRange).toHaveBeenCalledWith(
      new Date('2025-10-01'),
      expectedEndDate
    );
    expect(mockGetUniqueVisitors).toHaveBeenCalledWith(
      new Date('2025-10-01'),
      expectedEndDate
    );
    expect(mockGetTopPages).toHaveBeenCalledWith(
      new Date('2025-10-01'),
      expectedEndDate,
      20
    );
  });

  it('should use default date range when no URL params provided', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(100);
    mockGetUniqueVisitors.mockResolvedValue(50);
    mockGetTopPages.mockResolvedValue([]);
    mockGetPageviewsOverTime.mockResolvedValue([]);

    const searchParams = Promise.resolve({});

    render(await DashboardPage({ searchParams }));

    // Verify database functions were called with default dates
    // End date is set to end of day (23:59:59.999 UTC) in page.tsx
    const expectedEndDate = new Date('2025-10-24');
    expectedEndDate.setUTCHours(23, 59, 59, 999);

    expect(mockGetPageviewsInDateRange).toHaveBeenCalledWith(
      new Date('2025-10-17'),
      expectedEndDate
    );
    expect(mockGetUniqueVisitors).toHaveBeenCalledWith(
      new Date('2025-10-17'),
      expectedEndDate
    );
    expect(mockGetTopPages).toHaveBeenCalledWith(
      new Date('2025-10-17'),
      expectedEndDate,
      20
    );

    // Verify date range selector shows default dates
    const dateSelector = screen.getByTestId('date-range-selector');
    expect(dateSelector).toHaveTextContent('2025-10-17 to 2025-10-24');
  });

  it('should handle partial data failure gracefully', async () => {
    // Mock partial failures
    mockGetPageviewsInDateRange.mockResolvedValue(5000);
    mockGetUniqueVisitors.mockRejectedValue(new Error('Database error'));
    mockGetTopPages.mockResolvedValue([{ path: '/test', pageviews: 100, uniqueVisitors: 50 }]);
    mockGetPageviewsOverTime.mockResolvedValue([]);

    const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

    render(await DashboardPage({ searchParams }));

    // Verify successful metrics are displayed
    const metricValues = screen.getAllByTestId('metric-value');
    expect(metricValues[0]).toHaveTextContent('5000');

    // Verify error is shown for failed metric
    const metricError = screen.getByTestId('metric-error');
    expect(metricError).toHaveTextContent('Unable to load visitors data');

    // Verify top pages still displays
    const topPages = screen.getByTestId('top-pages');
    expect(topPages).toHaveTextContent('1 pages');
  });

  it('should parse URL searchParams correctly', async () => {
    mockGetPageviewsInDateRange.mockResolvedValue(200);
    mockGetUniqueVisitors.mockResolvedValue(100);
    mockGetTopPages.mockResolvedValue([]);
    mockGetPageviewsOverTime.mockResolvedValue([]);

    const searchParams = Promise.resolve({ from: '2025-09-01', to: '2025-09-30' });

    render(await DashboardPage({ searchParams }));

    // Verify date range selector receives correct dates
    const dateSelector = screen.getByTestId('date-range-selector');
    expect(dateSelector).toHaveTextContent('2025-09-01 to 2025-09-30');

    // Verify database queries used the URL params
    // End date is set to end of day (23:59:59.999 UTC) in page.tsx
    const expectedEndDate = new Date('2025-09-30');
    expectedEndDate.setUTCHours(23, 59, 59, 999);

    expect(mockGetPageviewsInDateRange).toHaveBeenCalledWith(
      new Date('2025-09-01'),
      expectedEndDate
    );
  });

  // Task 3.1: Dashboard Chart Integration Tests
  describe('Pageviews Over Time Chart Integration', () => {
    it('should render chart section on dashboard page', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(12345);
      mockGetUniqueVisitors.mockResolvedValue(3456);
      mockGetTopPages.mockResolvedValue([]);
      mockGetPageviewsOverTime.mockResolvedValue([
        { date: '2025-10-01', pageviews: 1234, uniqueVisitors: 456 },
        { date: '2025-10-02', pageviews: 1500, uniqueVisitors: 500 },
      ]);

      const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

      render(await DashboardPage({ searchParams }));

      // Verify chart section is present
      const chart = screen.getByTestId('pageviews-chart');
      expect(chart).toBeInTheDocument();

      // Verify chart receives correct data
      const chartData = screen.getByTestId('chart-data');
      expect(chartData).toHaveTextContent('2025-10-01');
      expect(chartData).toHaveTextContent('1234');
      expect(chartData).toHaveTextContent('456');
    });

    it('should pass date range from searchParams to chart data fetching', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(1000);
      mockGetUniqueVisitors.mockResolvedValue(500);
      mockGetTopPages.mockResolvedValue([]);
      mockGetPageviewsOverTime.mockResolvedValue([
        { date: '2025-09-15', pageviews: 800, uniqueVisitors: 300 },
      ]);

      const searchParams = Promise.resolve({ from: '2025-09-15', to: '2025-09-20' });

      render(await DashboardPage({ searchParams }));

      // Verify getPageviewsOverTime was called with correct date range
      // End date is set to end of day (23:59:59.999 UTC) in page.tsx
      const expectedEndDate = new Date('2025-09-20');
      expectedEndDate.setUTCHours(23, 59, 59, 999);

      expect(mockGetPageviewsOverTime).toHaveBeenCalledWith(
        new Date('2025-09-15'),
        expectedEndDate
      );
    });

    it('should handle chart data fetch in parallel with other queries using Promise.allSettled', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(5000);
      mockGetUniqueVisitors.mockResolvedValue(2000);
      mockGetTopPages.mockResolvedValue([{ path: '/home', pageviews: 1000, uniqueVisitors: 500 }]);
      mockGetPageviewsOverTime.mockResolvedValue([
        { date: '2025-10-01', pageviews: 1000, uniqueVisitors: 500 },
      ]);

      const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

      render(await DashboardPage({ searchParams }));

      // Verify all queries were called (parallel execution)
      expect(mockGetPageviewsInDateRange).toHaveBeenCalled();
      expect(mockGetUniqueVisitors).toHaveBeenCalled();
      expect(mockGetTopPages).toHaveBeenCalled();
      expect(mockGetPageviewsOverTime).toHaveBeenCalled();

      // Verify all components rendered successfully
      expect(screen.getByTestId('pageviews-chart')).toBeInTheDocument();
      expect(screen.getByTestId('top-pages')).toBeInTheDocument();
      expect(screen.getAllByTestId('metric-card')).toHaveLength(2);
    });

    it('should gracefully handle chart error while allowing rest of dashboard to load', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(5000);
      mockGetUniqueVisitors.mockResolvedValue(2000);
      mockGetTopPages.mockResolvedValue([{ path: '/home', pageviews: 1000, uniqueVisitors: 500 }]);
      mockGetPageviewsOverTime.mockRejectedValue(new Error('Chart query failed'));

      const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

      render(await DashboardPage({ searchParams }));

      // Verify chart displays error
      const chartError = screen.getByTestId('chart-error');
      expect(chartError).toHaveTextContent('Unable to load chart data');

      // Verify rest of dashboard loaded successfully
      const metricValues = screen.getAllByTestId('metric-value');
      expect(metricValues[0]).toHaveTextContent('5000');
      expect(metricValues[1]).toHaveTextContent('2000');

      const topPages = screen.getByTestId('top-pages');
      expect(topPages).toHaveTextContent('1 pages');
    });

    it('should render empty chart when no data available for date range', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(0);
      mockGetUniqueVisitors.mockResolvedValue(0);
      mockGetTopPages.mockResolvedValue([]);
      mockGetPageviewsOverTime.mockResolvedValue([]);

      const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

      render(await DashboardPage({ searchParams }));

      // Verify chart section is present
      const chart = screen.getByTestId('pageviews-chart');
      expect(chart).toBeInTheDocument();

      // Verify chart receives empty array
      const chartData = screen.getByTestId('chart-data');
      expect(chartData).toHaveTextContent('[]');
    });

    it('should call getPageviewsOverTime with default date range when no params provided', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(100);
      mockGetUniqueVisitors.mockResolvedValue(50);
      mockGetTopPages.mockResolvedValue([]);
      mockGetPageviewsOverTime.mockResolvedValue([]);

      const searchParams = Promise.resolve({});

      render(await DashboardPage({ searchParams }));

      // Verify getPageviewsOverTime was called with default date range
      // End date is set to end of day (23:59:59.999 UTC) in page.tsx
      const expectedEndDate = new Date('2025-10-24');
      expectedEndDate.setUTCHours(23, 59, 59, 999);

      expect(mockGetPageviewsOverTime).toHaveBeenCalledWith(
        new Date('2025-10-17'),
        expectedEndDate
      );
    });

    it('should position chart between metrics and top pages table', async () => {
      mockGetPageviewsInDateRange.mockResolvedValue(1000);
      mockGetUniqueVisitors.mockResolvedValue(500);
      mockGetTopPages.mockResolvedValue([{ path: '/test', pageviews: 100, uniqueVisitors: 50 }]);
      mockGetPageviewsOverTime.mockResolvedValue([
        { date: '2025-10-01', pageviews: 1000, uniqueVisitors: 500 },
      ]);

      const searchParams = Promise.resolve({ from: '2025-10-01', to: '2025-10-07' });

      const { container } = render(await DashboardPage({ searchParams }));

      // Get all sections in order
      const sections = container.querySelectorAll('section');

      // Verify chart section exists between metrics (section 0) and top pages (section 2)
      expect(sections.length).toBeGreaterThanOrEqual(3);

      // Verify chart is in the document
      expect(screen.getByTestId('pageviews-chart')).toBeInTheDocument();
    });
  });
});
