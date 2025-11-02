/**
 * Integration Tests for Device and Browser Analytics on Dashboard
 *
 * Tests the integration of device type and browser analytics components
 * with the dashboard page, including data fetching and rendering.
 *
 * Task Group 5: Test Review & Gap Analysis - Integration Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import {
  getDeviceTypeBreakdown,
  getBrowserBreakdown,
  getPageviewsInDateRange,
  getUniqueVisitors,
  getTopPages,
  getPageviewsOverTime,
  getPageviewsByCountry,
  getReferrersByCategory,
  getReferrersByDomain,
} from '@/lib/db/pageviews';

// Mock all database functions
jest.mock('@/lib/db/pageviews');

// Mock chart components to avoid Recharts rendering issues in tests
jest.mock('@/components/charts/PageviewsOverTimeChart', () => ({
  PageviewsOverTimeChart: () => <div>PageviewsOverTimeChart</div>,
}));

jest.mock('@/components/charts/GeographicDistributionChart', () => ({
  GeographicDistributionChart: () => <div>GeographicDistributionChart</div>,
}));

// Mock other dashboard components
jest.mock('@/components/dashboard/date-range-preset-picker', () => ({
  DateRangePresetPicker: () => <div>DateRangePresetPicker</div>,
}));

jest.mock('@/components/dashboard/period-comparison-toggle', () => ({
  PeriodComparisonToggle: () => <div>PeriodComparisonToggle</div>,
}));

jest.mock('@/components/dashboard/refresh-button', () => ({
  RefreshButton: () => <div>RefreshButton</div>,
}));

jest.mock('@/components/dashboard/active-visitor-badge', () => ({
  ActiveVisitorBadge: () => <div>ActiveVisitorBadge</div>,
}));

jest.mock('@/components/dashboard/referrer-sources/ReferrerSourcesSection', () => ({
  ReferrerSourcesSection: () => <div>ReferrerSourcesSection</div>,
}));

jest.mock('@/components/dashboard/TopPagesDashboardSection', () => ({
  TopPagesDashboardSection: () => <div>TopPagesDashboardSection</div>,
}));

describe('Dashboard Device and Browser Analytics Integration', () => {
  const mockDeviceData = [
    { device_type: 'Desktop', count: 5000, percentage: 62.5 },
    { device_type: 'Mobile', count: 2500, percentage: 31.25 },
    { device_type: 'Tablet', count: 500, percentage: 6.25 },
  ];

  const mockBrowserData = [
    { browser: 'Chrome 120', count: 3500, percentage: 43.75 },
    { browser: 'Safari 17', count: 2000, percentage: 25.0 },
    { browser: 'Firefox 121', count: 1500, percentage: 18.75 },
    { browser: 'Edge 120', count: 500, percentage: 6.25 },
    { browser: 'Unknown', count: 300, percentage: 3.75 },
    { browser: 'Other', count: 200, percentage: 2.5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock all required database functions
    (getPageviewsInDateRange as jest.Mock).mockResolvedValue(8000);
    (getUniqueVisitors as jest.Mock).mockResolvedValue(5000);
    (getTopPages as jest.Mock).mockResolvedValue([]);
    (getPageviewsOverTime as jest.Mock).mockResolvedValue([]);
    (getPageviewsByCountry as jest.Mock).mockResolvedValue([]);
    (getReferrersByCategory as jest.Mock).mockResolvedValue([]);
    (getReferrersByDomain as jest.Mock).mockResolvedValue([]);
    (getDeviceTypeBreakdown as jest.Mock).mockResolvedValue(mockDeviceData);
    (getBrowserBreakdown as jest.Mock).mockResolvedValue(mockBrowserData);
  });

  it('should render device type analytics section with data', async () => {
    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    // Wait for device type section to render
    await waitFor(() => {
      expect(screen.getByText('Device Types')).toBeInTheDocument();
    });

    // Verify device type data is displayed
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('Tablet')).toBeInTheDocument();
  });

  it('should render browser analytics section with data', async () => {
    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    // Wait for browser section to render
    await waitFor(() => {
      expect(screen.getByText('Browsers')).toBeInTheDocument();
    });

    // Verify browser data is displayed
    expect(screen.getByText('Chrome 120')).toBeInTheDocument();
    expect(screen.getByText('Safari 17')).toBeInTheDocument();
    expect(screen.getByText('Firefox 121')).toBeInTheDocument();
  });

  it('should display "Other" category in browser analytics', async () => {
    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(screen.getByText('Browsers')).toBeInTheDocument();
    });

    // Verify "Other" category is displayed
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('should handle device type query error gracefully', async () => {
    (getDeviceTypeBreakdown as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(screen.getByText('Device Types')).toBeInTheDocument();
    });

    // Verify error state is displayed
    expect(
      screen.getByText('Unable to load device type data')
    ).toBeInTheDocument();
  });

  it('should handle browser query error gracefully', async () => {
    (getBrowserBreakdown as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(screen.getByText('Browsers')).toBeInTheDocument();
    });

    // Verify error state is displayed
    expect(screen.getByText('Unable to load browser data')).toBeInTheDocument();
  });

  it('should call device and browser queries with correct date range', async () => {
    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(getDeviceTypeBreakdown).toHaveBeenCalled();
      expect(getBrowserBreakdown).toHaveBeenCalled();
    });

    // Verify queries were called with correct date parameters
    const deviceCallArgs = (getDeviceTypeBreakdown as jest.Mock).mock.calls[0];
    expect(deviceCallArgs[0]).toEqual(new Date('2025-10-01'));
    // End date is set to end of day (23:59:59.999 UTC) in page.tsx
    const expectedEndDate = new Date('2025-10-31');
    expectedEndDate.setUTCHours(23, 59, 59, 999);
    expect(deviceCallArgs[1]).toEqual(expectedEndDate);

    const browserCallArgs = (getBrowserBreakdown as jest.Mock).mock.calls[0];
    expect(browserCallArgs[0]).toEqual(new Date('2025-10-01'));
    // End date is set to end of day (23:59:59.999 UTC) in page.tsx
    expect(browserCallArgs[1]).toEqual(expectedEndDate);
    expect(browserCallArgs[2]).toBe(5); // Top 5 browsers
  });

  it('should display empty state when no device data', async () => {
    (getDeviceTypeBreakdown as jest.Mock).mockResolvedValue([]);

    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(screen.getByText('Device Types')).toBeInTheDocument();
    });

    // Verify empty state message
    expect(
      screen.getByText('No data recorded for this period')
    ).toBeInTheDocument();
  });

  it('should display empty state when no browser data', async () => {
    (getBrowserBreakdown as jest.Mock).mockResolvedValue([]);

    const searchParams = Promise.resolve({
      from: '2025-10-01',
      to: '2025-10-31',
    });

    render(await DashboardPage({ searchParams }));

    await waitFor(() => {
      expect(screen.getByText('Browsers')).toBeInTheDocument();
    });

    // Verify empty state message
    expect(
      screen.getAllByText('No data recorded for this period').length
    ).toBeGreaterThan(0);
  });
});
