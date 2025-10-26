'use client';

/**
 * DateRangePresetPicker Component
 * Date range picker with preset options and custom calendar selection.
 * Updates URL parameters for shareable analytics views.
 *
 * @example
 * ```tsx
 * <DateRangePresetPicker from="2025-10-17" to="2025-10-24" />
 * ```
 */

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DatePreset,
  calculatePresetRange,
  formatDateRangeDisplay,
  clampDateToLimit,
  convertToDateObject,
} from '@/lib/utils/date-utils';

export interface DateRangePresetPickerProps {
  /** Start date in YYYY-MM-DD format */
  from: string;
  /** End date in YYYY-MM-DD format */
  to: string;
}

/**
 * DateRangePresetPicker allows users to select date ranges via presets or custom calendar.
 * Implements keyboard accessibility and updates URL parameters without page reload.
 */
export const DateRangePresetPicker = React.forwardRef<
  HTMLDivElement,
  DateRangePresetPickerProps
>(({ from, to }, ref) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Convert string dates to Date objects for display
  const fromDate = convertToDateObject(from);
  const toDate = convertToDateObject(to);

  // Preset options
  const presets: DatePreset[] = [
    'Today',
    'Last 7 Days',
    'Last 30 Days',
    'Last 90 Days',
    'This Month',
    'Last Month',
  ];

  /**
   * Updates URL with new date range
   */
  const updateDateRange = (newFrom: Date, newTo: Date) => {
    const fromStr = newFrom.toISOString().split('T')[0];
    const toStr = newTo.toISOString().split('T')[0];

    const params = new URLSearchParams();
    params.set('from', fromStr);
    params.set('to', toStr);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });

    setOpen(false);
  };

  /**
   * Handles preset selection
   */
  const handlePresetSelect = (preset: DatePreset) => {
    const { from: presetFrom, to: presetTo } = calculatePresetRange(preset);
    updateDateRange(presetFrom, presetTo);
  };

  /**
   * Opens custom date picker
   */
  const handleCustomRangeClick = () => {
    setShowCustomPicker(true);
    // Initialize with current dates
    if (fromDate && toDate) {
      setCustomStartDate(fromDate);
      setCustomEndDate(toDate);
    }
  };

  /**
   * Handles custom date range selection
   */
  const handleCustomDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setCustomStartDate(start);
    setCustomEndDate(end);

    // Only update URL when both dates are selected
    if (start && end) {
      // Clamp dates to 2-year limit
      const clampedStart = clampDateToLimit(start);
      const clampedEnd = clampDateToLimit(end);

      updateDateRange(clampedStart, clampedEnd);
      setShowCustomPicker(false);
    }
  };

  /**
   * Closes custom picker and returns to preset list
   */
  const handleBackToPresets = () => {
    setShowCustomPicker(false);
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  return (
    <div ref={ref} className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal md:w-[280px]"
            disabled={isPending}
            aria-label="Select date range"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fromDate && toDate ? (
              <span>{formatDateRangeDisplay(fromDate, toDate)}</span>
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {showCustomPicker ? (
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={handleBackToPresets}
                  className="text-sm text-foreground/70 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent rounded px-2 py-1"
                  aria-label="Back to presets"
                >
                  ← Back
                </button>
                <span className="text-sm font-medium">Custom Range</span>
              </div>
              <DatePicker
                selected={customStartDate}
                onChange={handleCustomDateChange}
                startDate={customStartDate}
                endDate={customEndDate}
                selectsRange
                inline
                monthsShown={1}
                maxDate={new Date()}
                minDate={(() => {
                  const twoYearsAgo = new Date();
                  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                  return twoYearsAgo;
                })()}
                showPopperArrow={false}
                calendarClassName="border-0"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                  aria-label={`Select ${preset}`}
                >
                  {preset}
                </button>
              ))}
              <div className="my-1 border-t border-border" role="separator" />
              <button
                onClick={handleCustomRangeClick}
                className="w-full rounded px-3 py-2 text-left text-sm hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                aria-label="Select custom date range"
              >
                Custom Range
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
});

DateRangePresetPicker.displayName = 'DateRangePresetPicker';
