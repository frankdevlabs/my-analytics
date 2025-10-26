/**
 * TopPagesPerformanceTable Component
 *
 * Client component that displays top pages with sortable columns and "Show More" functionality.
 * Expands from 20 to 50 rows with a one-way expansion (no collapse).
 *
 * @example
 * ```tsx
 * <TopPagesPerformanceTable
 *   data={[
 *     { path: '/home', pageviews: 1234, uniqueVisitors: 456 },
 *     { path: '/about', pageviews: 890, uniqueVisitors: 234 }
 *   ]}
 *   startDate={new Date('2025-01-01')}
 *   endDate={new Date('2025-01-31')}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface TopPageData {
  path: string;
  pageviews: number;
  uniqueVisitors: number;
}

export interface TopPagesPerformanceTableProps {
  /** Initial data (20 rows) */
  data: TopPageData[];
  /** Start date for date range filtering */
  startDate: Date;
  /** End date for date range filtering */
  endDate: Date;
  /** Show loading skeleton state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

type SortColumn = 'path' | 'pageviews' | 'uniqueVisitors';
type SortDirection = 'asc' | 'desc';

/**
 * Formats a number with commas for thousands separator
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Truncates a path to specified length with ellipsis
 */
function truncatePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path;
  return `${path.substring(0, maxLength)}...`;
}

/**
 * TopPagesPerformanceTable component
 *
 * Displays top pages with sortable columns (Page Path, Pageviews, Unique Visitors).
 * Includes "Show More" button to expand from 20 to 50 rows.
 */
export const TopPagesPerformanceTable = React.forwardRef<
  HTMLDivElement,
  TopPagesPerformanceTableProps
>(({ data, startDate, endDate, isLoading = false, error = null }, ref) => {
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('pageviews');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [showExpanded, setShowExpanded] = React.useState(false);
  const [expandedData, setExpandedData] = React.useState<TopPageData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Determine which data to display
  const displayData = showExpanded && expandedData.length > 0 ? expandedData : data;

  // Sort data based on current sort column and direction
  const sortedData = React.useMemo(() => {
    if (!displayData || displayData.length === 0) return [];

    return [...displayData].sort((a, b) => {
      const aValue: string | number = a[sortColumn];
      const bValue: string | number = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [displayData, sortColumn, sortDirection]);

  /**
   * Handle column header click to toggle sort
   */
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default descending sort for numeric columns
      setSortColumn(column);
      setSortDirection(column === 'path' ? 'asc' : 'desc');
    }
  };

  /**
   * Handle Show More button click to fetch 50 rows
   */
  const handleShowMore = async () => {
    setIsLoadingMore(true);
    try {
      // Fetch 50 rows from API route
      const response = await fetch(
        `/api/top-pages?from=${startDate.toISOString()}&to=${endDate.toISOString()}&limit=50`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch expanded data');
      }

      const result = await response.json();
      setExpandedData(result.data || []);
      setShowExpanded(true);
    } catch (err) {
      console.error('Error fetching expanded data:', err);
      // Fallback: just show expanded state with current data
      setShowExpanded(true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  /**
   * Render sort indicator arrow
   */
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <span className="ml-1 text-foreground/30">↕</span>;
    }
    return (
      <span className="ml-1" aria-label={`Sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  /**
   * Render sortable column header
   */
  const renderColumnHeader = (
    column: SortColumn,
    label: string,
    align: 'left' | 'right' = 'left'
  ) => {
    const textAlign = align === 'right' ? 'text-right' : 'text-left';

    return (
      <th
        className={`${textAlign} py-2 px-4 font-body text-sm font-semibold cursor-pointer hover:bg-foreground/5 select-none transition-colors`}
        scope="col"
        onClick={() => handleSort(column)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort(column);
          }
        }}
        tabIndex={0}
        aria-sort={
          sortColumn === column
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
      >
        {label}
        {renderSortIndicator(column)}
      </th>
    );
  };

  // Loading state - show skeleton rows
  if (isLoading) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
            Top Pages Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" role="region" aria-label="Top pages performance table">
            <div aria-live="polite" aria-busy="true" className="sr-only">
              Loading top pages performance data
            </div>
            <table className="w-full min-w-[600px]" aria-label="Top pages by performance">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[250px]" scope="col">
                    Page Path
                  </th>
                  <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[120px]" scope="col">
                    Pageviews
                  </th>
                  <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[140px]" scope="col">
                    Unique Visitors
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 20 }).map((_, i) => (
                  <tr
                    key={i}
                    data-testid="loading-skeleton-row"
                    className="border-b border-foreground/10"
                  >
                    <td className="py-2 px-4">
                      <div className="h-4 bg-foreground/10 animate-pulse rounded w-full max-w-md" />
                    </td>
                    <td className="py-2 px-4">
                      <div className="h-4 bg-foreground/10 animate-pulse rounded w-16 ml-auto" />
                    </td>
                    <td className="py-2 px-4">
                      <div className="h-4 bg-foreground/10 animate-pulse rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
            Top Pages Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p
              className="text-destructive text-sm mb-2"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
            <p className="text-foreground/60 text-sm">
              Unable to load top pages performance data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!displayData || displayData.length === 0) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
            Top Pages Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8" role="status">
            <p className="text-foreground/60">
              No data recorded for this period.
            </p>
            <p className="text-sm text-foreground/60 mt-2">
              Try selecting a different date range.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Data display with sortable table
  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
          Top Pages Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Top pages performance table"
          tabIndex={0}
        >
          <table className="w-full min-w-[600px]" aria-label="Top pages by performance">
            <thead>
              <tr className="border-b border-foreground/10">
                {renderColumnHeader('path', 'Page Path', 'left')}
                {renderColumnHeader('pageviews', 'Pageviews', 'right')}
                {renderColumnHeader('uniqueVisitors', 'Unique Visitors', 'right')}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((page, index) => (
                <tr key={index} className="border-b border-foreground/10">
                  <td
                    className="py-2 px-4 font-body text-base min-w-[250px]"
                    title={page.path}
                  >
                    {truncatePath(page.path, 60)}
                  </td>
                  <td className="text-right py-2 px-4 font-body text-base min-w-[120px]">
                    {formatNumber(page.pageviews)}
                  </td>
                  <td className="text-right py-2 px-4 font-body text-base min-w-[140px]">
                    {formatNumber(page.uniqueVisitors)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show More button - only visible when showing 20 rows and not yet expanded */}
        {!showExpanded && displayData.length >= 20 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={handleShowMore}
              disabled={isLoadingMore}
              aria-label="Show more pages"
            >
              {isLoadingMore ? 'Loading...' : 'Show More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TopPagesPerformanceTable.displayName = 'TopPagesPerformanceTable';
