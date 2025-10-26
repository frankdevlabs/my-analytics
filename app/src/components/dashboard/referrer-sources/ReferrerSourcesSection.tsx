/**
 * ReferrerSourcesSection Component
 *
 * Main wrapper component for the referrer sources feature.
 * Combines chart, table, and modal with state management for drill-down functionality.
 * Handles loading, error, and empty states with graceful degradation.
 */

'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReferrerSourcesChart } from './ReferrerSourcesChart';
import { ReferrerSourcesTable } from './ReferrerSourcesTable';
import { ReferrerUrlsModal } from './ReferrerUrlsModal';
import { ReferrerSourcesLoading } from './ReferrerSourcesLoading';
import { ReferrerSourcesError } from './ReferrerSourcesError';
import { ReferrerSourcesEmpty } from './ReferrerSourcesEmpty';

export interface ReferrerCategoryData {
  category: string;
  pageviews: number;
}

export interface ReferrerDomainData {
  domain: string;
  category: string;
  pageviews: number;
}

export interface ReferrerUrlData {
  url: string;
  pageviews: number;
}

export interface ReferrerSourcesSectionProps {
  /** Category aggregation data for chart */
  categoryData: ReferrerCategoryData[] | null;

  /** Domain data for table */
  domainData: ReferrerDomainData[] | null;

  /** Start date for URL fetching */
  startDate: Date;

  /** End date for URL fetching */
  endDate: Date;

  /** Error message if data fetch failed */
  error?: string | null;

  /** Show loading state */
  isLoading?: boolean;
}

/**
 * ReferrerSourcesSection component
 *
 * Displays referrer sources breakdown with chart and table.
 * Manages modal state for URL drill-down functionality.
 * Fetches URLs on-demand when user clicks a domain.
 *
 * @example
 * ```tsx
 * <ReferrerSourcesSection
 *   categoryData={[
 *     { category: 'Direct', pageviews: 1500 },
 *     { category: 'Search', pageviews: 800 }
 *   ]}
 *   domainData={[
 *     { domain: 'google.com', category: 'Search', pageviews: 500 }
 *   ]}
 *   startDate={new Date('2025-10-01')}
 *   endDate={new Date('2025-10-31')}
 * />
 * ```
 */
export function ReferrerSourcesSection({
  categoryData,
  domainData,
  startDate,
  endDate,
  error = null,
  isLoading = false,
}: ReferrerSourcesSectionProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDomain, setSelectedDomain] = React.useState<string>('');
  const [urlData, setUrlData] = React.useState<ReferrerUrlData[]>([]);
  const [urlLoading, setUrlLoading] = React.useState(false);
  const [urlError, setUrlError] = React.useState<string | null>(null);

  // Handle domain click - fetch URLs from API and open modal
  const handleDomainClick = React.useCallback(async (domain: string) => {
    setSelectedDomain(domain);
    setIsModalOpen(true);
    setUrlLoading(true);
    setUrlError(null);
    setUrlData([]);

    try {
      // Build API URL with query parameters
      const params = new URLSearchParams({
        domain,
        from: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        to: endDate.toISOString().split('T')[0],
        limit: '100',
      });

      const response = await fetch(`/api/referrer-urls?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      setUrlData(result.data || []);
    } catch (err) {
      console.error('Failed to fetch referrer URLs:', err);
      setUrlError('Failed to load referrer URLs');
    } finally {
      setUrlLoading(false);
    }
  }, [startDate, endDate]);

  // Handle modal close
  const handleModalClose = React.useCallback(() => {
    setIsModalOpen(false);
    setSelectedDomain('');
    setUrlData([]);
    setUrlError(null);
  }, []);

  // Determine if all traffic is direct (for empty state)
  const allDirect = React.useMemo(() => {
    if (!categoryData || categoryData.length === 0) return false;
    const directCategory = categoryData.find(c => c.category === 'Direct');
    const totalPageviews = categoryData.reduce((sum, c) => sum + c.pageviews, 0);
    return directCategory && directCategory.pageviews === totalPageviews;
  }, [categoryData]);

  return (
    <>
      <Card className="rounded-[4px]">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-semibold">
            Referrer Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading state */}
          {isLoading && <ReferrerSourcesLoading />}

          {/* Error state */}
          {!isLoading && error && <ReferrerSourcesError error={error} />}

          {/* Empty state */}
          {!isLoading && !error && (!categoryData || categoryData.length === 0) && (
            <ReferrerSourcesEmpty allDirect={false} />
          )}

          {/* Data display */}
          {!isLoading && !error && categoryData && categoryData.length > 0 && (
            <>
              {/* Chart */}
              <div>
                <ReferrerSourcesChart data={categoryData} />
              </div>

              {/* Table */}
              {domainData && domainData.length > 0 ? (
                <div>
                  <h3 className="font-heading text-lg font-semibold mb-4">
                    Top Referrer Domains
                  </h3>
                  <ReferrerSourcesTable
                    data={domainData}
                    onDomainClick={handleDomainClick}
                  />
                </div>
              ) : (
                <ReferrerSourcesEmpty allDirect={allDirect} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Referrer URLs Modal */}
      <ReferrerUrlsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        domain={selectedDomain}
        urls={urlData}
        isLoading={urlLoading}
        error={urlError}
      />
    </>
  );
}
