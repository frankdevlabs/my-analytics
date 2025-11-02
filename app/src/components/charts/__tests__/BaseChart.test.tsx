/**
 * BaseChart Component Tests
 *
 * Tests for BaseChart wrapper component including accessibility features,
 * theme integration, and responsive container rendering.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BaseChart } from '@/components/charts/BaseChart';
import { useTheme } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

// Mock Recharts ResponsiveContainer
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe('BaseChart Component', () => {
  beforeEach(() => {
    // Reset mock before each test
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
    });
  });

  it('renders chart with accessibility attributes', () => {
    render(
      <BaseChart
        title="Test Chart"
        description="This is a test chart"
      >
        <div>Chart Content</div>
      </BaseChart>
    );

    const container = screen.getByRole('img');
    expect(container).toHaveAttribute('aria-label', 'Test Chart');
    expect(container).toHaveAttribute('aria-describedby');
  });

  it('renders hidden description for screen readers', () => {
    render(
      <BaseChart
        title="Revenue Chart"
        description="Monthly revenue data visualization"
      >
        <div>Chart Content</div>
      </BaseChart>
    );

    const description = screen.getByText(/Monthly revenue data visualization/i);
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('sr-only');
  });

  it('renders children inside ResponsiveContainer', () => {
    render(
      <BaseChart
        title="Test Chart"
        description="Test description"
      >
        <div data-testid="chart-child">Chart Content</div>
      </BaseChart>
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('chart-child')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <BaseChart
        title="Test Chart"
        description="Test description"
        className="custom-chart-class"
      >
        <div>Chart Content</div>
      </BaseChart>
    );

    const chartContainer = container.querySelector('.chart-container');
    expect(chartContainer).toHaveClass('custom-chart-class');
  });

  it('generates unique aria-describedby ID from title', () => {
    render(
      <BaseChart
        title="Monthly Revenue Chart"
        description="Test description"
      >
        <div>Chart Content</div>
      </BaseChart>
    );

    const container = screen.getByRole('img');
    const ariaDescribedBy = container.getAttribute('aria-describedby');

    expect(ariaDescribedBy).toBe('chart-monthly-revenue-chart');
  });
});
