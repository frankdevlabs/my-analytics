# Chart Styling Guide

Complete guide for using styled Recharts components in the My Analytics application. All charts follow Frank's Blog aesthetic with automatic light/dark mode support and built-in accessibility features.

## Overview

This design system provides ready-to-use chart components built on Recharts with:

- **Frank's Blog Color Palette**: Navy (#09192B) and cream (#FEFBF4) with golden accent (#D9BF65)
- **Automatic Theme Switching**: Charts adapt to light/dark mode automatically via next-themes
- **Accessibility First**: ARIA labels, screen reader support, and keyboard navigation hints
- **Minimal Design**: 4px border radius, subtle shadows, clean grid lines
- **Responsive**: Charts automatically resize to fit their container

## Color Palette

### Light Mode
- **Primary Data**: #09192B (dark navy)
- **Accent Data**: #D9BF65 (golden yellow)
- **Grid Lines**: rgba(9, 25, 43, 0.1) (very subtle)
- **Axis/Labels**: rgba(9, 25, 43, 0.5)
- **Tooltips**: #F5F2EB background, #09192B text

### Dark Mode
- **Primary Data**: #FEFBF4 (cream/off-white)
- **Accent Data**: #D9BF65 (golden yellow, consistent)
- **Grid Lines**: rgba(254, 251, 244, 0.1) (very subtle)
- **Axis/Labels**: rgba(254, 251, 244, 0.5)
- **Tooltips**: #0F1F35 background, #FEFBF4 text

### Multi-Series Colors
For charts with multiple data series, a 7-color palette is available:
1. Primary (navy/cream based on mode)
2. Accent (golden yellow)
3. Gray
4. Amber
5. Blue
6. Purple
7. Pink

Colors automatically wrap if you have more than 7 series.

## Chart Types

### When to Use Each Type

#### Line Chart
- **Best for**: Time series data, trends over time, continuous data
- **Example use cases**: Revenue over months, user growth, performance metrics
- **Features**: Smooth curves, 2px stroke width, hover dots

#### Bar Chart
- **Best for**: Categorical comparisons, discrete data, rankings
- **Example use cases**: Sales by product, traffic by source, regional comparisons
- **Features**: 4px top corner radius, grouped or stacked bars

#### Area Chart
- **Best for**: Volume over time, cumulative data, showing magnitude
- **Example use cases**: Total sessions, cumulative revenue, stacked categories
- **Features**: Gradient fill (80% to 10% opacity), smooth curves

#### Pie/Donut Chart
- **Best for**: Part-to-whole relationships, percentages, proportions
- **Example use cases**: Browser share, device types, traffic sources
- **Features**: 2px spacing between segments, optional donut mode with 60% inner radius

## Usage Examples

### Line Chart Example

```tsx
import { LineChartExample } from '@/components/charts';

const data = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 2000, expenses: 9800 },
  { month: 'Apr', revenue: 2780, expenses: 3908 },
  { month: 'May', revenue: 1890, expenses: 4800 },
  { month: 'Jun', revenue: 2390, expenses: 3800 },
];

export function RevenueChart() {
  return (
    <LineChartExample
      data={data}
      dataKeys={['revenue', 'expenses']}
      xAxisKey="month"
      title="Monthly Revenue and Expenses"
      description="Line chart comparing monthly revenue and expenses from January to June"
      height={400}
    />
  );
}
```

### Bar Chart Example

```tsx
import { BarChartExample } from '@/components/charts';

const data = [
  { product: 'Product A', sales: 4000, profit: 2400 },
  { product: 'Product B', sales: 3000, profit: 1398 },
  { product: 'Product C', sales: 2000, profit: 9800 },
  { product: 'Product D', sales: 2780, profit: 3908 },
];

export function SalesChart() {
  return (
    <BarChartExample
      data={data}
      dataKeys={['sales', 'profit']}
      xAxisKey="product"
      title="Sales and Profit by Product"
      description="Bar chart showing sales and profit figures across different products"
      height={350}
    />
  );
}
```

### Area Chart Example

```tsx
import { AreaChartExample } from '@/components/charts';

const data = [
  { month: 'Jan', visitors: 4000, pageViews: 2400 },
  { month: 'Feb', visitors: 3000, pageViews: 1398 },
  { month: 'Mar', visitors: 2000, pageViews: 9800 },
  { month: 'Apr', visitors: 2780, pageViews: 3908 },
];

export function TrafficChart() {
  return (
    <AreaChartExample
      data={data}
      dataKeys={['visitors', 'pageViews']}
      xAxisKey="month"
      title="Website Traffic Over Time"
      description="Area chart displaying visitor count and page views monthly"
      height={300}
    />
  );
}
```

### Pie Chart Example

```tsx
import { PieChartExample } from '@/components/charts';

const data = [
  { name: 'Desktop', value: 400 },
  { name: 'Mobile', value: 300 },
  { name: 'Tablet', value: 100 },
];

export function DeviceChart() {
  return (
    <PieChartExample
      data={data}
      title="Traffic by Device Type"
      description="Pie chart showing the distribution of visitors across different device types"
      donut={true}
      height={350}
    />
  );
}
```

