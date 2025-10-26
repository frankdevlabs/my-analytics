/**
 * TopPagesTable Component Tests
 * Focused tests covering critical behaviors
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { TopPagesTable } from './top-pages-table';

describe('TopPagesTable', () => {
  const mockData = [
    { path: '/home', pageviews: 1234, uniqueVisitors: 456 },
    { path: '/about', pageviews: 890, uniqueVisitors: 234 },
    { path: '/contact', pageviews: 567, uniqueVisitors: 123 },
  ];

  it('renders table with valid data', () => {
    render(<TopPagesTable data={mockData} isLoading={false} error={null} />);

    expect(screen.getByText('/home')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('456')).toBeInTheDocument();
  });

  it('displays empty state message when no data', () => {
    render(<TopPagesTable data={[]} isLoading={false} error={null} />);

    expect(
      screen.getByText(/No pageviews recorded for this period/i)
    ).toBeInTheDocument();
  });

  it('displays error state with error message', () => {
    render(
      <TopPagesTable
        data={[]}
        isLoading={false}
        error="Unable to load data. Please try again."
      />
    );

    expect(screen.getByText(/Unable to load data/i)).toBeInTheDocument();
  });

  it('has correct table columns', () => {
    render(<TopPagesTable data={mockData} isLoading={false} error={null} />);

    expect(screen.getByText('Page Path')).toBeInTheDocument();
    expect(screen.getByText('Pageviews')).toBeInTheDocument();
    expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(<TopPagesTable data={[]} isLoading={true} error={null} />);

    const skeletons = screen.getAllByTestId('skeleton-row');
    expect(skeletons.length).toBe(10);
  });

  it('formats numbers with commas', () => {
    const dataWithLargeNumbers = [
      { path: '/popular', pageviews: 1234567, uniqueVisitors: 123456 },
    ];

    render(
      <TopPagesTable
        data={dataWithLargeNumbers}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('123,456')).toBeInTheDocument();
  });
});
