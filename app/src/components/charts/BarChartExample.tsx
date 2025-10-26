/**
 * BarChartExample Component
 *
 * Styled bar chart following Frank's Blog aesthetic.
 * Use for categorical data comparison and distribution visualization.
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
  Legend,
} from 'recharts';
import { BaseChart, useChartTheme } from './BaseChart';
import { chartStyles, getSeriesColor } from '@/config/chart-theme';

export interface BarChartData {
  [key: string]: string | number;
}

export interface BarChartExampleProps {
  /** Chart data array */
  data: BarChartData[];

  /** Keys for data series to display */
  dataKeys: string[];

  /** X-axis data key */
  xAxisKey: string;

  /** Chart title for accessibility */
  title: string;

  /** Chart description for screen readers */
  description: string;

  /** Chart height in pixels */
  height?: number;

  /** Additional CSS classes */
  className?: string;
}

/**
 * BarChartExample component
 *
 * Displays categorical data with vertical bars. Bars have 4px top corner radius
 * matching the design system.
 *
 * @example
 * ```tsx
 * const data = [
 *   { category: 'Product A', sales: 4000, profit: 2400 },
 *   { category: 'Product B', sales: 3000, profit: 1398 },
 * ];
 *
 * <BarChartExample
 *   data={data}
 *   dataKeys={['sales', 'profit']}
 *   xAxisKey="category"
 *   title="Sales and Profit by Product"
 *   description="Bar chart comparing sales and profit across products"
 * />
 * ```
 */
export function BarChartExample({
  data,
  dataKeys,
  xAxisKey,
  title,
  description,
  height = 300,
  className = '',
}: BarChartExampleProps) {
  const theme = useChartTheme();

  return (
    <BaseChart
      title={title}
      description={description}
      height={height}
      className={className}
    >
      <BarChart data={data}>
        <CartesianGrid {...theme.grid} />

        <XAxis
          dataKey={xAxisKey}
          {...theme.axis}
        />

        <YAxis {...theme.axis} />

        <Tooltip {...theme.tooltip} />

        <Legend {...theme.legend} />

        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={getSeriesColor(index, theme.isDark)}
            radius={chartStyles.barRadius}
          />
        ))}
      </BarChart>
    </BaseChart>
  );
}
