/**
 * PageviewsOverTimeChart Component
 *
 * Displays daily pageview trends over time with two data series:
 * - Total Pageviews
 * - Unique Visitors
 *
 * Uses BaseChart wrapper for accessibility and theme support.
 * Follows LineChartExample.tsx pattern exactly.
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BaseChart, useChartTheme } from './BaseChart';
import { chartStyles, getSeriesColor } from '@/config/chart-theme';

/**
 * Data point for daily pageview aggregation
 */
export interface PageviewsOverTimeData {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Total pageviews for the date */
  pageviews: number;
  /** Unique visitors for the date */
  uniqueVisitors: number;
}

/**
 * Props for PageviewsOverTimeChart component
 */
export interface PageviewsOverTimeChartProps {
  /** Array of daily pageview data */
  data: PageviewsOverTimeData[];

  /** Optional error message to display */
  error?: string;

  /** Whether data is currently loading */
  isLoading: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * PageviewsOverTimeChart component
 *
 * Renders a line chart showing pageview trends over time.
 * Implements three-state rendering: loading, error, and data states.
 *
 * @example
 * ```tsx
 * const data = [
 *   { date: '2025-10-15', pageviews: 1200, uniqueVisitors: 800 },
 *   { date: '2025-10-16', pageviews: 1500, uniqueVisitors: 950 },
 * ];
 *
 * <PageviewsOverTimeChart
 *   data={data}
 *   isLoading={false}
 * />
 * ```
 */
export function PageviewsOverTimeChart({
  data,
  error,
  isLoading,
  className = '',
}: PageviewsOverTimeChartProps) {
  const theme = useChartTheme();

  // Loading state - show skeleton loader
  if (isLoading) {
    return (
      <div className={`h-[400px] w-full bg-muted animate-pulse rounded ${className}`} />
    );
  }

  // Error state - display error message
  if (error) {
    return (
      <div className={`flex items-center justify-center h-[400px] ${className}`}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  // Empty state - no data available
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[400px] ${className}`}>
        <p className="text-sm text-muted-foreground">
          No pageview data available for the selected date range
        </p>
      </div>
    );
  }

  // Responsive height based on viewport
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const chartHeight = isMobile ? 300 : 400;

  // Data state - render chart
  return (
    <BaseChart
      title="Pageviews Over Time"
      description="Line chart showing daily pageview trends with total pageviews and unique visitors"
      height={chartHeight}
      className={className}
    >
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid {...theme.grid} />

        <XAxis
          dataKey="date"
          {...theme.axis}
        />

        <YAxis {...theme.axis} />

        <Tooltip {...theme.tooltip} />

        <Legend {...theme.legend} />

        {/* Total Pageviews Line - First color from theme */}
        <Line
          dataKey="pageviews"
          name="Total Pageviews"
          stroke={getSeriesColor(0, theme.isDark)}
          strokeWidth={chartStyles.lineStrokeWidth}
          type="monotone"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />

        {/* Unique Visitors Line - Second color from theme */}
        <Line
          dataKey="uniqueVisitors"
          name="Unique Visitors"
          stroke={getSeriesColor(1, theme.isDark)}
          strokeWidth={chartStyles.lineStrokeWidth}
          type="monotone"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </BaseChart>
  );
}