### Custom Chart with BaseChart

For advanced use cases, use `BaseChart` wrapper directly with Recharts components:

```tsx
'use client';

import { BaseChart, useChartTheme } from '@/components/charts';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { chartStyles } from '@/config/chart-theme';

export function CustomComposedChart({ data }: { data: any[] }) {
  const theme = useChartTheme();

  return (
    <BaseChart
      title="Custom Composed Chart"
      description="Chart combining line and bar visualizations"
      height={400}
    >
      <ComposedChart data={data}>
        <CartesianGrid {...theme.grid} />
        <XAxis dataKey="name" {...theme.axis} />
        <YAxis {...theme.axis} />
        <Tooltip {...theme.tooltip} />
        <Legend {...theme.legend} />
        <Bar dataKey="value" fill={theme.colors.primary} radius={chartStyles.barRadius} />
        <Line dataKey="trend" stroke={theme.colors.accent} strokeWidth={2} />
      </ComposedChart>
    </BaseChart>
  );
}
```

## Accessibility Guidelines

### Required Props
All chart components require `title` and `description` props for accessibility:

```tsx
<LineChartExample
  data={data}
  dataKeys={['value']}
  xAxisKey="category"
  title="Sales Trend"  // Required - becomes aria-label
  description="Line chart showing monthly sales trend from Jan to Dec 2024"  // Required - screen reader description
/>
```

### Best Practices

1. **Descriptive Titles**: Use clear, concise titles that explain what the chart shows
2. **Detailed Descriptions**: Include what type of chart it is, what data it displays, and the time period or categories
3. **Color is Not Sole Indicator**: Charts include labels and legends, not just colors
4. **Keyboard Navigation**: Charts include hints for screen reader users about Tab navigation
5. **Contrast Compliance**: All colors meet WCAG AA standards (4.5:1 minimum)

### ARIA Attributes
Charts automatically include:
- `role="img"` - Identifies chart as an image for screen readers
- `aria-label` - Chart title for quick identification
- `aria-describedby` - Links to full description for context

## Styling Configuration

### Theme Configuration
The `useChartTheme()` hook provides theme-aware configuration:

```tsx
import { useChartTheme } from '@/components/charts';

const theme = useChartTheme();
// theme.colors - Current color palette (light or dark)
// theme.grid - Grid line styling
// theme.axis - Axis styling
// theme.tooltip - Tooltip styling
// theme.legend - Legend styling
```

### Chart Styles
Import `chartStyles` for consistent styling values:

```tsx
import { chartStyles } from '@/config/chart-theme';

// chartStyles.lineStrokeWidth - 2px
// chartStyles.barRadius - [4, 4, 0, 0]
// chartStyles.areaFillOpacity - 0.6
// chartStyles.pie.paddingAngle - 2px
```

### Custom Colors
For multi-series charts, use `getSeriesColor`:

```tsx
import { getSeriesColor } from '@/config/chart-theme';

const color = getSeriesColor(index, isDark);
// Returns color from 7-color palette, wraps if index > 7
```

## Best Practices

### Data Density
- **Keep data points reasonable**: 5-30 points for optimal readability
- **Use sampling for large datasets**: Don't display 1000+ points on a line chart
- **Aggregate when necessary**: Group data by week/month instead of day for long periods

### Performance
- **Code split charts**: Use dynamic imports if charts aren't above the fold
- **Limit animations**: Recharts animations can lag with 100+ data points
- **Responsive containers**: Charts automatically resize, no manual handling needed

### Responsive Design
Charts work at all screen sizes:
- **Mobile (320px+)**: Charts resize to fit, labels may rotate if needed
- **Tablet (768px+)**: Standard chart size with full labels
- **Desktop (1024px+)**: Optimal viewing experience

### Layout Guidelines
```tsx
// Wrap in a container for consistent sizing
<div className="w-full max-w-4xl">
  <LineChartExample {...props} />
</div>

// Use consistent heights across dashboard
<LineChartExample height={300} {...props} />
<BarChartExample height={300} {...props} />
```

## Troubleshooting

### Charts not appearing
- Ensure recharts is installed: `npm install recharts`
- Check that data array is not empty
- Verify dataKeys match your data object keys

### Theme not switching
- Ensure next-themes ThemeProvider wraps your app
- Verify 'use client' directive in component files
- Check that .dark class exists in globals.css

### Colors look wrong
- Verify you're using design system tokens from globals.css
- Check that `useChartTheme()` is called in client components
- Ensure Frank's Blog colors are properly configured

### Accessibility warnings
- Always provide `title` and `description` props
- Ensure descriptions explain the chart type and data shown
- Verify ARIA attributes are present in rendered HTML

## Browser Compatibility

Charts are tested and work in:
- **Chrome 90+**
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

### Known Limitations
- Recharts animations may be choppy in older browsers
- SVG rendering can be slow with 200+ data points
- Print stylesheets not optimized (consider export feature instead)

## Further Reading

- [Recharts Documentation](https://recharts.org/)
- [Frank's Blog Design Reference](https://franksblog.nl/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Design System Documentation](./design-system.md)
