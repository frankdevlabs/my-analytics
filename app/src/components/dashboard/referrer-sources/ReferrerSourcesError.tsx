/**
 * ReferrerSourcesError Component
 *
 * Error state display for the referrer sources section.
 * Shows a user-friendly error message with destructive styling.
 */

import * as React from 'react';

export interface ReferrerSourcesErrorProps {
  /** Error message to display */
  error: string;
}

/**
 * ReferrerSourcesError component
 *
 * Displays an error message when referrer data fails to load.
 * Uses text-destructive styling for visibility.
 *
 * @example
 * ```tsx
 * <ReferrerSourcesError error="Failed to load referrer data" />
 * ```
 */
export function ReferrerSourcesError({ error }: ReferrerSourcesErrorProps) {
  return (
    <div className="text-center py-12">
      <p
        className="text-destructive text-base mb-2 font-semibold"
        role="alert"
        aria-live="polite"
      >
        {error}
      </p>
      <p className="text-foreground/60 text-sm">
        Unable to load referrer sources data. Please try refreshing the page.
      </p>
    </div>
  );
}
