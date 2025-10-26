/**
 * ReferrerSourcesTable Component
 *
 * Displays referrer domains with pageviews and category badges.
 * Rows are clickable to open a modal showing specific referrer URLs.
 * Follows TopPagesTable pattern for consistency.
 */

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';

export interface ReferrerDomainData {
  domain: string;
  category: string;
  pageviews: number;
}

export interface ReferrerSourcesTableProps {
  /** Array of domain data with categories and pageview counts */
  data: ReferrerDomainData[];

  /** Callback when a domain row is clicked */
  onDomainClick: (domain: string) => void;
}

/**
 * Formats a number with commas for thousands separator
 * @example formatNumber(1234567) => "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Truncates a domain to specified length with ellipsis
 */
function truncateDomain(domain: string, maxLength: number = 40): string {
  if (domain.length <= maxLength) return domain;
  return `${domain.substring(0, maxLength)}...`;
}

/**
 * Get badge variant based on category
 */
function getCategoryBadgeVariant(category: string): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'Search':
      return 'default';
    case 'Social':
      return 'secondary';
    case 'External':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * ReferrerSourcesTable component
 *
 * Displays referrer domains in a table with category badges and pageview counts.
 * Table rows are clickable and keyboard accessible to trigger URL drill-down.
 *
 * @example
 * ```tsx
 * <ReferrerSourcesTable
 *   data={[
 *     { domain: 'google.com', category: 'Search', pageviews: 500 },
 *     { domain: 'facebook.com', category: 'Social', pageviews: 200 }
 *   ]}
 *   onDomainClick={(domain) => console.log('Clicked:', domain)}
 * />
 * ```
 */
export const ReferrerSourcesTable = React.forwardRef<
  HTMLDivElement,
  ReferrerSourcesTableProps
>(({ data, onDomainClick }, ref) => {
  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, domain: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onDomainClick(domain);
    }
  };

  return (
    <div
      ref={ref}
      className="overflow-x-auto"
      role="region"
      aria-label="Referrer domains table"
      tabIndex={0}
    >
      <table className="w-full min-w-[500px]" aria-label="Top referrer domains with categories">
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
          {data.map((item, index) => (
            <tr
              key={index}
              className="border-b border-foreground/10 hover:bg-foreground/5 cursor-pointer transition-colors"
              onClick={() => onDomainClick(item.domain)}
              onKeyDown={(e) => handleKeyDown(e, item.domain)}
              tabIndex={0}
              role="button"
              aria-label={`View referrer URLs for ${item.domain}`}
            >
              <td
                className="py-2 px-4 font-body text-base min-w-[200px]"
                title={item.domain}
              >
                {truncateDomain(item.domain, 40)}
              </td>
              <td className="py-2 px-4 min-w-[120px]">
                <Badge variant={getCategoryBadgeVariant(item.category)}>
                  {item.category}
                </Badge>
              </td>
              <td className="text-right py-2 px-4 font-body text-base min-w-[120px]">
                {formatNumber(item.pageviews)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

ReferrerSourcesTable.displayName = 'ReferrerSourcesTable';
