/**
 * TopPagesDashboardSection Component
 *
 * Server component that wraps the TopPagesPerformanceTable client component.
 * Handles section heading and passes data/error props to the client component.
 *
 * @example
 * ```tsx
 * <TopPagesDashboardSection
 *   data={topPagesData}
 *   error={topPagesError}
 *   startDate={startDate}
 *   endDate={endDate}
 * />
 * ```
 */

import * as React from 'react';
import { TopPagesPerformanceTable, TopPageData } from './TopPagesPerformanceTable';

export interface TopPagesDashboardSectionProps {
  /** Top pages data (20 rows initially) */
  data: TopPageData[] | null;
  /** Error message if data fetch failed */
  error: string | null;
  /** Start date for date range filtering */
  startDate: Date;
  /** End date for date range filtering */
  endDate: Date;
}

/**
 * TopPagesDashboardSection component
 *
 * Server component wrapper for Top Pages Performance section.
 * Provides section heading with proper styling and passes props to client component.
 */
export function TopPagesDashboardSection({
  data,
  error,
  startDate,
  endDate,
}: TopPagesDashboardSectionProps) {
  return (
    <section aria-labelledby="top-pages-performance-heading">
      <h2
        id="top-pages-performance-heading"
        style={{ fontFamily: 'var(--font-heading)' }}
        className="text-2xl font-semibold mb-4 text-foreground"
      >
        Top Pages
      </h2>
      <TopPagesPerformanceTable
        data={data || []}
        error={error}
        startDate={startDate}
        endDate={endDate}
        isLoading={false}
      />
    </section>
  );
}
