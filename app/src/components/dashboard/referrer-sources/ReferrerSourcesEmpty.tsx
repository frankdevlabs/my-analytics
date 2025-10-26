/**
 * ReferrerSourcesEmpty Component
 *
 * Empty state display for the referrer sources section.
 * Shows different messages based on whether all traffic is direct
 * or there are simply no pageviews.
 */

import * as React from 'react';

export interface ReferrerSourcesEmptyProps {
  /** Whether all traffic is direct (no external referrers) */
  allDirect?: boolean;
}

/**
 * ReferrerSourcesEmpty component
 *
 * Displays an empty state message when no referrer data is available.
 * Shows a special message if all traffic is direct.
 *
 * @example
 * ```tsx
 * <ReferrerSourcesEmpty allDirect={true} />
 * ```
 */
export function ReferrerSourcesEmpty({ allDirect = false }: ReferrerSourcesEmptyProps) {
  return (
    <div className="text-center py-12" role="status">
      {allDirect ? (
        <>
          <p className="text-foreground/60 text-base mb-2">
            All traffic is direct. No referrer sources detected.
          </p>
          <p className="text-sm text-foreground/60">
            This means visitors are accessing your site directly (typing the URL, bookmarks, or direct links).
          </p>
        </>
      ) : (
        <>
          <p className="text-foreground/60 text-base mb-2">
            No pageviews recorded for this period.
          </p>
          <p className="text-sm text-foreground/60">
            Try selecting a different date range.
          </p>
        </>
      )}
    </div>
  );
}
