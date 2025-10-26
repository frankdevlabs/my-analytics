/**
 * MetricCard Component
 * Displays a single metric value with a descriptive label in a card format.
 * Supports loading, error, and empty states for graceful degradation.
 * Optionally displays period comparison indicators below the metric value.
 *
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Pageviews"
 *   value={12345}
 *   isLoading={false}
 *   error={null}
 *   previousValue={10000}
 *   showComparison={true}
 * />
 * ```
 */

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { ComparisonIndicator } from './comparison-indicator';

export interface MetricCardProps {
  /** Descriptive label for the metric (e.g., "Total Pageviews") */
  title: string;
  /** Metric value, null during loading or error */
  value: number | null;
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Optional icon - Phase 1: leave undefined (visual polish for Phase 2) */
  icon?: React.ReactNode;
  /** Previous period value for comparison (optional) */
  previousValue?: number | null;
  /** Whether to show the comparison indicator */
  showComparison?: boolean;
}

/**
 * Formats a number with commas for thousands separator
 * @example formatNumber(1234567) => "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      title,
      value,
      isLoading = false,
      error = null,
      icon,
      previousValue = null,
      showComparison = false,
    },
    ref
  ) => {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Loading skeleton state with aria-live for screen readers
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              <div
                data-testid="skeleton"
                className="h-10 w-24 bg-foreground/10 animate-pulse rounded"
              />
              {showComparison && (
                <div className="h-4 w-16 bg-foreground/10 animate-pulse rounded" />
              )}
              <span className="sr-only">Loading {title}</span>
            </div>
          ) : error ? (
            // Error state with aria-live for screen reader announcements
            <div
              className="text-destructive text-sm"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          ) : (
            // Loaded state with formatted value
            <div className="space-y-1">
              <div className="font-heading text-4xl font-semibold">
                {value !== null ? formatNumber(value) : '—'}
              </div>
              {showComparison && value !== null && (
                <ComparisonIndicator
                  currentValue={value}
                  previousValue={previousValue}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

MetricCard.displayName = 'MetricCard';
