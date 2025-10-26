/**
 * ReferrerUrlsModal Component
 *
 * Modal popup that displays specific referrer URLs for a selected domain
 * with pageview counts. Uses shadcn/ui Dialog component with proper
 * focus management and keyboard accessibility.
 */

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ReferrerUrlData {
  url: string;
  pageviews: number;
}

export interface ReferrerUrlsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;

  /** Callback to close the modal */
  onClose: () => void;

  /** Domain name to display in the modal title */
  domain: string;

  /** Array of referrer URLs with pageview counts */
  urls: ReferrerUrlData[];

  /** Show loading state */
  isLoading?: boolean;

  /** Error message to display */
  error?: string | null;
}

/**
 * Formats a number with commas for thousands separator
 * @example formatNumber(1234567) => "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Truncates a URL to specified length with ellipsis
 */
function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return `${url.substring(0, maxLength)}...`;
}

/**
 * ReferrerUrlsModal component
 *
 * Displays a list of specific referrer URLs for a domain in a modal dialog.
 * Handles loading, error, and empty states. Mobile responsive with full-screen
 * modal on small screens.
 *
 * @example
 * ```tsx
 * <ReferrerUrlsModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 *   domain="google.com"
 *   urls={[
 *     { url: 'https://google.com/search?q=analytics', pageviews: 150 },
 *     { url: 'https://google.com/search?q=tracking', pageviews: 100 }
 *   ]}
 * />
 * ```
 */
export function ReferrerUrlsModal({
  isOpen,
  onClose,
  domain,
  urls,
  isLoading = false,
  error = null,
}: ReferrerUrlsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-semibold">
            Referrer URLs from {domain}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3" aria-live="polite" aria-busy="true">
              <div className="sr-only">Loading referrer URLs</div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-foreground/10">
                  <div className="h-4 bg-foreground/10 animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-foreground/10 animate-pulse rounded w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="text-center py-8">
              <p className="text-destructive text-sm mb-2" role="alert" aria-live="polite">
                {error}
              </p>
              <p className="text-foreground/60 text-sm">
                Unable to load referrer URLs for this domain.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && (!urls || urls.length === 0) && (
            <div className="text-center py-8" role="status">
              <p className="text-foreground/60">
                No referrer URLs found for this domain.
              </p>
            </div>
          )}

          {/* Data display */}
          {!isLoading && !error && urls && urls.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full" aria-label={`Referrer URLs from ${domain}`}>
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th className="text-left py-2 px-2 font-body text-sm font-semibold" scope="col">
                      Referrer URL
                    </th>
                    <th className="text-right py-2 px-2 font-body text-sm font-semibold min-w-[100px]" scope="col">
                      Pageviews
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {urls.map((item, index) => (
                    <tr key={index} className="border-b border-foreground/10">
                      <td
                        className="py-2 px-2 font-body text-sm break-all"
                        title={item.url}
                      >
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-accent underline"
                        >
                          {truncateUrl(item.url, 60)}
                        </a>
                      </td>
                      <td className="text-right py-2 px-2 font-body text-sm min-w-[100px]">
                        {formatNumber(item.pageviews)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
