/**
 * AreaChartExample Component
 *
 * Styled area chart following Frank's Blog aesthetic.
 * Use for cumulative data and volume visualization over time.
 */

'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BaseChart, useChartTheme } from './BaseChart';
import { chartStyles, getSeriesColor } from '@/config/chart-theme';

export interface AreaChartData {
  [key: string]: string | number;
}

export interface AreaChartExampleProps {
  /** Chart data array */
  data: AreaChartData[];

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
 * AreaChartExample component
 *
 * Displays data series with filled areas and smooth curves.
 * Gradient fill from 80% to 10% opacity for subtle effect.
 *
 * @example
 * ```tsx
 * const data = [
 *   { month: 'Jan', visitors: 4000, pageViews: 2400 },
 *   { month: 'Feb', visitors: 3000, pageViews: 1398 },
 * ];
 *
 * <AreaChartExample
 *   data={data}
 *   dataKeys={['visitors', 'pageViews']}
 *   xAxisKey="month"
 *   title="Website Traffic Over Time"
 *   description="Area chart showing visitors and page views monthly"
 * />
 * ```
 */
export function AreaChartExample({
  data,
  dataKeys,
  xAxisKey,
  title,
  description,
  height = 300,
  className = '',
}: AreaChartExampleProps) {
  const theme = useChartTheme();

  return (
    <BaseChart
      title={title}
      description={description}
      height={height}
      className={className}
    >
      <AreaChart data={data}>
        <defs>
          {dataKeys.map((key, index) => {
            const color = getSeriesColor(index, theme.isDark);
            return (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>

        <CartesianGrid {...theme.grid} />

        <XAxis
          dataKey={xAxisKey}
          {...theme.axis}
        />

        <YAxis {...theme.axis} />

        <Tooltip {...theme.tooltip} />

        <Legend {...theme.legend} />

        {dataKeys.map((key, index) => (
          <Area
            key={key}
            dataKey={key}
            stroke={getSeriesColor(index, theme.isDark)}
            strokeWidth={chartStyles.lineStrokeWidth}
            fill={`url(#gradient-${key})`}
            type="monotone"
            fillOpacity={chartStyles.areaFillOpacity}
          />
        ))}
      </AreaChart>
    </BaseChart>
  );
}
