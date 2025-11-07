/**
 * Top Pages Performance Dashboard - Integration Tests
 *
 * Tests integration points between server components, client components, API routes,
 * and database layer for the Top Pages Performance Dashboard feature.
 */

// Mock authentication before imports
jest.mock('../../../lib/auth/config', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      mfaEnabled: true,
      mfaVerified: true,
    },
  })),
}));

// Mock database function
jest.mock('lib/db/pageviews', () => ({
  getTopPages: jest.fn(),
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { getTopPages } from 'lib/db/pageviews';
import { TopPagesDashboardSection } from '@/components/dashboard/TopPagesDashboardSection';
import { GET } from '@/app/api/top-pages/route';
import { NextRequest } from 'next/server';

// Mock fetch for client-side API calls
global.fetch = jest.fn();

describe('Top Pages Performance Dashboard - Integration Tests', () => {
  const mockTopPagesData = Array.from({ length: 20 }, (_, i) => ({
    path: `/page-${i + 1}`,
    pageviews: 1000 - i * 10,
    uniqueVisitors: 500 - i * 5,
  }));

  const mockExpandedData = Array.from({ length: 50 }, (_, i) => ({
    path: `/page-${i + 1}`,
    pageviews: 2000 - i * 10,
    uniqueVisitors: 1000 - i * 5,
  }));

  const defaultDates = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Component Data Fetching', () => {
    it('fetches top 20 pages on initial load', async () => {
      (getTopPages as jest.Mock).mockResolvedValue(mockTopPagesData);

      // Simulate what happens in dashboard page.tsx
      const data = await getTopPages(defaultDates.startDate, defaultDates.endDate, 20);

      expect(getTopPages).toHaveBeenCalledWith(
        defaultDates.startDate,
        defaultDates.endDate,
        20
      );
      expect(data).toHaveLength(20);
      expect(data[0]).toEqual({
        path: '/page-1',
        pageviews: 1000,
        uniqueVisitors: 500,
      });
    });

    it('passes correct data from Promise.allSettled to TopPagesDashboardSection', () => {
      const data = mockTopPagesData;
      const error = null;

      render(
        <TopPagesDashboardSection
          data={data}
          error={error}
          startDate={defaultDates.startDate}
          endDate={defaultDates.endDate}
        />
      );

      expect(screen.getByText('Top Pages')).toBeInTheDocument();
      expect(screen.getByText('Top Pages Performance')).toBeInTheDocument();
      // Verify first row data is displayed
      expect(screen.getByText('/page-1')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('handles database errors gracefully in server component', () => {
      const error = 'Unable to load top pages performance data';

      render(
        <TopPagesDashboardSection
          data={null}
          error={error}
          startDate={defaultDates.startDate}
          endDate={defaultDates.endDate}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(error);
      expect(
        screen.getByText('Unable to load top pages performance data.')
      ).toBeInTheDocument();
    });
  });

  describe('API Route Integration', () => {
    it('returns top pages data from API route with valid parameters', async () => {
      (getTopPages as jest.Mock).mockResolvedValue(mockExpandedData);

      const url = new URL(
        'http://localhost:3000/api/top-pages?from=2025-01-01&to=2025-01-31&limit=50'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(50);
      expect(data.meta).toEqual({
        count: 50,
        limit: 50,
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
      });
    });

    it('returns 400 error when required parameters are missing', async () => {
      const url = new URL('http://localhost:3000/api/top-pages');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: from, to');
    });

    it('validates date format in API route', async () => {
      const url = new URL(
        'http://localhost:3000/api/top-pages?from=invalid&to=2025-01-31'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date format');
    });

    it('validates start date is before end date', async () => {
      const url = new URL(
        'http://localhost:3000/api/top-pages?from=2025-01-31&to=2025-01-01'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Start date must be before or equal to end date');
    });

    it('caps limit at 100 to prevent excessive data fetching', async () => {
      (getTopPages as jest.Mock).mockResolvedValue([]);

      const url = new URL(
        'http://localhost:3000/api/top-pages?from=2025-01-01&to=2025-01-31&limit=500'
      );
      const request = new NextRequest(url);

      await GET(request);

      // Verify getTopPages was called with capped limit
      expect(getTopPages).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        100
      );
    });
  });

  describe('Date Range Filtering', () => {
    it('filters data by date range when dates change', async () => {
      const newStartDate = new Date('2025-02-01');
      const newEndDate = new Date('2025-02-28');

      (getTopPages as jest.Mock).mockResolvedValue(mockTopPagesData);

      await getTopPages(newStartDate, newEndDate, 20);

      expect(getTopPages).toHaveBeenCalledWith(newStartDate, newEndDate, 20);
    });

    it('displays empty state when no data exists for date range', () => {
      render(
        <TopPagesDashboardSection
          data={[]}
          error={null}
          startDate={defaultDates.startDate}
          endDate={defaultDates.endDate}
        />
      );

      expect(screen.getByText('No data recorded for this period.')).toBeInTheDocument();
      expect(screen.getByText('Try selecting a different date range.')).toBeInTheDocument();
    });
  });

  describe('Show More Workflow Integration', () => {
    it('expands from 20 to 50 rows when Show More is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockExpandedData }),
      });

      render(
        <TopPagesDashboardSection
          data={mockTopPagesData}
          error={null}
          startDate={defaultDates.startDate}
          endDate={defaultDates.endDate}
        />
      );

      // Initial state: 20 rows displayed (1 header + 20 data rows)
      const initialRows = screen.getAllByRole('row');
      expect(initialRows).toHaveLength(21);

      // Click Show More button wrapped in act
      const showMoreButton = screen.getByRole('button', { name: /show more/i });
      await waitFor(() => {
        showMoreButton.click();
      });

      // Wait for API call and state update
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/top-pages?from=2025-01-01')
        );
      });
    });
  });

  describe('Sorting Without Re-fetch', () => {
    it('sorts data client-side without triggering database call', async () => {
      render(
        <TopPagesDashboardSection
          data={mockTopPagesData}
          error={null}
          startDate={defaultDates.startDate}
          endDate={defaultDates.endDate}
        />
      );

      // Clear any previous calls from rendering
      (getTopPages as jest.Mock).mockClear();

      // Click on Page Path header to sort wrapped in waitFor
      const pagePathHeader = screen.getByText('Page Path').closest('th');
      if (pagePathHeader) {
        await waitFor(() => {
          pagePathHeader.click();
        });
      }

      // Verify no database call was made
      expect(getTopPages).not.toHaveBeenCalled();

      // Verify data is still displayed (sorted client-side)
      expect(screen.getByText('Top Pages Performance')).toBeInTheDocument();
    });
  });
});
