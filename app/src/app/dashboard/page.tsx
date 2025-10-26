/**
 * Dashboard Page
 * React Server Component that fetches and displays analytics metrics
 * Handles date range selection and period comparison via URL parameters with graceful error handling
 */

import React from 'react';
import {
  getPageviewsInDateRange,
  getUniqueVisitors,
  getTopPages,
  getPageviewsOverTime,
  getPageviewsByCountry,
  getReferrersByCategory,
  getReferrersByDomain,
  getDeviceTypeBreakdown,
  getBrowserBreakdown,
  DeviceTypeData,
  BrowserData,
} from '@/lib/db/pageviews';
import { getDefaultDateRange, isValidDateString, calculatePreviousPeriod } from '@/lib/utils/date-utils';
import { transformCountryData } from '@/lib/utils/countries';
import { MetricCard } from '@/components/dashboard/metric-card';
import { DateRangePresetPicker } from '@/components/dashboard/date-range-preset-picker';
import { PeriodComparisonToggle } from '@/components/dashboard/period-comparison-toggle';
import { RefreshButton } from '@/components/dashboard/refresh-button';
import { ActiveVisitorBadge } from '@/components/dashboard/active-visitor-badge';
import { PageviewsOverTimeChart, PageviewsOverTimeData } from '@/components/charts/PageviewsOverTimeChart';
import { GeographicDistributionChart } from '@/components/charts/GeographicDistributionChart';
import { CountryDistributionTable } from '@/components/dashboard/CountryDistributionTable';
import { ReferrerSourcesSection } from '@/components/dashboard/referrer-sources/ReferrerSourcesSection';
import { TopPagesDashboardSection } from '@/components/dashboard/TopPagesDashboardSection';
import { DeviceTypeAnalytics } from '@/components/dashboard/device-type-analytics';
import { BrowserAnalytics } from '@/components/dashboard/browser-analytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { TopPageData } from '@/types/dashboard';
import type { ReferrerCategoryData } from '@/components/dashboard/referrer-sources/ReferrerSourcesChart';
import type { ReferrerDomainData } from '@/components/dashboard/referrer-sources/ReferrerSourcesTable';

interface DashboardPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    compare?: string;
  }>;
}

