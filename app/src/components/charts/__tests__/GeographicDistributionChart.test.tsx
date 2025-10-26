/**
 * Tests for GeographicDistributionChart Component
 * Focused tests for critical behaviors: rendering, data display, error states, loading states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GeographicDistributionChart } from '../GeographicDistributionChart';
import type { CountryDistribution } from '@/lib/utils/countries';

// Mock the BaseChart and Recharts components
jest.mock('../BaseChart', () => ({
  BaseChart: ({ children, title, description }: { children?: React.ReactNode; title?: string; description?: string }) => (
    <div data-testid="base-chart" aria-label={title}>
      <span className="sr-only">{description}</span>
      {children}
    </div>
  ),
  useChartTheme: () => ({
    colors: {
      primary: '#09192B',
      primaryOpacity40: 'rgba(9, 25, 43, 0.4)',
      grid: 'rgba(9, 25, 43, 0.1)',
      axis: 'rgba(9, 25, 43, 0.5)',
    },
    grid: { stroke: 'rgba(9, 25, 43, 0.1)', strokeDasharray: '3 3' },
    axis: { stroke: 'rgba(9, 25, 43, 0.5)', style: { fontSize: 12 } },
    tooltip: { contentStyle: {}, cursor: {} },
  }),
}));

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children?: React.ReactNode; data?: unknown }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey, fill }: { dataKey?: string; fill?: string }) => <div data-testid={`bar-${dataKey}`} data-fill={fill} />,
  XAxis: ({ dataKey }: { dataKey?: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('GeographicDistributionChart', () => {
  const mockData: CountryDistribution[] = [
    { countryCode: 'US', countryName: 'United States', pageviews: 1500, percentage: 50 },
    { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 900, percentage: 30 },
    { countryCode: 'CA', countryName: 'Canada', pageviews: 600, percentage: 20 },
  ];

  it('renders chart with data correctly', () => {
    render(<GeographicDistributionChart data={mockData} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(<GeographicDistributionChart data={[]} isLoading={true} />);

    const skeleton = screen.getByTestId('chart-loading-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');

    // Verify screen reader announcement
    expect(screen.getByText('Loading geographic distribution chart')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Failed to load data';
    render(<GeographicDistributionChart data={[]} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Unable to load geographic distribution data.')).toBeInTheDocument();
  });

  it('displays empty state when data is empty', () => {
    render(<GeographicDistributionChart data={[]} />);

    expect(screen.getByText('No geographic data available for this period.')).toBeInTheDocument();
    expect(screen.getByText('Try selecting a different date range.')).toBeInTheDocument();
  });
});
