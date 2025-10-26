/**
 * Chart Theme Configuration
 *
 * Provides color palettes and styling configuration for Recharts components
 * following Frank's Blog aesthetic. Integrates with design system tokens
 * defined in globals.css for automatic light/dark mode support.
 */

/**
 * Chart color palettes for light and dark modes
 * Uses Frank's Blog color scheme with semantic naming
 */
export const chartColors = {
  light: {
    /** Primary data series colors - Navy variations */
    primary: '#09192B',           // Main navy
    primaryOpacity80: 'rgba(9, 25, 43, 0.8)',
    primaryOpacity60: 'rgba(9, 25, 43, 0.6)',
    primaryOpacity40: 'rgba(9, 25, 43, 0.4)',

    /** Accent color for secondary data series */
    accent: '#D9BF65',            // Golden yellow (consistent across modes)

    /** Grid and axis colors */
    grid: 'rgba(9, 25, 43, 0.1)', // Very subtle grid lines
    axis: 'rgba(9, 25, 43, 0.5)', // Axis lines and labels

    /** Tooltip colors */
    tooltipBg: '#F5F2EB',         // Surface color
    tooltipText: '#09192B',        // Primary text
    tooltipBorder: 'rgba(9, 25, 43, 0.1)',

    /** Multi-series color array (8 distinct colors) - Reordered for accessibility */
    series: [
      '#D9BF65',  // Accent gold - HIGH CONTRAST (moved to first)
      '#3B82F6',  // Blue
      '#10B981',  // Green
      '#F59E0B',  // Amber
      '#EF4444',  // Red
      '#8B5CF6',  // Purple
      '#6B7280',  // Gray
      '#09192B',  // Navy - LOW CONTRAST (moved to last)
    ],
  },

  dark: {
    /** Primary data series colors - Cream variations */
    primary: '#FEFBF4',           // Main cream
    primaryOpacity80: 'rgba(254, 251, 244, 0.8)',
    primaryOpacity60: 'rgba(254, 251, 244, 0.6)',
    primaryOpacity40: 'rgba(254, 251, 244, 0.4)',

    /** Accent color for secondary data series */
    accent: '#D9BF65',            // Golden yellow (consistent across modes)

    /** Grid and axis colors */
    grid: 'rgba(254, 251, 244, 0.1)', // Very subtle grid lines
    axis: 'rgba(254, 251, 244, 0.5)', // Axis lines and labels

    /** Tooltip colors */
    tooltipBg: '#0F1F35',         // Surface color
    tooltipText: '#FEFBF4',        // Primary text
    tooltipBorder: 'rgba(254, 251, 244, 0.1)',

    /** Multi-series color array (8 distinct colors) - Reordered for accessibility */
    series: [
      '#D9BF65',  // Accent gold - HIGH CONTRAST (moved to first)
      '#60A5FA',  // Blue (lighter for dark mode)
      '#34D399',  // Green (lighter)
      '#FBBF24',  // Amber (lighter)
      '#F87171',  // Red (lighter)
      '#A78BFA',  // Purple (lighter)
      '#9CA3AF',  // Gray (lighter for dark mode)
      '#FEFBF4',  // Cream - can blend with background (moved to last)
    ],
  },
};

/**
 * Chart styling constants
 * Defines reusable styling values for different chart types
 */
export const chartStyles = {
  /** Line chart stroke width */
  lineStrokeWidth: 2,

  /** Bar chart border radius (top corners only) - matches 4px design system */
  barRadius: [4, 4, 0, 0] as [number, number, number, number],

  /** Area chart fill opacity */
  areaFillOpacity: 0.6,

  /** Pie chart dimensions */
  pie: {
    paddingAngle: 2,        // Spacing between segments
    innerRadius: 60,        // For donut charts (60%)
    outerRadius: 100,       // Full size
  },

  /** Tooltip styling */
  tooltip: {
    borderRadius: 4,        // Matches design system
    padding: 16,            // md spacing
    fontSize: 12,           // xs font size
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // sm shadow
  },
};

/**
 * Get complete theme configuration for Recharts
 * @param isDark - Whether dark mode is active
 * @returns Theme configuration object with colors and styles
 */
export function getChartTheme(isDark: boolean) {
  const colors = isDark ? chartColors.dark : chartColors.light;

  return {
    colors,

    /** Grid line styling */
    grid: {
      stroke: colors.grid,
      strokeDasharray: '3 3', // Dashed lines for subtlety
    },

    /** Axis styling */
    axis: {
      stroke: colors.axis,
      style: {
        fontSize: 12,
        fill: colors.axis,
        fontFamily: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
      },
    },

    /** Tooltip styling */
    tooltip: {
      contentStyle: {
        backgroundColor: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: chartStyles.tooltip.borderRadius,
        padding: chartStyles.tooltip.padding,
        fontSize: chartStyles.tooltip.fontSize,
        fontFamily: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
        color: colors.tooltipText,
        boxShadow: chartStyles.tooltip.boxShadow,
      },
      cursor: {
        fill: colors.primaryOpacity40,
      },
    },

    /** Legend styling */
    legend: {
      iconType: 'circle' as const,
      wrapperStyle: {
        fontSize: 12,
        fontFamily: 'Raleway, -apple-system, BlinkMacSystemFont, sans-serif',
        color: colors.axis,
      },
    },
  };
}

/**
 * Accessibility helpers for charts
 * Provides utilities for ARIA labels and descriptions
 */
export const chartA11y = {
  /**
   * Generate accessible chart title
   * @param title - Chart title
   * @returns Formatted title for ARIA label
   */
  getChartTitle: (title: string): string => {
    return title.trim();
  },

  /**
   * Generate accessible chart description
   * @param description - Chart description
   * @returns Formatted description for screen readers
   */
  getChartDescription: (description: string): string => {
    return description.trim();
  },

  /**
   * Keyboard navigation hint text
   */
  keyboardHint: 'Use Tab to navigate between chart elements',
};

/**
 * Get color for data series by index
 * Wraps around if index exceeds series length
 * @param index - Series index
 * @param isDark - Whether dark mode is active
 * @returns Color string for the series
 */
export function getSeriesColor(index: number, isDark: boolean): string {
  const colors = isDark ? chartColors.dark.series : chartColors.light.series;
  return colors[index % colors.length];
}