/**
 * Dashboard Page Component
 * Displays analytics metrics including total pageviews, unique visitors, and top pages
 * Supports period comparison when compare=true URL parameter is present
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Parse search params (Next.js 16 requires awaiting searchParams)
  const params = await searchParams;

  // Get and validate date range from URL parameters
  let from = params.from;
  let to = params.to;

  // Fallback to default 7-day range if params missing or invalid
  if (!from || !to || !isValidDateString(from) || !isValidDateString(to)) {
    const defaults = getDefaultDateRange();
    from = from && isValidDateString(from) ? from : defaults.from;
    to = to && isValidDateString(to) ? to : defaults.to;
  }

  // Ensure logical date ordering (swap if from > to)
  if (new Date(from) > new Date(to)) {
    [from, to] = [to, from];
  }

  // Parse comparison mode from URL parameter
  const compare = params.compare === 'true';

  // Convert to Date objects for database queries
  const startDate = new Date(from);
  const endDate = new Date(to);

  // Calculate previous period dates for comparison if enabled
  let previousStartDate: Date | null = null;
  let previousEndDate: Date | null = null;
  if (compare) {
    const previousPeriod = calculatePreviousPeriod(startDate, endDate);
    previousStartDate = previousPeriod.from;
    previousEndDate = previousPeriod.to;
  }

  // Build promises array for parallel data fetching
  const promises = [
    getPageviewsInDateRange(startDate, endDate),
    getUniqueVisitors(startDate, endDate),
    getPageviewsOverTime(startDate, endDate),
    getPageviewsByCountry(startDate, endDate),
    getReferrersByCategory(startDate, endDate),
    getReferrersByDomain(startDate, endDate, 50),
    getTopPages(startDate, endDate, 20), // Top Pages Performance (20 rows)
    getDeviceTypeBreakdown(startDate, endDate), // Device type analytics
    getBrowserBreakdown(startDate, endDate, 5), // Browser analytics (top 5)
  ];

  // Add previous period queries when comparison is enabled
  if (compare && previousStartDate && previousEndDate) {
    promises.push(
      getPageviewsInDateRange(previousStartDate, previousEndDate),
      getUniqueVisitors(previousStartDate, previousEndDate)
    );
  }

  // Fetch all metrics in parallel using Promise.allSettled for graceful degradation
  const results = await Promise.allSettled(promises);

  // Extract current period values from settled promises
  const pageviewsResult = results[0];
  const visitorsResult = results[1];
  const chartDataResult = results[2];
  const countryDataResult = results[3];
  const referrerCategoryResult = results[4];
  const referrerDomainResult = results[5];
  const topPagesPerformanceResult = results[6];
  const deviceTypeResult = results[7];
  const browserResult = results[8];

  const totalPageviews = pageviewsResult.status === 'fulfilled' ? pageviewsResult.value : null;
  const pageviewsError = pageviewsResult.status === 'rejected' ? 'Unable to load pageviews data' : null;

  const uniqueVisitors = visitorsResult.status === 'fulfilled' ? visitorsResult.value : null;
  const visitorsError = visitorsResult.status === 'rejected' ? 'Unable to load visitors data' : null;

  const chartData = chartDataResult.status === 'fulfilled' ? (chartDataResult.value as PageviewsOverTimeData[]) : [];
  const chartError = chartDataResult.status === 'rejected' ? 'Unable to load chart data' : undefined;

  // Transform country data for display
  const countryDataRaw = countryDataResult.status === 'fulfilled' ? countryDataResult.value : [];
  const countryDataError = countryDataResult.status === 'rejected' ? 'Unable to load geographic data' : undefined;
  const countryData = typeof totalPageviews === 'number' ? transformCountryData(countryDataRaw as { country_code: string | null; count: number; }[], totalPageviews) : [];

  // Extract referrer data
  const referrerCategoryData = referrerCategoryResult.status === 'fulfilled' ? (referrerCategoryResult.value as ReferrerCategoryData[]) : null;
  const referrerDomainData = referrerDomainResult.status === 'fulfilled' ? (referrerDomainResult.value as ReferrerDomainData[]) : null;
  const referrerError = referrerCategoryResult.status === 'rejected' || referrerDomainResult.status === 'rejected'
    ? 'Unable to load referrer sources data'
    : null;

  // Extract Top Pages Performance data
  const topPagesPerformanceData = topPagesPerformanceResult.status === 'fulfilled'
    ? (topPagesPerformanceResult.value as TopPageData[])
    : null;
  const topPagesPerformanceError = topPagesPerformanceResult.status === 'rejected'
    ? 'Unable to load top pages performance data'
    : null;

  // Extract device type and browser analytics data
  const deviceTypeData = deviceTypeResult.status === 'fulfilled' ? (deviceTypeResult.value as DeviceTypeData[]) : [];
  const deviceTypeError = deviceTypeResult.status === 'rejected' ? 'Unable to load device type data' : null;

  const browserData = browserResult.status === 'fulfilled' ? (browserResult.value as BrowserData[]) : [];
  const browserError = browserResult.status === 'rejected' ? 'Unable to load browser data' : null;

  // Extract previous period values when comparison is enabled
  let previousPageviews: number | null = null;
  let previousVisitors: number | null = null;

  if (compare) {
    const previousPageviewsResult = results[9];
    const previousVisitorsResult = results[10];

    previousPageviews = previousPageviewsResult?.status === 'fulfilled' && typeof previousPageviewsResult.value === 'number' ? previousPageviewsResult.value : null;
    previousVisitors = previousVisitorsResult?.status === 'fulfilled' && typeof previousVisitorsResult.value === 'number' ? previousVisitorsResult.value : null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header with date selector, comparison toggle, and refresh button */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
          <h1 className="font-heading text-4xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <ActiveVisitorBadge />
            <DateRangePresetPicker from={from} to={to} />
            <PeriodComparisonToggle isEnabled={compare} />
            <RefreshButton />
          </div>
        </header>

        {/* Metric Cards Grid */}
        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="sr-only">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Total Pageviews"
              value={typeof totalPageviews === 'number' ? totalPageviews : null}
              error={pageviewsError}
              previousValue={compare && typeof previousPageviews === 'number' ? previousPageviews : undefined}
              showComparison={compare}
            />
            <MetricCard
              title="Unique Visitors"
              value={typeof uniqueVisitors === 'number' ? uniqueVisitors : null}
              error={visitorsError}
              previousValue={compare && typeof previousVisitors === 'number' ? previousVisitors : undefined}
              showComparison={compare}
            />
          </div>
        </section>

        {/* Pageviews Over Time Chart */}
        <section aria-labelledby="chart-heading">
          <Card>
            <CardHeader>
              <CardTitle id="chart-heading" className="font-heading text-2xl font-semibold">
                Pageviews Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PageviewsOverTimeChart
                data={chartData}
                error={chartError}
                isLoading={false}
              />
            </CardContent>
          </Card>
        </section>

        {/* Geographic Distribution Section */}
        <section aria-labelledby="geographic-heading">
          <Card>
            <CardHeader>
              <CardTitle id="geographic-heading" className="font-heading text-2xl font-semibold">
                Geographic Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <GeographicDistributionChart
                data={countryData}
                error={countryDataError}
                isLoading={false}
              />
              <CountryDistributionTable
                data={countryData}
                error={countryDataError}
                isLoading={false}
              />
            </CardContent>
          </Card>
        </section>

        {/* Device & Browser Analytics Section */}
        <section aria-labelledby="device-browser-heading">
          <h2 id="device-browser-heading" className="sr-only">
            Device and Browser Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DeviceTypeAnalytics
              data={deviceTypeData}
              isLoading={false}
              error={deviceTypeError}
            />
            <BrowserAnalytics
              data={browserData}
              isLoading={false}
              error={browserError}
            />
          </div>
        </section>

        {/* Top Pages Performance Dashboard */}
        <TopPagesDashboardSection
          data={topPagesPerformanceData}
          error={topPagesPerformanceError}
          startDate={startDate}
          endDate={endDate}
        />

        {/* Referrer Sources Section */}
        <section aria-labelledby="referrer-sources-heading">
          <h2 id="referrer-sources-heading" className="sr-only">Referrer Sources</h2>
          <ReferrerSourcesSection
            categoryData={referrerCategoryData}
            domainData={referrerDomainData}
            startDate={startDate}
            endDate={endDate}
            error={referrerError}
          />
        </section>
      </div>
    </main>
  );
}
