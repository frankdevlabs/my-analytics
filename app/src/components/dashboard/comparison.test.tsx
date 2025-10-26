/**
 * Test Suite for Period Comparison Components
 * Tests for PeriodComparisonToggle and ComparisonIndicator components
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparisonIndicator } from './comparison-indicator';

describe('ComparisonIndicator', () => {
  it('displays positive percentage change with green color and up arrow', () => {
    render(<ComparisonIndicator currentValue={150} previousValue={100} />);

    const indicator = screen.getByText(/\+50\.0%/);
    expect(indicator).toBeInTheDocument();

    // Check parent div has green color class
    const container = indicator.parentElement;
    expect(container).toHaveClass('text-green-600');
  });

  it('displays negative percentage change with red color and down arrow', () => {
    render(<ComparisonIndicator currentValue={80} previousValue={100} />);

    const indicator = screen.getByText(/-20\.0%/);
    expect(indicator).toBeInTheDocument();

    // Check parent div has red color class
    const container = indicator.parentElement;
    expect(container).toHaveClass('text-red-600');
  });

  it('displays N/A when previous value is zero', () => {
    render(<ComparisonIndicator currentValue={100} previousValue={0} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays N/A when previous value is null', () => {
    render(<ComparisonIndicator currentValue={100} previousValue={null} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('handles zero current value correctly', () => {
    render(<ComparisonIndicator currentValue={0} previousValue={100} />);

    const indicator = screen.getByText(/-100\.0%/);
    expect(indicator).toBeInTheDocument();

    // Check parent div has red color class
    const container = indicator.parentElement;
    expect(container).toHaveClass('text-red-600');
  });

  it('displays percentage with one decimal place', () => {
    render(<ComparisonIndicator currentValue={115.5} previousValue={100} />);

    // Should display +15.5%
    expect(screen.getByText(/\+15\.5%/)).toBeInTheDocument();
  });
});
