/**
 * PieChartExample Component
 *
 * Styled pie/donut chart following Frank's Blog aesthetic.
 * Use for part-to-whole relationships and proportional data.
 */

'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { BaseChart, useChartTheme } from './BaseChart';
import { chartStyles, getSeriesColor } from '@/config/chart-theme';

export interface PieChartData {
  name: string;
  value: number;
}

export interface PieChartExampleProps {
  /** Chart data array */
  data: PieChartData[];

  /** Chart title for accessibility */
  title: string;

  /** Chart description for screen readers */
  description: string;

  /** Whether to render as donut chart (with inner radius) */
  donut?: boolean;

  /** Chart height in pixels */
  height?: number;

  /** Additional CSS classes */
  className?: string;
}

/**
 * PieChartExample component
 *
 * Displays proportional data in a circular chart.
 * Can be rendered as a standard pie or donut chart.
 *
 * @example
 * ```tsx
 * const data = [
 *   { name: 'Desktop', value: 400 },
 *   { name: 'Mobile', value: 300 },
 *   { name: 'Tablet', value: 200 },
 * ];
 *
 * <PieChartExample
 *   data={data}
 *   title="Traffic by Device Type"
 *   description="Pie chart showing visitor distribution across devices"
 *   donut={true}
 * />
 * ```
 */
export function PieChartExample({
  data,
  title,
  description,
  donut = false,
  height = 300,
  className = '',
}: PieChartExampleProps) {
  const theme = useChartTheme();

  return (
    <BaseChart
      title={title}
      description={description}
      height={height}
      className={className}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={chartStyles.pie.outerRadius}
          innerRadius={donut ? chartStyles.pie.innerRadius : 0}
          paddingAngle={chartStyles.pie.paddingAngle}
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getSeriesColor(index, theme.isDark)}
            />
          ))}
        </Pie>

        <Tooltip {...theme.tooltip} />

        <Legend {...theme.legend} />
      </PieChart>
    </BaseChart>
  );
}
