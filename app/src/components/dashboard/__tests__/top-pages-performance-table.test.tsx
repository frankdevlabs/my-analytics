/**
 * TopPagesPerformanceTable Component Tests
 *
 * Tests for the TopPagesPerformanceTable client component.
 * Focuses on critical behaviors: rendering, sorting, Show More functionality, and state handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopPagesPerformanceTable, TopPageData } from '../TopPagesPerformanceTable';

// Mock fetch globally
global.fetch = jest.fn();

describe('TopPagesPerformanceTable', () => {
  const mockData: TopPageData[] = Array.from({ length: 20 }, (_, i) => ({
    path: `/page-${i + 1}`,
    pageviews: 1000 - i * 10,
    uniqueVisitors: 500 - i * 5,
  }));

  const defaultProps = {
    data: mockData,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders component with 20 initial rows', () => {
      render(<TopPagesPerformanceTable {...defaultProps} />);

      expect(screen.getByText('Top Pages Performance')).toBeInTheDocument();
      expect(screen.getByText('Page Path')).toBeInTheDocument();
      expect(screen.getByText('Pageviews')).toBeInTheDocument();
      expect(screen.getByText('Unique Visitors')).toBeInTheDocument();

      // Check that data rows are rendered
      const rows = screen.getAllByRole('row');
      // 1 header row + 20 data rows = 21 total
      expect(rows).toHaveLength(21);
    });

    it('renders loading state with skeleton rows', () => {
      render(<TopPagesPerformanceTable {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading top pages performance data')).toBeInTheDocument();
      const skeletonRows = screen.getAllByTestId('loading-skeleton-row');
      expect(skeletonRows).toHaveLength(20);
    });

    it('renders error state with error message', () => {
      render(
        <TopPagesPerformanceTable
          {...defaultProps}
          error="Unable to load top pages performance data"
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to load top pages performance data'
      );
      expect(
        screen.getByText('Unable to load top pages performance data.')
      ).toBeInTheDocument();
    });

    it('renders empty state when data array is empty', () => {
      render(<TopPagesPerformanceTable {...defaultProps} data={[]} />);

      expect(screen.getByText('No data recorded for this period.')).toBeInTheDocument();
      expect(
        screen.getByText('Try selecting a different date range.')
      ).toBeInTheDocument();
    });
  });

  describe('Show More Functionality', () => {
    it('shows "Show More" button when displaying 20 rows', () => {
      render(<TopPagesPerformanceTable {...defaultProps} />);

      const showMoreButton = screen.getByRole('button', { name: /show more/i });
      expect(showMoreButton).toBeInTheDocument();
      expect(showMoreButton).not.toBeDisabled();
    });

    it('fetches expanded data and hides button after clicking "Show More"', async () => {
      const expandedData: TopPageData[] = Array.from({ length: 50 }, (_, i) => ({
        path: `/page-${i + 1}`,
        pageviews: 2000 - i * 10,
        uniqueVisitors: 1000 - i * 5,
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: expandedData }),
      });

      render(<TopPagesPerformanceTable {...defaultProps} />);

      const showMoreButton = screen.getByRole('button', { name: /show more/i });
      fireEvent.click(showMoreButton);

      // Wait for loading state
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
      });

      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/top-pages?from=')
      );
    });

    it('does not show "Show More" button with less than 20 rows', () => {
      const smallData = mockData.slice(0, 10);
      render(<TopPagesPerformanceTable {...defaultProps} data={smallData} />);

      expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts by pageviews descending by default', () => {
      render(<TopPagesPerformanceTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // First data row should contain highest pageviews
      expect(rows[1]).toHaveTextContent('1,000'); // First pageview count
    });

    it('toggles sort direction when clicking the same column header', () => {
      render(<TopPagesPerformanceTable {...defaultProps} />);

      const pageviewsHeader = screen.getByText('Pageviews').closest('th');
      expect(pageviewsHeader).toBeInTheDocument();

      // Click to sort ascending
      if (pageviewsHeader) {
        fireEvent.click(pageviewsHeader);
      }

      // Verify sort direction changed (would show lowest pageviews first)
      const rows = screen.getAllByRole('row');
      // After clicking, should show ascending order
      expect(rows[1]).toHaveTextContent('810'); // Lowest pageview count
    });

    it('supports keyboard navigation for sorting', () => {
      render(<TopPagesPerformanceTable {...defaultProps} />);

      const pathHeader = screen.getByText('Page Path').closest('th');
      expect(pathHeader).toBeInTheDocument();

      // Simulate Enter key press
      if (pathHeader) {
        fireEvent.keyDown(pathHeader, { key: 'Enter' });
      }

      // Verify that path column is now sorted
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('/page-1'); // Alphabetically first
    });
  });

  describe('Number Formatting', () => {
    it('formats numbers with locale string (commas)', () => {
      const dataWithLargeNumbers: TopPageData[] = [
        { path: '/popular', pageviews: 1234567, uniqueVisitors: 654321 },
      ];

      render(<TopPagesPerformanceTable {...defaultProps} data={dataWithLargeNumbers} />);

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
      expect(screen.getByText('654,321')).toBeInTheDocument();
    });
  });
});
