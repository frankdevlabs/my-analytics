/**
 * ReferrerSourcesChart Component
 *
 * Displays a bar chart showing pageview counts by referrer category
 * (Direct, Search, Social, External). Uses BaseChart wrapper for
 * theme support and accessibility. Uses multi-color scheme for better
 * visual distinction between categories.
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
  Cell,
} from 'recharts';
import { BaseChart, useChartTheme } from '@/components/charts/BaseChart';
import { chartStyles, getSeriesColor } from '@/config/chart-theme';

export interface ReferrerCategoryData {
  category: string;
  pageviews: number;
}

export interface ReferrerSourcesChartProps {
  /** Array of category data with pageview counts */
  data: ReferrerCategoryData[];

  /** Chart height in pixels */
  height?: number;

  /** Additional CSS classes */
  className?: string;
}

/**
 * ReferrerSourcesChart component
 *
 * Displays referrer categories (Direct, Search, Social, External) as
 * a bar chart with 4px border radius following the design system.
 * Shows all 4 categories even if some have 0 pageviews.
 * Each category uses a different color for better visual distinction.
 *
 * @example
 * ```tsx
 * <ReferrerSourcesChart
 *   data={[
 *     { category: 'Direct', pageviews: 1500 },
 *     { category: 'Search', pageviews: 800 },
 *     { category: 'Social', pageviews: 300 },
 *     { category: 'External', pageviews: 200 }
 *   ]}
 * />
 * ```
 */
export function ReferrerSourcesChart({
  data,
  height = 300,
  className = '',
}: ReferrerSourcesChartProps) {
  const theme = useChartTheme();
  const isDark = theme.colors.primary === '#FEFBF4'; // Detect dark mode

  // Ensure all categories are present with default 0 values
  const allCategories = ['Direct', 'Search', 'Social', 'External'];
  const chartData = allCategories.map(category => {
    const existing = data.find(d => d.category === category);
    return {
      category,
      pageviews: existing?.pageviews || 0,
    };
  });

  return (
    <BaseChart
      title="Referrer Sources by Category"
      description="Bar chart showing pageview distribution across Direct, Search, Social, and External referrer categories with distinct colors for each category"
      height={height}
      className={className}
    >
      <BarChart data={chartData}>
        <CartesianGrid {...theme.grid} />

        <XAxis
          dataKey="category"
          {...theme.axis}
        />

        <YAxis {...theme.axis} />

        <Tooltip {...theme.tooltip} />

        <Bar
          dataKey="pageviews"
          radius={chartStyles.barRadius}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getSeriesColor(index, isDark)} />
          ))}
        </Bar>
      </BarChart>
    </BaseChart>
  );
}
