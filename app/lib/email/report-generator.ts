/**
 * Report Generator
 * Aggregates analytics data for email reports with period-over-period comparison
 */

import {
  getPageviewsInDateRange,
  getUniqueVisitors,
  getTopPages,
  getReferrersByDomain,
} from '../db/pageviews';
import {
  calculatePreviousPeriod,
  calculatePercentageChange,
  formatDateRangeDisplay,
} from '../utils/date-utils';
import { EmailSchedule } from '@prisma/client';
import { renderTemplate } from './templates';
import { ReportEmailData } from './templates';

/**
 * Template configuration for metric customization
 */
export interface TemplateConfig {
  includePageviews?: boolean;
  includeUniqueVisitors?: boolean;
  includeTopPages?: boolean;
  includeTopReferrers?: boolean;
  includeComparison?: boolean;
  topPagesLimit?: number;
}

/**
 * Default template configuration
 */
const DEFAULT_CONFIG: TemplateConfig = {
  includePageviews: true,
  includeUniqueVisitors: true,
  includeTopPages: true,
  includeTopReferrers: true,
  includeComparison: true,
  topPagesLimit: 5,
};

/**
 * Calculate date range based on report schedule
 */
function calculateDateRange(schedule: EmailSchedule): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
  let from: Date;

  switch (schedule) {
    case EmailSchedule.DAILY:
      // Last 24 hours (yesterday)
      from = new Date(to);
      from.setDate(from.getDate() - 1);
      break;

    case EmailSchedule.WEEKLY:
      // Last 7 days
      from = new Date(to);
      from.setDate(from.getDate() - 7);
      break;

    case EmailSchedule.MONTHLY:
      // Last 30 days
      from = new Date(to);
      from.setDate(from.getDate() - 30);
      break;

    default:
      // Fallback to last 7 days
      from = new Date(to);
      from.setDate(from.getDate() - 7);
  }

  return { from, to };
}

/**
 * Get schedule type as lowercase string
 */
function getScheduleType(schedule: EmailSchedule): 'daily' | 'weekly' | 'monthly' {
  switch (schedule) {
    case EmailSchedule.DAILY:
      return 'daily';
    case EmailSchedule.WEEKLY:
      return 'weekly';
    case EmailSchedule.MONTHLY:
      return 'monthly';
    default:
      return 'daily';
  }
}

/**
 * Generate report data for a given schedule
 *
 * @param websiteId - Website ID (null for global/default site)
 * @param schedule - Report schedule (DAILY, WEEKLY, MONTHLY)
 * @param config - Template configuration for metric customization
 * @returns Promise<ReportEmailData> with aggregated metrics
 *
 * @example
 * const data = await generateReportData('website123', EmailSchedule.DAILY, {
 *   topPagesLimit: 10
 * });
 */
export async function generateReportData(
  websiteId: string | null,
  schedule: EmailSchedule,
  config: TemplateConfig = {}
): Promise<ReportEmailData> {
  // Merge with default config
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate date ranges
  const { from, to } = calculateDateRange(schedule);
  const previousPeriod = calculatePreviousPeriod(from, to);

  // Fetch current period data
  const [pageviews, uniqueVisitors, topPages, topReferrers] = await Promise.all([
    fullConfig.includePageviews ? getPageviewsInDateRange(from, to) : Promise.resolve(0),
    fullConfig.includeUniqueVisitors ? getUniqueVisitors(from, to) : Promise.resolve(0),
    fullConfig.includeTopPages
      ? getTopPages(from, to, fullConfig.topPagesLimit || 5)
      : Promise.resolve([]),
    fullConfig.includeTopReferrers
      ? getReferrersByDomain(from, to, fullConfig.topPagesLimit || 5)
      : Promise.resolve([]),
  ]);

  // Fetch previous period data for comparison (if enabled)
  let pageviewsChange: number | null = null;
  let uniqueVisitorsChange: number | null = null;

  if (fullConfig.includeComparison) {
    const [prevPageviews, prevUniqueVisitors] = await Promise.all([
      fullConfig.includePageviews
        ? getPageviewsInDateRange(previousPeriod.from, previousPeriod.to)
        : Promise.resolve(0),
      fullConfig.includeUniqueVisitors
        ? getUniqueVisitors(previousPeriod.from, previousPeriod.to)
        : Promise.resolve(0),
    ]);

    pageviewsChange = calculatePercentageChange(pageviews, prevPageviews);
    uniqueVisitorsChange = calculatePercentageChange(uniqueVisitors, prevUniqueVisitors);
  }

  // Format data for email template
  return {
    schedule: getScheduleType(schedule),
    domain: 'mysite.com', // TODO: Get from Website model when available
    dateRange: formatDateRangeDisplay(from, to),
    pageviews,
    pageviewsChange,
    uniqueVisitors,
    uniqueVisitorsChange,
    topPages: topPages.map((page) => ({
      path: page.path,
      pageviews: page.pageviews,
    })),
    topReferrers: topReferrers.map((referrer) => ({
      domain: referrer.domain,
      pageviews: referrer.pageviews,
    })),
    dashboardUrl: 'https://myanalytics.com/dashboard', // TODO: Generate from config
  };
}

/**
 * Generate complete email report ready to send
 *
 * @param websiteId - Website ID (null for global/default site)
 * @param schedule - Report schedule (DAILY, WEEKLY, MONTHLY)
 * @param recipientEmail - Email address to send report to
 * @param config - Template configuration for metric customization
 * @returns Promise with rendered email (html, text, subject)
 *
 * @example
 * const email = await generateReport(
 *   'website123',
 *   EmailSchedule.WEEKLY,
 *   'user@example.com'
 * );
 */
export async function generateReport(
  websiteId: string | null,
  schedule: EmailSchedule,
  recipientEmail: string,
  config: TemplateConfig = {}
) {
  // Get report data
  const reportData = await generateReportData(websiteId, schedule, config);

  // Determine email type based on schedule
  let emailType;
  switch (schedule) {
    case EmailSchedule.DAILY:
      emailType = 'DAILY_REPORT' as const;
      break;
    case EmailSchedule.WEEKLY:
      emailType = 'WEEKLY_REPORT' as const;
      break;
    case EmailSchedule.MONTHLY:
      emailType = 'MONTHLY_REPORT' as const;
      break;
    default:
      emailType = 'DAILY_REPORT' as const;
  }

  // Render template
  const rendered = await renderTemplate(emailType, reportData);

  return {
    ...rendered,
    to: recipientEmail,
  };
}
