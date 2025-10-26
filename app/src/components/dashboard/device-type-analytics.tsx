/**
 * DeviceTypeAnalytics Component
 *
 * Displays device type distribution (Desktop, Mobile, Tablet) with:
 * - Donut chart visualization
 * - Sortable data table with counts and percentages
 * - Loading, empty, and error state handling
 *
 * @example
 * ```tsx
 * <DeviceTypeAnalytics
 *   data={[
 *     { device_type: 'Desktop', count: 5000, percentage: 62.5 },
 *     { device_type: 'Mobile', count: 2500, percentage: 31.25 },
 *     { device_type: 'Tablet', count: 500, percentage: 6.25 }
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
import type { DeviceTypeData } from '@/lib/db/pageviews';

export interface DeviceTypeAnalyticsProps {
  /** Device type data array */
  data: DeviceTypeData[];
  /** Loading state flag */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
}

/**
 * Custom tooltip for pie chart
 * Displays device type name and count
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
 * DeviceTypeAnalytics Component
 *
 * Renders device type breakdown with pie chart and sortable table.
 * Handles loading skeleton, empty state, and error display.
 */
export function DeviceTypeAnalytics({
  data,
  isLoading,
  error,
}: DeviceTypeAnalyticsProps) {
  const theme = useChartTheme();

  // Column configuration for sortable table
  const columns: ColumnConfig[] = React.useMemo(
    () => [
      {
        key: 'device_type',
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
            Device Types
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
            <span className="sr-only">Loading device type data</span>
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
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-foreground/10">
                    <td className="py-2 px-4">
                      <div className="h-4 bg-foreground/10 animate-pulse rounded w-24" />
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
            Device Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive text-sm mb-2" role="alert" aria-live="polite">
              {error}
            </p>
            <p className="text-foreground/60 text-sm">
              Unable to load device type data.
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
            Device Types
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
    name: item.device_type,
    value: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-semibold">
          Device Types
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pie Chart */}
        <div
          role="img"
          aria-label="Device type distribution pie chart"
          aria-describedby="device-chart-desc"
        >
          <div id="device-chart-desc" className="sr-only">
            Pie chart showing visitor distribution across device types: Desktop, Mobile, and Tablet.
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
