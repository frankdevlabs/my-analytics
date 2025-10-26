/**
 * ComparisonIndicator Component
 * Displays percentage change between current and previous period values
 * with color coding (green for positive, red for negative) and directional arrows.
 *
 * @example
 * ```tsx
 * <ComparisonIndicator currentValue={150} previousValue={100} />
 * // Displays: +50.0% with green color and up arrow
 * ```
 */

import * as React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { calculatePercentageChange } from '@/lib/utils/date-utils';

export interface ComparisonIndicatorProps {
  /** Current period value */
  currentValue: number;
  /** Previous period value (can be null if not available) */
  previousValue: number | null;
  /** Optional className for styling overrides */
  className?: string;
}

/**
 * ComparisonIndicator displays the percentage change between two values
 * Uses green color for positive changes, red for negative changes
 * Shows N/A when previous value is zero or null (division by zero case)
 */
export const ComparisonIndicator = React.forwardRef<
  HTMLDivElement,
  ComparisonIndicatorProps
>(({ currentValue, previousValue, className = '' }, ref) => {
  // Handle null or zero previous value
  if (previousValue === null || previousValue === 0) {
    return (
      <div
        ref={ref}
        className={`text-sm text-muted-foreground ${className}`}
        aria-label="Comparison not available"
      >
        N/A
      </div>
    );
  }

  // Calculate percentage change
  const percentageChange = calculatePercentageChange(currentValue, previousValue);

  // Handle unexpected null return (should not happen given the checks above)
  if (percentageChange === null) {
    return (
      <div
        ref={ref}
        className={`text-sm text-muted-foreground ${className}`}
        aria-label="Comparison not available"
      >
        N/A
      </div>
    );
  }

  // Determine if change is positive or negative
  const isPositive = percentageChange >= 0;

  // Color classes with WCAG AA compliant contrast (4.5:1)
  // Using green-600 (#16a34a) and red-600 (#dc2626) for sufficient contrast
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  // Select appropriate arrow icon
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  // Format percentage with sign and one decimal place
  const formattedPercentage = `${isPositive ? '+' : ''}${percentageChange.toFixed(1)}%`;

  // ARIA label for screen readers
  const ariaLabel = `${isPositive ? 'Increased' : 'Decreased'} by ${Math.abs(percentageChange).toFixed(1)} percent compared to previous period`;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1 text-sm font-medium ${colorClass} ${className}`}
      aria-label={ariaLabel}
    >
      <ArrowIcon className="h-4 w-4" aria-hidden="true" />
      <span>{formattedPercentage}</span>
    </div>
  );
});

ComparisonIndicator.displayName = 'ComparisonIndicator';
