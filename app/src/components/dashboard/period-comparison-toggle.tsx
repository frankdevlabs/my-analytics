'use client';

/**
 * PeriodComparisonToggle Component
 * Allows users to toggle period comparison on/off.
 * Updates URL parameter (&compare=true) when toggled.
 *
 * @example
 * ```tsx
 * <PeriodComparisonToggle isEnabled={false} />
 * ```
 */

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Label } from '@/components/ui/label';

export interface PeriodComparisonToggleProps {
  /** Current comparison enabled state from URL parameters */
  isEnabled: boolean;
  /** Optional className for styling overrides */
  className?: string;
}

/**
 * PeriodComparisonToggle provides a checkbox control for enabling/disabling
 * period comparison. Updates URL without page reload using React transitions.
 */
export const PeriodComparisonToggle = React.forwardRef<
  HTMLDivElement,
  PeriodComparisonToggleProps
>(({ isEnabled, className = '' }, ref) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    // Build new URL parameters
    const params = new URLSearchParams(searchParams.toString());

    if (checked) {
      params.set('compare', 'true');
    } else {
      params.delete('compare');
    }

    // Update URL without page reload using Next.js router
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="Period comparison toggle"
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          id="period-comparison-toggle"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-foreground/20 text-foreground focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
          aria-label="Compare to previous period"
        />
      </div>
      <Label
        htmlFor="period-comparison-toggle"
        className={`text-sm font-medium cursor-pointer ${isPending ? 'opacity-50' : ''}`}
      >
        Compare to previous period
      </Label>
    </div>
  );
});

PeriodComparisonToggle.displayName = 'PeriodComparisonToggle';
