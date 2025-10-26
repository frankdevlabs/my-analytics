/**
 * Chart Theme Configuration Tests
 *
 * Tests for chart color palettes, theme function, styling constants,
 * and accessibility utilities defined in chart-theme.ts
 */

import {
  chartColors,
  getChartTheme,
  chartStyles,
  chartA11y,
  getSeriesColor,
} from '@/config/chart-theme';

describe('Chart Theme Configuration', () => {
  describe('chartColors', () => {
    it('light mode colors are defined correctly', () => {
      expect(chartColors.light.primary).toBe('#09192B');
      expect(chartColors.light.accent).toBe('#D9BF65');
      expect(chartColors.light.tooltipBg).toBe('#F5F2EB');
      expect(chartColors.light.series).toHaveLength(7);
    });

    it('dark mode colors are defined correctly', () => {
      expect(chartColors.dark.primary).toBe('#FEFBF4');
      expect(chartColors.dark.accent).toBe('#D9BF65');
      expect(chartColors.dark.tooltipBg).toBe('#0F1F35');
      expect(chartColors.dark.series).toHaveLength(7);
    });

    it('accent color is consistent across modes', () => {
      expect(chartColors.light.accent).toBe(chartColors.dark.accent);
      expect(chartColors.light.accent).toBe('#D9BF65');
    });

    it('multi-series colors include both primary and accent', () => {
      expect(chartColors.light.series[0]).toBe('#09192B');
      expect(chartColors.light.series[1]).toBe('#D9BF65');
      expect(chartColors.dark.series[0]).toBe('#FEFBF4');
      expect(chartColors.dark.series[1]).toBe('#D9BF65');
    });
  });

  describe('getChartTheme', () => {
    it('returns light theme configuration when isDark is false', () => {
      const theme = getChartTheme(false);

      expect(theme.colors).toBe(chartColors.light);
      expect(theme.grid.stroke).toBe(chartColors.light.grid);
      expect(theme.axis.stroke).toBe(chartColors.light.axis);
    });

    it('returns dark theme configuration when isDark is true', () => {
      const theme = getChartTheme(true);

      expect(theme.colors).toBe(chartColors.dark);
      expect(theme.grid.stroke).toBe(chartColors.dark.grid);
      expect(theme.axis.stroke).toBe(chartColors.dark.axis);
    });

    it('theme includes proper styling configuration', () => {
      const theme = getChartTheme(false);

      expect(theme.grid.strokeDasharray).toBe('3 3');
      expect(theme.axis.style.fontSize).toBe(12);
      expect(theme.axis.style.fontFamily).toContain('Raleway');
    });

    it('tooltip configuration includes required styles', () => {
      const theme = getChartTheme(false);

      expect(theme.tooltip.contentStyle.backgroundColor).toBe(chartColors.light.tooltipBg);
      expect(theme.tooltip.contentStyle.borderRadius).toBe(4);
      expect(theme.tooltip.contentStyle.padding).toBe(16);
    });

    it('legend configuration is properly set', () => {
      const theme = getChartTheme(false);

      expect(theme.legend.iconType).toBe('circle');
      expect(theme.legend.wrapperStyle.fontSize).toBe(12);
      expect(theme.legend.wrapperStyle.fontFamily).toContain('Raleway');
    });
  });

  describe('chartStyles', () => {
    it('line stroke width is defined', () => {
      expect(chartStyles.lineStrokeWidth).toBe(2);
    });

    it('bar radius applies to top corners only', () => {
      expect(chartStyles.barRadius).toEqual([4, 4, 0, 0]);
    });

    it('area fill opacity is defined', () => {
      expect(chartStyles.areaFillOpacity).toBe(0.6);
    });

    it('pie chart dimensions are defined', () => {
      expect(chartStyles.pie.paddingAngle).toBe(2);
      expect(chartStyles.pie.innerRadius).toBe(60);
      expect(chartStyles.pie.outerRadius).toBe(100);
    });
  });

  describe('chartA11y', () => {
    it('generates accessible chart title', () => {
      const title = chartA11y.getChartTitle('  Monthly Revenue  ');
      expect(title).toBe('Monthly Revenue');
    });

    it('generates accessible description', () => {
      const description = chartA11y.getChartDescription('  Bar chart showing sales data  ');
      expect(description).toBe('Bar chart showing sales data');
    });

    it('provides keyboard navigation hint', () => {
      expect(chartA11y.keyboardHint).toContain('Tab');
      expect(chartA11y.keyboardHint).toContain('navigate');
    });
  });

  describe('getSeriesColor', () => {
    it('returns correct color for first series in light mode', () => {
      const color = getSeriesColor(0, false);
      expect(color).toBe('#09192B');
    });

    it('returns correct color for second series in light mode', () => {
      const color = getSeriesColor(1, false);
      expect(color).toBe('#D9BF65');
    });

    it('returns correct color for first series in dark mode', () => {
      const color = getSeriesColor(0, true);
      expect(color).toBe('#FEFBF4');
    });

    it('wraps around for indices beyond series length', () => {
      const color7 = getSeriesColor(7, false);
      const color0 = getSeriesColor(0, false);
      expect(color7).toBe(color0);
    });
  });
});
