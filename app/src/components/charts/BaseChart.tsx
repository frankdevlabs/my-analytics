/**
 * BaseChart Component
 *
 * Reusable wrapper for Recharts components that provides:
 * - Accessibility (ARIA labels, screen reader support)
 * - Theme awareness (automatic light/dark mode)
 * - Responsive container sizing
 * - Consistent styling
 */

'use client';

import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ResponsiveContainer } from 'recharts';
import { getChartTheme, chartA11y } from '@/config/chart-theme';

export interface BaseChartProps {
  /** Chart title for accessibility */
  title: string;

  /** Chart description for screen readers */
  description: string;

  /** Chart content (Recharts components) */
  children: React.ReactNode;

  /** Chart height in pixels */
  height?: number;

  /** Chart width (CSS value) */
  width?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Hook to get current chart theme based on system/user theme preference
 * Returns theme object with colors and isDark flag
 */
export function useChartTheme() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme || theme) === 'dark';

  return useMemo(() => ({
    ...getChartTheme(isDark),
    isDark,
  }), [isDark]);
}

/**
 * BaseChart wrapper component
 *
 * Wraps Recharts components with accessibility features and theme support.
 * All custom charts should use this wrapper for consistency.
 *
 * @example
 * ```tsx
 * <BaseChart
 *   title="Revenue Over Time"
 *   description="Line chart showing monthly revenue from Jan to Dec 2024"
 * >
 *   <LineChart data={data}>
 *     <Line dataKey="revenue" />
 *   </LineChart>
 * </BaseChart>
 * ```
 */
export function BaseChart({
  title,
  description,
  children,
  height = 300,
  width = '100%',
  className = '',
}: BaseChartProps) {
  // Generate unique ID from title for aria-describedby
  const chartId = useMemo(() => {
    return `chart-${title.toLowerCase().replace(/\s+/g, '-')}`;
  }, [title]);

  const ariaLabel = chartA11y.getChartTitle(title);
  const ariaDescription = chartA11y.getChartDescription(description);

  return (
    <div
      className={`chart-container ${className}`}
      role="img"
      aria-label={ariaLabel}
      aria-describedby={chartId}
    >
      {/* Hidden description for screen readers */}
      <div id={chartId} className="sr-only">
        {ariaDescription}
        {' '}
        {chartA11y.keyboardHint}
      </div>

      {/* Responsive chart wrapper */}
      <ResponsiveContainer width={width} height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
