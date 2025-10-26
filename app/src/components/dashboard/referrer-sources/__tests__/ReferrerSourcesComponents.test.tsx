/**
 * ReferrerSourcesComponents Tests
 *
 * Focused tests for referrer sources UI components
 * Testing rendering, interactions, and state management
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReferrerSourcesChart } from '../ReferrerSourcesChart';
import { ReferrerSourcesTable } from '../ReferrerSourcesTable';
import { ReferrerUrlsModal } from '../ReferrerUrlsModal';
import { ReferrerSourcesEmpty } from '../ReferrerSourcesEmpty';
import { ReferrerSourcesError } from '../ReferrerSourcesError';
import { ReferrerSourcesLoading } from '../ReferrerSourcesLoading';

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock BaseChart
jest.mock('@/components/charts/BaseChart', () => ({
  BaseChart: ({ children, title }: { children?: React.ReactNode; title?: string }) => <div data-testid="base-chart" aria-label={title}>{children}</div>,
  useChartTheme: () => ({
    colors: { primary: '#09192B' },
    grid: { stroke: '#ccc', strokeDasharray: '3 3' },
    axis: { stroke: '#666' },
    tooltip: {},
  }),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light' }),
}));

describe('ReferrerSourcesChart', () => {
  it('renders chart with category data', () => {
    const data = [
      { category: 'Direct', pageviews: 1500 },
      { category: 'Search', pageviews: 800 },
    ];

    render(<ReferrerSourcesChart data={data} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('shows all 4 categories even if some are missing from data', () => {
    const data = [
      { category: 'Direct', pageviews: 1500 },
    ];

    // The component should fill in missing categories with 0 pageviews
    render(<ReferrerSourcesChart data={data} />);

    expect(screen.getByTestId('base-chart')).toBeInTheDocument();
  });
});

describe('ReferrerSourcesTable', () => {
  const mockOnDomainClick = jest.fn();

  beforeEach(() => {
    mockOnDomainClick.mockClear();
  });

  it('renders table with domain data and badges', () => {
    const data = [
      { domain: 'google.com', category: 'Search', pageviews: 500 },
      { domain: 'facebook.com', category: 'Social', pageviews: 200 },
    ];

    render(<ReferrerSourcesTable data={data} onDomainClick={mockOnDomainClick} />);

    expect(screen.getByText('google.com')).toBeInTheDocument();
    expect(screen.getByText('facebook.com')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
  });

  it('calls onDomainClick when row is clicked', () => {
    const data = [
      { domain: 'google.com', category: 'Search', pageviews: 500 },
    ];

    render(<ReferrerSourcesTable data={data} onDomainClick={mockOnDomainClick} />);

    const row = screen.getByRole('button', { name: /view referrer urls for google.com/i });
    fireEvent.click(row);

    expect(mockOnDomainClick).toHaveBeenCalledWith('google.com');
  });

  it('handles keyboard navigation (Enter key)', () => {
    const data = [
      { domain: 'google.com', category: 'Search', pageviews: 500 },
    ];

    render(<ReferrerSourcesTable data={data} onDomainClick={mockOnDomainClick} />);

    const row = screen.getByRole('button', { name: /view referrer urls for google.com/i });
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(mockOnDomainClick).toHaveBeenCalledWith('google.com');
  });
});

describe('ReferrerUrlsModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('displays URLs correctly when open', () => {
    const urls = [
      { url: 'https://google.com/search?q=analytics', pageviews: 150 },
      { url: 'https://google.com/search?q=tracking', pageviews: 100 },
    ];

    render(
      <ReferrerUrlsModal
        isOpen={true}
        onClose={mockOnClose}
        domain="google.com"
        urls={urls}
      />
    );

    expect(screen.getByText(/referrer urls from google.com/i)).toBeInTheDocument();
    expect(screen.getByText(/google.com\/search\?q=analytics/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ReferrerUrlsModal
        isOpen={true}
        onClose={mockOnClose}
        domain="google.com"
        urls={[]}
        isLoading={true}
      />
    );

    expect(screen.getByText(/loading referrer urls/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <ReferrerUrlsModal
        isOpen={true}
        onClose={mockOnClose}
        domain="google.com"
        urls={[]}
        error="Failed to load URLs"
      />
    );

    expect(screen.getByText(/failed to load urls/i)).toBeInTheDocument();
  });

  it('shows empty state when no URLs', () => {
    render(
      <ReferrerUrlsModal
        isOpen={true}
        onClose={mockOnClose}
        domain="google.com"
        urls={[]}
      />
    );

    expect(screen.getByText(/no referrer urls found/i)).toBeInTheDocument();
  });
});

describe('ReferrerSourcesEmpty', () => {
  it('shows direct traffic message when allDirect is true', () => {
    render(<ReferrerSourcesEmpty allDirect={true} />);

    expect(screen.getByText(/all traffic is direct/i)).toBeInTheDocument();
  });

  it('shows no pageviews message when allDirect is false', () => {
    render(<ReferrerSourcesEmpty allDirect={false} />);

    expect(screen.getByText(/no pageviews recorded/i)).toBeInTheDocument();
  });
});

describe('ReferrerSourcesError', () => {
  it('displays error message', () => {
    render(<ReferrerSourcesError error="Database connection failed" />);

    expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
  });
});

describe('ReferrerSourcesLoading', () => {
  it('renders loading skeleton', () => {
    render(<ReferrerSourcesLoading />);

    expect(screen.getByText(/loading referrer sources data/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(10);
  });
});
