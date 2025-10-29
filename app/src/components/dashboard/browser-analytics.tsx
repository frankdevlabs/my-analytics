/**
 * BrowserAnalytics Component
 *
 * Displays browser distribution with top 5 browsers plus "Other" category:
 * - Donut chart visualization
 * - Sortable data table with counts and percentages
 * - Loading, empty, and error state handling
 * - All versions of the same browser are grouped together (no version numbers shown)
 *
 * @example
 * ```tsx
 * <BrowserAnalytics
 *   data={[
 *     { browser: 'Google Chrome', count: 3500, percentage: 43.75 },
 *     { browser: 'Safari', count: 2000, percentage: 25.0 },
 *     { browser: 'Firefox', count: 1500, percentage: 18.75 },
 *     { browser: 'Microsoft Edge', count: 500, percentage: 6.25 },
 *     { browser: 'Unknown', count: 300, percentage: 3.75 },
 *     { browser: 'Other', count: 200, percentage: 2.5 }
 *   ]}
 *   isLoading={false}
 *   error={null}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SortableTable, ColumnConfig } from './sortable-table';
import { useChartTheme } from '@/components/charts/BaseChart';
import { getSeriesColor } from '@/config/chart-theme';
import type { BrowserData } from '@/lib/db/pageviews';

export interface BrowserAnalyticsProps {
  /** Browser data array (top 5 + Other) */
  data: BrowserData[];
  /** Loading state flag */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
}

/**
 * Custom tooltip for pie chart
 * Displays browser name and count
 */
const CustomTooltip = React.memo<{
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  contentStyle?: React.CSSProperties;
}>(({ active, payload, contentStyle }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    return (
      <div
        style={contentStyle}
        className="rounded shadow-sm"
      >
        <p className="font-semibold">{data.name}</p>
        <p>Count: {data.value?.toLocaleString('en-US')}</p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

/**
 * BrowserAnalytics Component
 *
 * Renders browser breakdown with pie chart and sortable table.
 * Displays top 5 browsers plus "Other" category for remaining browsers.
 * All versions of each browser are grouped together (e.g., "Google Chrome" includes all versions).
 * Handles loading skeleton, empty state, and error display.
 */
export function BrowserAnalytics({
  data,
  isLoading,
  error,
}: BrowserAnalyticsProps) {
  const theme = useChartTheme();

  // Column configuration for sortable table
  const columns: ColumnConfig[] = React.useMemo(
    () => [
      {
        key: 'browser',
        label: 'Name',
        sortable: true,
        align: 'left',
      },
      {
        key: 'count',
        label: 'Count',
        sortable: true,
        align: 'right',
        format: (value: unknown) => typeof value === 'number' ? value.toLocaleString('en-US') : String(value),
      },
      {
        key: 'percentage',
        label: 'Percentage',
        sortable: true,
        align: 'right',
        format: (value: unknown) => typeof value === 'number' ? `${value.toFixed(1)}%` : String(value),
      },
    ],
    []
  );

  // Loading state with skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold">
            Browsers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chart skeleton */}
          <div
            className="w-full h-[300px] flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="w-48 h-48 rounded-full bg-foreground/10 animate-pulse" />
            <span className="sr-only">Loading browser data</span>
          </div>

          {/* Table skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-2 px-4 font-body text-sm font-semibold">
                    Name
                  </th>
                  <th className="text-right py-2 px-4 font-body text-sm font-semibold">
                    Count
                  </th>
                  <th className="text-right py-2 px-4 font-body text-sm font-semibold">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-foreground/10">
                    <td className="py-2 px-4">
                      <div className="h-4 bg-foreground/10 animate-pulse rounded w-32" />
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
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold">
            Browsers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive text-sm mb-2" role="alert" aria-live="polite">
              {error}
            </p>
            <p className="text-foreground/60 text-sm">
              Unable to load browser data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold">
            Browsers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" role="status">
            <p className="text-foreground/60 text-base">
              No data recorded for this period
            </p>
            <p className="text-sm text-foreground/60 mt-2">
              Try selecting a different date range.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for pie chart
  const chartData = data.map((item) => ({
    name: item.browser,
    value: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-semibold">
          Browsers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pie Chart */}
        <div
          role="img"
          aria-label="Browser distribution pie chart"
          aria-describedby="browser-chart-desc"
        >
          <div id="browser-chart-desc" className="sr-only">
            Pie chart showing visitor distribution across browser types.
            Displays top 5 browsers plus &quot;Other&quot; category for remaining browsers.
            Use the table below to view exact numbers and sort the data.
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getSeriesColor(index, theme.isDark)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip contentStyle={theme.tooltip.contentStyle} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sortable Table */}
        <SortableTable
          data={data as unknown as Array<Record<string, unknown>>}
          columns={columns}
          defaultSort={{ column: 'count', direction: 'desc' }}
        />
      </CardContent>
    </Card>
  );
}
