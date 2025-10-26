/**
 * Test for Top 10 Pages Component Removal
 * Task Group 3: Verify "Top 10 Pages" section is removed from dashboard
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all the dashboard dependencies
jest.mock('@/lib/db/pageviews', () => ({
  getPageviewsInDateRange: jest.fn().mockResolvedValue(1000),
  getUniqueVisitors: jest.fn().mockResolvedValue(500),
  getTopPages: jest.fn().mockResolvedValue([]),
  getPageviewsOverTime: jest.fn().mockResolvedValue([]),
  getPageviewsByCountry: jest.fn().mockResolvedValue([]),
  getReferrersByCategory: jest.fn().mockResolvedValue(null),
  getReferrersByDomain: jest.fn().mockResolvedValue(null),
  getDeviceTypeBreakdown: jest.fn().mockResolvedValue([]),
  getBrowserBreakdown: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/utils/countries', () => ({
  transformCountryData: jest.fn().mockReturnValue([]),
}));

jest.mock('@/components/dashboard/metric-card', () => ({
  MetricCard: () => <div data-testid="metric-card">Metric Card</div>,
}));

jest.mock('@/components/dashboard/top-pages-table', () => ({
  TopPagesTable: () => <div data-testid="top-pages-table">Top Pages Table</div>,
}));

jest.mock('@/components/dashboard/date-range-preset-picker', () => ({
  DateRangePresetPicker: () => <div data-testid="date-range-picker">Date Range Picker</div>,
}));

jest.mock('@/components/dashboard/period-comparison-toggle', () => ({
  PeriodComparisonToggle: () => <div data-testid="comparison-toggle">Comparison Toggle</div>,
}));

jest.mock('@/components/dashboard/refresh-button', () => ({
  RefreshButton: () => <div data-testid="refresh-button">Refresh Button</div>,
}));

jest.mock('@/components/dashboard/active-visitor-badge', () => ({
  ActiveVisitorBadge: () => <div data-testid="active-visitor-badge">Active Visitors</div>,
}));

jest.mock('@/components/charts/PageviewsOverTimeChart', () => ({
  PageviewsOverTimeChart: () => <div data-testid="pageviews-chart">Pageviews Chart</div>,
}));

jest.mock('@/components/charts/GeographicDistributionChart', () => ({
  GeographicDistributionChart: () => <div data-testid="geo-chart">Geographic Chart</div>,
}));

jest.mock('@/components/dashboard/CountryDistributionTable', () => ({
  CountryDistributionTable: () => <div data-testid="country-table">Country Table</div>,
}));

jest.mock('@/components/dashboard/referrer-sources/ReferrerSourcesSection', () => ({
  ReferrerSourcesSection: () => <div data-testid="referrer-section">Referrer Sources</div>,
}));

jest.mock('@/components/dashboard/TopPagesDashboardSection', () => ({
  TopPagesDashboardSection: () => <div data-testid="top-pages-performance">Top Pages Performance</div>,
}));

jest.mock('@/components/dashboard/device-type-analytics', () => ({
  DeviceTypeAnalytics: () => <div data-testid="device-analytics">Device Analytics</div>,
}));

jest.mock('@/components/dashboard/browser-analytics', () => ({
  BrowserAnalytics: () => <div data-testid="browser-analytics">Browser Analytics</div>,
}));

describe('Dashboard Top 10 Pages Removal', () => {
  it('should NOT render "Top 10 Pages" heading', async () => {
    const DashboardPage = (await import('../page')).default;

    render(
      await DashboardPage({
        searchParams: Promise.resolve({ from: '2024-01-01', to: '2024-01-07' })
      })
    );

    // Check that "Top 10 Pages" heading does not exist
    const top10Heading = screen.queryByText(/Top 10 Pages/i);
    expect(top10Heading).not.toBeInTheDocument();
  });

  it('should still render "Top Pages Performance" section', async () => {
    const DashboardPage = (await import('../page')).default;

    render(
      await DashboardPage({
        searchParams: Promise.resolve({ from: '2024-01-01', to: '2024-01-07' })
      })
    );

    // Top Pages Performance should still be present
    expect(screen.getByTestId('top-pages-performance')).toBeInTheDocument();
  });

  it('should not render TopPagesTable component for Top 10 Pages', async () => {
    const DashboardPage = (await import('../page')).default;

    render(
      await DashboardPage({
        searchParams: Promise.resolve({ from: '2024-01-01', to: '2024-01-07' })
      })
    );

    // Should not have a standalone TopPagesTable outside of TopPagesDashboardSection
    // (TopPagesDashboardSection contains its own table with 20 rows)
    const topPagesTables = screen.queryAllByTestId('top-pages-table');

    // If TopPagesTable appears, it should only be within TopPagesDashboardSection
    // The redundant Top 10 Pages section should be gone
    expect(topPagesTables.length).toBeLessThanOrEqual(0);
  });
});
