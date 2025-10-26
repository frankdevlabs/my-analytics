/**
 * GeographicDistributionChart Component
 *
 * Bar chart displaying visitor country distribution with pageview counts.
 * Follows the BarChartExample pattern with theme-aware styling.
 */

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BaseChart, useChartTheme } from './BaseChart';
import { chartStyles } from '@/config/chart-theme';
import type { CountryDistribution } from '@/lib/utils/countries';

export interface GeographicDistributionChartProps {
  /** Country distribution data array */
  data: CountryDistribution[];

  /** Error message to display */
  error?: string;

  /** Show loading skeleton state */
  isLoading?: boolean;

  /** Chart height in pixels */
  height?: number;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Custom tooltip formatter for pageview counts
 * Formats numbers with thousands separators
 */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { country?: string; countryName?: string; pageviews?: number; percentage?: number } }> }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  if (!data) {
    return null;
  }

  return (
    <div className="rounded bg-card border border-foreground/10 p-3 shadow-sm">
      <p className="font-body font-semibold text-sm mb-1">
        {data.countryName || data.country}
      </p>
      <p className="font-body text-sm text-muted-foreground">
        Pageviews: {data.pageviews?.toLocaleString() || 0}
      </p>
      <p className="font-body text-sm text-muted-foreground">
        Percentage: {data.percentage?.toFixed(2) || 0}%
      </p>
    </div>
  );
}

/**
 * GeographicDistributionChart component
 *
 * Displays country distribution data with vertical bars. Bars have 4px top corner
 * radius matching the design system. Supports loading, error, and empty states.
 *
 * @example
 * ```tsx
 * const data = [
 *   { countryCode: 'US', countryName: 'United States', pageviews: 1500, percentage: 50 },
 *   { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 900, percentage: 30 },
 * ];
 *
 * <GeographicDistributionChart
 *   data={data}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */
export function GeographicDistributionChart({
  data,
  error,
  isLoading = false,
  height = 300,
  className = '',
}: GeographicDistributionChartProps) {
  const theme = useChartTheme();

  // Loading state - show skeleton with aria-live
  if (isLoading) {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <div aria-live="polite" aria-busy="true" className="sr-only">
          Loading geographic distribution chart
        </div>
        <div
          className="w-full h-full bg-foreground/5 animate-pulse rounded"
          data-testid="chart-loading-skeleton"
        />
      </div>
    );
  }

  // Error state with aria-live for screen reader announcements
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`} style={{ height }}>
        <p
          className="text-destructive text-sm mb-2"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
        <p className="text-foreground/60 text-sm">
          Unable to load geographic distribution data.
        </p>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`} style={{ height }} role="status">
        <p className="text-foreground/60">
          No geographic data available for this period.
        </p>
        <p className="text-sm text-foreground/60 mt-2">
          Try selecting a different date range.
        </p>
      </div>
    );
  }

  return (
    <BaseChart
      title="Geographic Distribution by Country"
      description="Bar chart showing pageview distribution across countries"
      height={height}
      className={className}
    >
      <BarChart data={data}>
        <CartesianGrid {...theme.grid} />

        <XAxis
          dataKey="countryName"
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
          {...theme.axis}
        />

        <YAxis
          label={{ value: 'Pageviews', angle: -90, position: 'insideLeft' }}
          {...theme.axis}
        />

        <Tooltip content={<CustomTooltip />} />

        <Bar
          dataKey="pageviews"
          fill={theme.colors.primary}
          radius={chartStyles.barRadius}
        />
      </BarChart>
    </BaseChart>
  );
}
