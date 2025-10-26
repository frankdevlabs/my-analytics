/**
 * CountryDistributionTable Component
 *
 * Displays country distribution data in a table format with columns for
 * country name, pageviews, and percentage. Follows the TopPagesTable pattern
 * with loading, error, and empty states.
 */

import * as React from 'react';
import type { CountryDistribution } from '@/lib/utils/countries';

export interface CountryDistributionTableProps {
  /** Array of country distribution data */
  data: CountryDistribution[];

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
 * Formats a percentage with 2 decimal places and % symbol
 * @example formatPercentage(66.67) => "66.67%"
 */
function formatPercentage(num: number): string {
  return `${num.toFixed(2)}%`;
}

/**
 * CountryDistributionTable component
 *
 * Displays geographic distribution data in a responsive table format.
 * Supports loading skeleton, error state, and empty state for graceful degradation.
 *
 * @example
 * ```tsx
 * <CountryDistributionTable
 *   data={[
 *     { countryCode: 'US', countryName: 'United States', pageviews: 1500, percentage: 50 },
 *     { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 900, percentage: 30 }
 *   ]}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */
export const CountryDistributionTable = React.forwardRef<
  HTMLDivElement,
  CountryDistributionTableProps
>(({ data, isLoading = false, error = null }, ref) => {
  // Loading state - show skeleton rows with aria-live
  if (isLoading) {
    return (
      <div ref={ref} className="overflow-x-auto" role="region" aria-label="Country distribution table">
        <div aria-live="polite" aria-busy="true" className="sr-only">
          Loading country distribution data
        </div>
        <table className="w-full min-w-[500px]" aria-label="Geographic distribution by country">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[200px]" scope="col">
                Country
              </th>
              <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[120px]" scope="col">
                Pageviews
              </th>
              <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[100px]" scope="col">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr
                key={i}
                data-testid="loading-skeleton-row"
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
          Unable to load country distribution data.
        </p>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div ref={ref} className="text-center py-8" role="status">
        <p className="text-foreground/60">
          No geographic data available for this period.
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
      aria-label="Country distribution table"
      tabIndex={0}
    >
      <table className="w-full min-w-[500px]" aria-label="Geographic distribution by country">
        <thead>
          <tr className="border-b border-foreground/10">
            <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[200px]" scope="col">
              Country
            </th>
            <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[120px]" scope="col">
              Pageviews
            </th>
            <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[100px]" scope="col">
              Percentage
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((country, index) => (
            <tr key={index} className="border-b border-foreground/10">
              <td className="py-2 px-4 font-body text-base min-w-[200px]">
                {country.countryName}
              </td>
              <td className="text-right py-2 px-4 font-body text-base min-w-[120px]">
                {formatNumber(country.pageviews)}
              </td>
              <td className="text-right py-2 px-4 font-body text-base min-w-[100px]">
                {formatPercentage(country.percentage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

CountryDistributionTable.displayName = 'CountryDistributionTable';
