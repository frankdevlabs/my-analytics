/**
 * Tests for Color Accessibility & UI Cleanup
 * Task Group 3: Color palette reordering, multi-color charts, and component removal
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { chartColors, getSeriesColor } from '@/config/chart-theme';
import { ReferrerSourcesChart } from '@/components/dashboard/referrer-sources/ReferrerSourcesChart';
import { GeographicDistributionChart } from '@/components/charts/GeographicDistributionChart';

// Mock the BaseChart and Recharts components
jest.mock('@/components/charts/BaseChart', () => ({
  BaseChart: ({ children, title, description }: { children?: React.ReactNode; title?: string; description?: string }) => (
    <div data-testid="base-chart" aria-label={title}>
      <span className="sr-only">{description}</span>
      {children}
    </div>
  ),
  useChartTheme: () => ({
    colors: {
      primary: '#D9BF65', // Gold (reordered to first position)
      primaryOpacity40: 'rgba(217, 191, 101, 0.4)',
      grid: 'rgba(9, 25, 43, 0.1)',
      axis: 'rgba(9, 25, 43, 0.5)',
    },
    grid: { stroke: 'rgba(9, 25, 43, 0.1)', strokeDasharray: '3 3' },
    axis: { stroke: 'rgba(9, 25, 43, 0.5)', style: { fontSize: 12 } },
    tooltip: { contentStyle: {}, cursor: {} },
  }),
}));

jest.mock('recharts', () => ({
  BarChart: ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-item-count={data?.length}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill, children }: { dataKey?: string; fill?: string; children?: React.ReactNode }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill}>
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill?: string }) => <div data-testid="bar-cell" data-fill={fill} />,
  XAxis: ({ dataKey }: { dataKey?: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('Color Accessibility & UI Cleanup', () => {
  describe('Color palette reordering', () => {
    it('should have gold (#D9BF65) as first color in light mode series', () => {
      const firstColor = chartColors.light.series[0];
      expect(firstColor).toBe('#D9BF65');
    });

    it('should have navy (#09192B) as last color in light mode series', () => {
      const lastColor = chartColors.light.series[chartColors.light.series.length - 1];
      expect(lastColor).toBe('#09192B');
    });

    it('should maintain color cycling with getSeriesColor()', () => {
      // Test that color cycling works correctly after reordering
      const color0 = getSeriesColor(0, false);
      const color1 = getSeriesColor(1, false);
      const color8 = getSeriesColor(8, false); // Should wrap to index 0 (8 colors total)

      expect(color0).toBe(chartColors.light.series[0]);
      expect(color1).toBe(chartColors.light.series[1]);
      expect(color8).toBe(chartColors.light.series[0]); // Wrapped (8 % 8 = 0)
    });

    it('should return colors from correct palette for light vs dark mode', () => {
      const lightColor0 = getSeriesColor(0, false);
      const lightColor1 = getSeriesColor(1, false);
      const darkColor0 = getSeriesColor(0, true);
      const darkColor1 = getSeriesColor(1, true);

      // Verify colors come from correct palettes
      expect(lightColor0).toBe(chartColors.light.series[0]);
      expect(lightColor1).toBe(chartColors.light.series[1]);
      expect(darkColor0).toBe(chartColors.dark.series[0]);
      expect(darkColor1).toBe(chartColors.dark.series[1]);

      // Light blue and dark blue should be different shades
      expect(lightColor1).toBe('#3B82F6'); // Light mode blue
      expect(darkColor1).toBe('#60A5FA'); // Dark mode blue (lighter)
      expect(lightColor1).not.toBe(darkColor1);
    });

    it('should have high-contrast gold as first color in dark mode series', () => {
      const firstColor = chartColors.dark.series[0];
      expect(firstColor).toBe('#D9BF65');
    });
  });

  describe('Referrer Sources chart multi-color scheme', () => {
    it('should render ReferrerSourcesChart with multiple data points', () => {
      const data = [
        { category: 'Direct', pageviews: 1500 },
        { category: 'Search', pageviews: 800 },
        { category: 'Social', pageviews: 300 },
        { category: 'External', pageviews: 200 },
      ];

      render(<ReferrerSourcesChart data={data} />);

      expect(screen.getByTestId('base-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-item-count', '4');
    });

    it('should render Cell components for multi-color bars', () => {
      const data = [
        { category: 'Direct', pageviews: 1500 },
        { category: 'Search', pageviews: 800 },
        { category: 'Social', pageviews: 300 },
        { category: 'External', pageviews: 200 },
      ];

      render(<ReferrerSourcesChart data={data} />);

      // Should render Cell components (one per bar for different colors)
      const cells = screen.getAllByTestId('bar-cell');
      expect(cells.length).toBe(4); // 4 categories = 4 colored bars
    });
  });

  describe('Geographic Distribution maintains single color', () => {
    it('should use single primary color for all bars', () => {
      const data = [
        { countryCode: 'US', countryName: 'United States', pageviews: 1500, percentage: 50 },
        { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 900, percentage: 30 },
        { countryCode: 'CA', countryName: 'Canada', pageviews: 600, percentage: 20 },
      ];

      render(<GeographicDistributionChart data={data} />);

      const barElement = screen.getByTestId('bar-pageviews');
      // Should use theme.colors.primary (single color)
      expect(barElement).toHaveAttribute('data-fill', '#D9BF65');
    });
  });
});
