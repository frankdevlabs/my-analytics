/**
 * ReferrerSourcesLoading Component
 *
 * Loading skeleton for the referrer sources section.
 * Shows animated placeholders for chart and table.
 */

import * as React from 'react';

export function ReferrerSourcesLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="sr-only">Loading referrer sources data</div>

      {/* Chart skeleton */}
      <div className="w-full h-[300px] bg-foreground/10 animate-pulse rounded" />

      {/* Table skeleton */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[200px]" scope="col">
                Domain
              </th>
              <th className="text-left py-2 px-4 font-body text-sm font-semibold min-w-[120px]" scope="col">
                Category
              </th>
              <th className="text-right py-2 px-4 font-body text-sm font-semibold min-w-[120px]" scope="col">
                Pageviews
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr
                key={i}
                data-testid="skeleton-row"
                className="border-b border-foreground/10"
              >
                <td className="py-2 px-4">
                  <div className="h-4 bg-foreground/10 animate-pulse rounded w-full max-w-xs" />
                </td>
                <td className="py-2 px-4">
                  <div className="h-5 bg-foreground/10 animate-pulse rounded w-20" />
                </td>
                <td className="py-2 px-4">
                  <div className="h-4 bg-foreground/10 animate-pulse rounded w-16 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
