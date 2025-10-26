/**
 * Dashboard Components Integration Tests
 *
 * Tests focused on how dashboard components interact with each other
 * and the broader system. Complements unit tests by verifying integration points.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './metric-card';
import { TopPagesTable } from './top-pages-table';

describe('Dashboard Components Integration', () => {
  /**
   * Integration Test 1: Multiple MetricCards render consistently
   * Verifies cards maintain consistent styling and behavior when rendered together
   */
  it('should render multiple metric cards with consistent styling', () => {
    const { container } = render(
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Total Pageviews"
          value={12345}
          isLoading={false}
          error={null}
        />
        <MetricCard
          title="Unique Visitors"
          value={3456}
          isLoading={false}
          error={null}
        />
      </div>
    );

    // Both cards should be present
    expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
    expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
    expect(screen.getByText('3,456')).toBeInTheDocument();

    // Verify grid layout is applied
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  /**
   * Integration Test 2: TopPagesTable handles real-world data structures
   * Tests table with data that resembles actual database query results
   */
  it('should render table with realistic database query structure', () => {
    const realisticData = [
      { path: '/', pageviews: 15234, uniqueVisitors: 4567 },
      { path: '/blog/article-1', pageviews: 8901, uniqueVisitors: 2345 },
      { path: '/products?category=electronics', pageviews: 5678, uniqueVisitors: 1234 },
      { path: '/very/long/path/with/many/segments/that/might/need/truncation', pageviews: 3456, uniqueVisitors: 890 },
      { path: '/api/v1/endpoint', pageviews: 2345, uniqueVisitors: 678 },
    ];

    render(<TopPagesTable data={realisticData} isLoading={false} error={null} />);

    // Verify all paths are rendered
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('/blog/article-1')).toBeInTheDocument();
    expect(screen.getByText('/products?category=electronics')).toBeInTheDocument();

    // Verify numbers are formatted with commas
    expect(screen.getByText('15,234')).toBeInTheDocument();
    expect(screen.getByText('4,567')).toBeInTheDocument();
  });
});
