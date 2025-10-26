/**
 * Tests for CountryDistributionTable Component
 * Focused tests for critical behaviors: rendering, data display, error states, loading states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CountryDistributionTable } from '../CountryDistributionTable';
import type { CountryDistribution } from '@/lib/utils/countries';

describe('CountryDistributionTable', () => {
  const mockData: CountryDistribution[] = [
    { countryCode: 'US', countryName: 'United States', pageviews: 1500, percentage: 50.25 },
    { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 900, percentage: 30.15 },
    { countryCode: 'CA', countryName: 'Canada', pageviews: 585, percentage: 19.60 },
  ];

  it('renders table with data correctly', () => {
    render(<CountryDistributionTable data={mockData} />);

    // Verify table headers
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('Pageviews')).toBeInTheDocument();
    expect(screen.getByText('Percentage')).toBeInTheDocument();

    // Verify data rows
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('50.25%')).toBeInTheDocument();

    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('30.15%')).toBeInTheDocument();

    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('585')).toBeInTheDocument();
    expect(screen.getByText('19.60%')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(<CountryDistributionTable data={[]} isLoading={true} />);

    const skeletonRows = screen.getAllByTestId('loading-skeleton-row');
    expect(skeletonRows).toHaveLength(5);

    // Verify screen reader announcement
    expect(screen.getByText('Loading country distribution data')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Failed to load data';
    render(<CountryDistributionTable data={[]} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Unable to load country distribution data.')).toBeInTheDocument();
  });

  it('displays empty state when data is empty', () => {
    render(<CountryDistributionTable data={[]} />);

    expect(screen.getByText('No geographic data available for this period.')).toBeInTheDocument();
    expect(screen.getByText('Try selecting a different date range.')).toBeInTheDocument();
  });
});
