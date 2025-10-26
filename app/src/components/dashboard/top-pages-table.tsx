/**
 * TopPagesTable Component
 * Displays the top 10 pages with path, pageviews, and unique visitors.
 * Supports loading, empty, and error states for graceful degradation.
 *
 * @example
 * ```tsx
 * <TopPagesTable
 *   data={[
 *     { path: '/home', pageviews: 1234, uniqueVisitors: 456 },
 *     { path: '/about', pageviews: 890, uniqueVisitors: 234 }
 *   ]}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */

import * as React from 'react';

export interface TopPagesTableProps {
  /** Array of page data with path, pageviews, and unique visitors */
  data: Array<{
    path: string;
    pageviews: number;
    uniqueVisitors: number;
  }>;
  /** Show loading skeleton state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

/**
 * Formats a number with commas for thousands separator
 * @example formatNumber(1234567) => "1,234,567"
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

export const TopPagesTable = React.forwardRef<
  HTMLDivElement,
  TopPagesTableProps
>(({ data, isLoading = false, error = null }, ref) => {
  // Loading state - show skeleton rows with aria-live
  if (isLoading) {
    return (
      <div ref={ref} className="overflow-x-auto" role="region" aria-label="Top pages table">
        <div aria-live="polite" aria-busy="true" className="sr-only">
          Loading top pages data
        </div>
        <table className="w-full min-w-[500px]" aria-label="Top 10 pages">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[200px]" scope="col">
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
            {Array.from({ length: 10 }).map((_, i) => (
              <tr
                key={i}
                data-testid="skeleton-row"
                className="border-b border-foreground/10"
              >
                <td className="py-2 px-4">
                  <div className="h-4 bg-foreground/10 animate-pulse rounded w-full max-w-xs" />
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
    );
  }

  // Error state with aria-live for screen reader announcements
  if (error) {
    return (
      <div ref={ref} className="text-center py-8">
        <p
          className="text-destructive text-sm mb-2"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
        <p className="text-foreground/60 text-sm">
          Unable to load top pages data.
        </p>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div ref={ref} className="text-center py-8" role="status">
        <p className="text-foreground/60">
          No pageviews recorded for this period.
        </p>
        <p className="text-sm text-foreground/60 mt-2">
          Try selecting a different date range.
        </p>
      </div>
    );
  }

  // Data display with semantic HTML table and proper ARIA labels
  return (
    <div
      ref={ref}
      className="overflow-x-auto"
      role="region"
      aria-label="Top pages table"
      tabIndex={0}
    >
      <table className="w-full min-w-[500px]" aria-label="Top 10 pages by pageviews">
        <thead>
          <tr className="border-b border-foreground/10">
            <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[200px]" scope="col">
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
          {data.map((page, index) => (
            <tr key={index} className="border-b border-foreground/10">
              <td
                className="py-2 px-4 font-body text-base min-w-[200px]"
                title={page.path}
              >
                {truncatePath(page.path, 50)}
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
  );
});

TopPagesTable.displayName = 'TopPagesTable';
