/**
 * Tests for PageviewsOverTimeChart Component
 *
 * Focused tests covering:
 * - Loading state rendering
 * - Error state display
 * - Chart rendering with data
 * - Empty state display
 * - BaseChart wrapper usage
 * - Responsive design
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageviewsOverTimeChart, PageviewsOverTimeData } from '../PageviewsOverTimeChart';

// Mock the BaseChart component to simplify testing
jest.mock('../BaseChart', () => ({
  BaseChart: ({ children, title, description }: { children?: React.ReactNode; title?: string; description?: string }) => (
    <div data-testid="base-chart" data-title={title} data-description={description}>
      {children}
    </div>
  ),
  useChartTheme: () => ({
    colors: {
      series: ['#09192B', '#D9BF65'],
    },
    grid: {
      stroke: 'rgba(9, 25, 43, 0.1)',
      strokeDasharray: '3 3',
    },
    axis: {
      stroke: 'rgba(9, 25, 43, 0.5)',
      style: {
        fontSize: 12,
        fill: 'rgba(9, 25, 43, 0.5)',
        fontFamily: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
      },
    },
    tooltip: {
      contentStyle: {
        backgroundColor: '#F5F2EB',
        border: '1px solid rgba(9, 25, 43, 0.1)',
        borderRadius: 4,
        padding: 16,
        fontSize: 12,
        fontFamily: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#09192B',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      cursor: {
        fill: 'rgba(9, 25, 43, 0.4)',
      },
    },
    legend: {
      iconType: 'circle' as const,
      wrapperStyle: {
        fontSize: 12,
        fontFamily: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
        color: 'rgba(9, 25, 43, 0.5)',
      },
    },
  }),
}));

// Mock chart-theme utilities
jest.mock('@/config/chart-theme', () => ({
  chartStyles: {
    lineStrokeWidth: 2,
  },
  getSeriesColor: (index: number) => {
    const colors = ['#09192B', '#D9BF65'];
    return colors[index % colors.length];
  },
}));

// Mock Recharts components to avoid rendering issues in tests
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name }: { dataKey?: string; name?: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('PageviewsOverTimeChart', () => {
  const mockData: PageviewsOverTimeData[] = [
    { date: '2025-10-15', pageviews: 1200, uniqueVisitors: 800 },
    { date: '2025-10-16', pageviews: 1500, uniqueVisitors: 950 },
    { date: '2025-10-17', pageviews: 1300, uniqueVisitors: 850 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Loading State
   * Primary test - verifies skeleton loader appears during data fetch
   */
  it('should render loading skeleton when isLoading is true', () => {
    render(
      <PageviewsOverTimeChart
        data={[]}
        isLoading={true}
      />
    );

    // Check for skeleton loader with correct classes
    const skeleton = document.querySelector('.h-\\[400px\\].w-full.bg-muted.animate-pulse.rounded');
    expect(skeleton).toBeInTheDocument();
  });

  /**
   * Test 2: Error State
   * Verifies error message displays when error prop is provided
   */
  it('should display error message when error prop is provided', () => {
    const errorMessage = 'Failed to load pageview data';

    render(
      <PageviewsOverTimeChart
        data={[]}
        error={errorMessage}
        isLoading={false}
      />
    );

    // Check for error message with destructive styling
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('text-sm', 'text-destructive');
  });

  /**
   * Test 3: Chart with Data
   * Verifies chart renders with correct data series when data is available
   */
  it('should render chart with correct data series when data is available', () => {
    render(
      <PageviewsOverTimeChart
        data={mockData}
        isLoading={false}
      />
    );

    // Verify BaseChart wrapper is used
    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
    expect(screen.getByTestId('base-chart')).toHaveAttribute(
      'data-title',
      'Pageviews Over Time'
    );

    // Verify LineChart is rendered with data
    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toBeInTheDocument();
    expect(lineChart).toHaveAttribute('data-length', '3');

    // Verify both line series are present
    expect(screen.getByTestId('line-pageviews')).toBeInTheDocument();
    expect(screen.getByTestId('line-uniqueVisitors')).toBeInTheDocument();

    // Verify line names
    expect(screen.getByTestId('line-pageviews')).toHaveAttribute(
      'data-name',
      'Total Pageviews'
    );
    expect(screen.getByTestId('line-uniqueVisitors')).toHaveAttribute(
      'data-name',
      'Unique Visitors'
    );

    // Verify chart elements are present
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  /**
   * Test 4: Empty State
   * Verifies empty state message displays when data array is empty
   */
  it('should display empty state when data array is empty', () => {
    render(
      <PageviewsOverTimeChart
        data={[]}
        isLoading={false}
      />
    );

    // Check for empty state message
    expect(
      screen.getByText('No pageview data available for the selected date range')
    ).toBeInTheDocument();
  });

  /**
   * Test 5: BaseChart Wrapper Usage
   * Verifies component uses BaseChart wrapper with correct props
   */
  it('should use BaseChart wrapper with correct props', () => {
    render(
      <PageviewsOverTimeChart
        data={mockData}
        isLoading={false}
      />
    );

    const baseChart = screen.getByTestId('base-chart');
    expect(baseChart).toBeInTheDocument();
    expect(baseChart).toHaveAttribute('data-title', 'Pageviews Over Time');
    expect(baseChart).toHaveAttribute(
      'data-description',
      'Line chart showing daily pageview trends with total pageviews and unique visitors'
    );
  });

  /**
   * Test 6: Additional Data Points
   * Verifies chart handles larger datasets correctly
   */
  it('should render all data points from dataset', () => {
    const largeDataset: PageviewsOverTimeData[] = Array.from(
      { length: 30 },
      (_, i) => ({
        date: `2025-10-${String(i + 1).padStart(2, '0')}`,
        pageviews: 1000 + Math.floor(Math.random() * 500),
        uniqueVisitors: 700 + Math.floor(Math.random() * 300),
      })
    );

    render(
      <PageviewsOverTimeChart
        data={largeDataset}
        isLoading={false}
      />
    );

    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toHaveAttribute('data-length', '30');
  });
});
