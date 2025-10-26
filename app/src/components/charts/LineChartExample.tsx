/**
 * LineChartExample Component
 *
 * Styled line chart following Frank's Blog aesthetic.
 * Use for time series data and trend visualization.
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

export interface LineChartData {
  [key: string]: string | number;
}

export interface LineChartExampleProps {
  /** Chart data array */
  data: LineChartData[];

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
 * LineChartExample component
 *
 * Displays time series or sequential data with smooth curves.
 *
 * @example
 * ```tsx
 * const data = [
 *   { month: 'Jan', revenue: 4000, expenses: 2400 },
 *   { month: 'Feb', revenue: 3000, expenses: 1398 },
 * ];
 *
 * <LineChartExample
 *   data={data}
 *   dataKeys={['revenue', 'expenses']}
 *   xAxisKey="month"
 *   title="Monthly Revenue and Expenses"
 *   description="Line chart comparing revenue and expenses over time"
 * />
 * ```
 */
export function LineChartExample({
  data,
  dataKeys,
  xAxisKey,
  title,
  description,
  height = 300,
  className = '',
}: LineChartExampleProps) {
  const theme = useChartTheme();

  return (
    <BaseChart
      title={title}
      description={description}
      height={height}
      className={className}
    >
      <LineChart data={data}>
        <CartesianGrid {...theme.grid} />

        <XAxis
          dataKey={xAxisKey}
          {...theme.axis}
        />

        <YAxis {...theme.axis} />

        <Tooltip {...theme.tooltip} />

        <Legend {...theme.legend} />

        {dataKeys.map((key, index) => (
          <Line
            key={key}
            dataKey={key}
            stroke={getSeriesColor(index, theme.isDark)}
            strokeWidth={chartStyles.lineStrokeWidth}
            type="monotone"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </BaseChart>
  );
}
