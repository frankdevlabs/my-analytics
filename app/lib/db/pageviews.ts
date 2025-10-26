/**
 * Pageview Query Helpers
 * Database operations for pageview tracking and analytics queries
 */

import { Pageview, DeviceType } from '@prisma/client';
import { prisma } from './prisma';
import {
  validatePageview,
  sanitizePath,
  sanitizeReferrer,
  PageviewInput,
  ValidationError as ValidationErrorType
} from '../validation/pageview';

/**
 * Custom error classes for specific error handling
 */
export class PageviewValidationError extends Error {
  public errors: ValidationErrorType[];

  constructor(errors: ValidationErrorType[]) {
    super('Validation failed');
    this.name = 'PageviewValidationError';
    this.errors = errors;
  }
}

export class DatabaseError extends Error {
  public code?: string;
  public cause?: Error;

  constructor(message: string, code?: string, cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Type guard to check if error is a Prisma error with code
 */
interface PrismaError extends Error {
  code?: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Error && 'code' in error;
}

/**
 * Retry helper with exponential backoff for transient database failures
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error = new Error('Operation failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry validation errors or constraint violations
      if (
        error instanceof PageviewValidationError ||
        (isPrismaError(error) && error.code === 'P2002') || // Unique constraint
        (isPrismaError(error) && error.code === 'P2003') || // Foreign key constraint
        (isPrismaError(error) && error.code === 'P2025')    // Record not found
      ) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.error(
        `Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new DatabaseError(
    'Database operation failed after retries',
    isPrismaError(lastError) ? lastError.code : undefined,
    lastError
  );
}

/**
 * Create a new pageview record
 * Validates input, sanitizes data, and inserts into database
 */
export async function createPageview(data: PageviewInput): Promise<Pageview> {
  // Validate input
  const validationErrors = validatePageview(data);
  if (validationErrors.length > 0) {
    throw new PageviewValidationError(validationErrors);
  }

  // Sanitize path and document_referrer to prevent injection
  const sanitizedPath = sanitizePath(data.path);
  const sanitizedReferrer = sanitizeReferrer(data.document_referrer);

  // Ensure added_iso is a Date object
  const addedIsoDate = data.added_iso instanceof Date
    ? data.added_iso
    : new Date(data.added_iso);

  try {
    // Insert using Prisma with 10-second timeout
    const pageview = await retryWithBackoff(async () => {
      return await prisma.$transaction(
        async (tx) => {
          return await tx.pageview.create({
            data: {
              path: sanitizedPath,
              country_code: data.country_code || null,
              device_type: data.device_type as DeviceType,
              document_referrer: sanitizedReferrer,
              utm_source: data.utm_source || null,
              duration_seconds: data.duration_seconds,
              added_iso: addedIsoDate,
              is_unique: data.is_unique ?? false
            }
          });
        },
        {
          maxWait: 10000, // 10 seconds max wait
          timeout: 10000  // 10 seconds timeout
        }
      );
    });

    return pageview;
  } catch (error: unknown) {
    // Handle constraint violations with specific error messages
    if (isPrismaError(error) && error.code === 'P2002') {
      throw new DatabaseError(
        'A pageview with this data already exists',
        'P2002',
        error
      );
    }

    // Log all database errors with context
    if (isPrismaError(error)) {
      console.error('Failed to create pageview:', {
        error: error.message,
        code: error.code,
        data: {
          path: sanitizedPath,
          device_type: data.device_type,
          duration_seconds: data.duration_seconds
        }
      });

      // Return user-friendly error message (hide internal details)
      throw new DatabaseError(
        'Failed to create pageview. Please try again.',
        error.code,
        error
      );
    }

    // Handle non-Prisma errors
    throw new DatabaseError(
      'Failed to create pageview. Please try again.',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get total pageviews within a date range
 */
export async function getPageviewsInDateRange(
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    return await retryWithBackoff(async () => {
      return await prisma.pageview.count({
        where: {
          added_iso: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get pageviews in date range:', {
        error: error.message,
        startDate,
        endDate
      });
      throw new DatabaseError(
        'Failed to retrieve pageview count',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve pageview count',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get top pages by pageview count within a date range
 * Enhanced to return unique visitors per page using raw SQL with conditional aggregation
 */
export async function getTopPages(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<Array<{ path: string; pageviews: number; uniqueVisitors: number }>> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.$queryRaw<Array<{
        path: string;
        pageviews: bigint;
        unique_visitors: bigint;
      }>>`
        SELECT
          path,
          COUNT(*) as pageviews,
          COUNT(CASE WHEN is_unique = true THEN 1 END) as unique_visitors
        FROM pageviews
        WHERE added_iso >= ${startDate} AND added_iso <= ${endDate}
        GROUP BY path
        ORDER BY pageviews DESC
        LIMIT ${limit}
      `;

      // Transform bigint to number and map to expected structure
      return results.map(result => ({
        path: result.path,
        pageviews: Number(result.pageviews),
        uniqueVisitors: Number(result.unique_visitors),
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get top pages:', {
        error: error.message,
        startDate,
        endDate,
        limit
      });
      throw new DatabaseError(
        'Failed to retrieve top pages',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve top pages',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get daily pageview trends over time with unique visitor counts
 * Returns time-series data for line chart visualization
 */
export async function getPageviewsOverTime(
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; pageviews: number; uniqueVisitors: number }>> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.$queryRaw<Array<{
        date: string;
        pageviews: bigint;
        unique_visitors: bigint;
      }>>`
        SELECT
          DATE(added_iso) as date,
          COUNT(*) as pageviews,
          COUNT(CASE WHEN is_unique = true THEN 1 END) as unique_visitors
        FROM pageviews
        WHERE added_iso >= ${startDate}
          AND added_iso <= ${endDate}
          AND is_bot = false
        GROUP BY DATE(added_iso)
        ORDER BY date ASC
      `;

      // Transform bigint to number and map to expected structure
      return results.map(result => ({
        date: result.date,
        pageviews: Number(result.pageviews),
        uniqueVisitors: Number(result.unique_visitors),
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get pageviews over time:', {
        error: error.message,
        startDate,
        endDate
      });
      throw new DatabaseError(
        'Failed to retrieve pageviews over time',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve pageviews over time',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get count of unique visitors within a date range
 */
export async function getUniqueVisitors(
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    return await retryWithBackoff(async () => {
      return await prisma.pageview.count({
        where: {
          is_unique: true,
          added_iso: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get unique visitors:', {
        error: error.message,
        startDate,
        endDate
      });
      throw new DatabaseError(
        'Failed to retrieve unique visitor count',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve unique visitor count',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get pageview distribution by country within a date range
 * Excludes bot traffic for accurate geographic analytics
 */
export async function getPageviewsByCountry(
  startDate: Date,
  endDate: Date
): Promise<Array<{ country_code: string | null; count: number }>> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.pageview.groupBy({
        by: ['country_code'],
        where: {
          added_iso: {
            gte: startDate,
            lte: endDate
          },
          is_bot: false  // CRITICAL: Exclude bot traffic for accurate market insights
        },
        _count: {
          country_code: true
        },
        orderBy: {
          _count: {
            country_code: 'desc'
          }
        }
      });

      // Transform to simpler structure
      return results.map(result => ({
        country_code: result.country_code,
        count: result._count.country_code
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get pageviews by country:', {
        error: error.message,
        startDate,
        endDate
      });
      throw new DatabaseError(
        'Failed to retrieve pageviews by country',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve pageviews by country',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get pageview distribution by device type within a date range
 */
export async function getPageviewsByDevice(
  startDate: Date,
  endDate: Date
): Promise<Array<{ device_type: DeviceType; count: number }>> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.pageview.groupBy({
        by: ['device_type'],
        where: {
          added_iso: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          device_type: true
        },
        orderBy: {
          _count: {
            device_type: 'desc'
          }
        }
      });

      // Transform to simpler structure
      return results.map(result => ({
        device_type: result.device_type,
        count: result._count.device_type
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get pageviews by device:', {
        error: error.message,
        startDate,
        endDate
      });
      throw new DatabaseError(
        'Failed to retrieve pageviews by device',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve pageviews by device',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * TypeScript interfaces for referrer query return types
 */
export interface ReferrerByCategory {
  category: string;
  pageviews: number;
}

export interface ReferrerByDomain {
  domain: string;
  category: string;
  pageviews: number;
}

export interface ReferrerUrl {
  url: string;
  pageviews: number;
}

/**
 * Get pageview counts grouped by referrer category within a date range
 * Returns aggregated counts for Direct, Search, Social, and External categories
 *
 * @param {Date} startDate - Start of date range (inclusive)
 * @param {Date} endDate - End of date range (inclusive)
 * @returns {Promise<ReferrerByCategory[]>} Array of categories with pageview counts
 *
 * @example
 * const categories = await getReferrersByCategory(
 *   new Date('2025-10-01'),
 *   new Date('2025-10-31')
 * );
 * // Returns: [
 * //   { category: 'Direct', pageviews: 1500 },
 * //   { category: 'Search', pageviews: 800 },
 * //   { category: 'Social', pageviews: 300 },
 * //   { category: 'External', pageviews: 200 }
 * // ]
 */
export async function getReferrersByCategory(
  startDate: Date,
  endDate: Date
): Promise<ReferrerByCategory[]> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.$queryRaw<Array<{
        referrer_category: string;
        pageviews: bigint;
      }>>`
        SELECT
          referrer_category,
          COUNT(*) as pageviews
        FROM pageviews
        WHERE added_iso >= ${startDate}
          AND added_iso <= ${endDate}
          AND is_bot = false
        GROUP BY referrer_category
        ORDER BY pageviews DESC
      `;

      // Transform bigint to number and map to expected structure
      return results.map(result => ({
        category: result.referrer_category,
        pageviews: Number(result.pageviews),
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get referrers by category:', {
        error: error.message,
        startDate,
        endDate
      });
      throw new DatabaseError(
        'Failed to retrieve referrers by category',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve referrers by category',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get top referrer domains with their categories and pageview counts
 * Returns domains ordered by pageview count, excluding null domains (direct traffic)
 *
 * @param {Date} startDate - Start of date range (inclusive)
 * @param {Date} endDate - End of date range (inclusive)
 * @param {number} limit - Maximum number of domains to return (default: 50)
 * @returns {Promise<ReferrerByDomain[]>} Array of domains with categories and pageview counts
 *
 * @example
 * const domains = await getReferrersByDomain(
 *   new Date('2025-10-01'),
 *   new Date('2025-10-31'),
 *   10
 * );
 * // Returns: [
 * //   { domain: 'google.com', category: 'Search', pageviews: 500 },
 * //   { domain: 'facebook.com', category: 'Social', pageviews: 200 },
 * //   { domain: 'example.com', category: 'External', pageviews: 100 }
 * // ]
 */
export async function getReferrersByDomain(
  startDate: Date,
  endDate: Date,
  limit: number = 50
): Promise<ReferrerByDomain[]> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.$queryRaw<Array<{
        referrer_domain: string;
        referrer_category: string;
        pageviews: bigint;
      }>>`
        SELECT
          referrer_domain,
          referrer_category,
          COUNT(*) as pageviews
        FROM pageviews
        WHERE referrer_domain IS NOT NULL
          AND added_iso >= ${startDate}
          AND added_iso <= ${endDate}
          AND is_bot = false
        GROUP BY referrer_domain, referrer_category
        ORDER BY pageviews DESC
        LIMIT ${limit}
      `;

      // Transform bigint to number and map to expected structure
      return results.map(result => ({
        domain: result.referrer_domain,
        category: result.referrer_category,
        pageviews: Number(result.pageviews),
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get referrers by domain:', {
        error: error.message,
        startDate,
        endDate,
        limit
      });
      throw new DatabaseError(
        'Failed to retrieve referrers by domain',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve referrers by domain',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get specific referrer URLs for a given domain with pageview counts
 * Returns URLs ordered by pageview count, useful for drill-down analysis
 *
 * @param {string} domain - Domain to filter by (e.g., 'google.com')
 * @param {Date} startDate - Start of date range (inclusive)
 * @param {Date} endDate - End of date range (inclusive)
 * @param {number} limit - Maximum number of URLs to return (default: 100)
 * @returns {Promise<ReferrerUrl[]>} Array of URLs with pageview counts
 *
 * @example
 * const urls = await getReferrerUrlsByDomain(
 *   'google.com',
 *   new Date('2025-10-01'),
 *   new Date('2025-10-31'),
 *   25
 * );
 * // Returns: [
 * //   { url: 'https://google.com/search?q=analytics', pageviews: 150 },
 * //   { url: 'https://google.com/search?q=tracking', pageviews: 100 },
 * //   { url: 'https://google.com/', pageviews: 50 }
 * // ]
 */
export async function getReferrerUrlsByDomain(
  domain: string,
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<ReferrerUrl[]> {
  try {
    return await retryWithBackoff(async () => {
      const results = await prisma.$queryRaw<Array<{
        document_referrer: string;
        pageviews: bigint;
      }>>`
        SELECT
          document_referrer,
          COUNT(*) as pageviews
        FROM pageviews
        WHERE referrer_domain = ${domain}
          AND added_iso >= ${startDate}
          AND added_iso <= ${endDate}
          AND is_bot = false
        GROUP BY document_referrer
        ORDER BY pageviews DESC
        LIMIT ${limit}
      `;

      // Transform bigint to number and map to expected structure
      return results.map(result => ({
        url: result.document_referrer,
        pageviews: Number(result.pageviews),
      }));
    });
  } catch (error: unknown) {
    if (isPrismaError(error)) {
      console.error('Failed to get referrer URLs by domain:', {
        error: error.message,
        domain,
        startDate,
        endDate,
        limit
      });
      throw new DatabaseError(
        'Failed to retrieve referrer URLs by domain',
        error.code,
        error
      );
    }
    throw new DatabaseError(
      'Failed to retrieve referrer URLs by domain',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * TypeScript interfaces for device and browser analytics query return types
 */
export interface DeviceTypeData {
  device_type: string;
  count: number;
  percentage: number;
}

export interface BrowserData {
  browser: string;
  count: number;
  percentage: number;
}

/**
 * Get device type breakdown with counts and percentages within a date range
 * Returns aggregated data for Desktop, Mobile, Tablet device types
 *
 * @param {Date} startDate - Start of date range (inclusive)
 * @param {Date} endDate - End of date range (inclusive)
 * @returns {Promise<DeviceTypeData[]>} Array of device types with counts and percentages
 *
 * @example
 * const devices = await getDeviceTypeBreakdown(
 *   new Date('2025-10-01'),
 *   new Date('2025-10-31')
 * );
 * // Returns: [
 * //   { device_type: 'Desktop', count: 5000, percentage: 62.5 },
 * //   { device_type: 'Mobile', count: 2500, percentage: 31.25 },
 * //   { device_type: 'Tablet', count: 500, percentage: 6.25 }
 * // ]
 */
export async function getDeviceTypeBreakdown(
  startDate: Date,
  endDate: Date
): Promise<DeviceTypeData[]> {
  try {
    return await retryWithBackoff(async () => {
      // Get grouped results with counts
      const results = await prisma.pageview.groupBy({
        by: ['device_type'],
        where: {
          added_iso: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          device_type: true
        },
        orderBy: {
          _count: {
            device_type: 'desc'
          }
        }
      });

      // Calculate total count for percentage calculation
      const totalCount = results.reduce((sum, result) => sum + result._count.device_type, 0);

      // Handle empty results
      if (totalCount === 0) {
        return [];
      }

      // Map DeviceType enum values to display names
      const deviceTypeDisplayNames: Record<DeviceType, string> = {
        desktop: 'Desktop',
        mobile: 'Mobile',
        tablet: 'Tablet'
      };

      // Transform to expected structure with percentages
      return results.map(result => ({
        device_type: deviceTypeDisplayNames[result.device_type],
        count: result._count.device_type,
        percentage: (result._count.device_type / totalCount) * 100
      }));
    });
  } catch (error) {
    console.error('Failed to get device type breakdown:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      startDate,
      endDate
    });
    throw new DatabaseError(
      'Failed to retrieve device type breakdown',
      isPrismaError(error) ? error.code : undefined,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get browser breakdown with top N browsers plus "Other" category
 * Returns browser name + major version with counts and percentages
 *
 * @param {Date} startDate - Start of date range (inclusive)
 * @param {Date} endDate - End of date range (inclusive)
 * @param {number} limit - Number of top browsers to return (default: 5)
 * @returns {Promise<BrowserData[]>} Array of browsers with counts and percentages
 *
 * @example
 * const browsers = await getBrowserBreakdown(
 *   new Date('2025-10-01'),
 *   new Date('2025-10-31'),
 *   5
 * );
 * // Returns: [
 * //   { browser: 'Chrome 120', count: 3500, percentage: 43.75 },
 * //   { browser: 'Safari 17', count: 2000, percentage: 25.0 },
 * //   { browser: 'Firefox 121', count: 1500, percentage: 18.75 },
 * //   { browser: 'Edge 120', count: 500, percentage: 6.25 },
 * //   { browser: 'Unknown', count: 300, percentage: 3.75 },
 * //   { browser: 'Other', count: 200, percentage: 2.5 }
 * // ]
 */
export async function getBrowserBreakdown(
  startDate: Date,
  endDate: Date,
  limit: number = 5
): Promise<BrowserData[]> {
  try {
    return await retryWithBackoff(async () => {
      // Get total count for percentage calculation
      const totalResult = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) as total
        FROM pageviews
        WHERE added_iso >= ${startDate}
          AND added_iso <= ${endDate}
      `;

      const totalCount = Number(totalResult[0].total);

      // Handle empty results
      if (totalCount === 0) {
        return [];
      }

      // Get top N browsers with concatenated browser name + major version
      // Handle nulls with COALESCE to group unknown browsers
      const topBrowsers = await prisma.$queryRaw<Array<{
        browser: string;
        count: bigint;
      }>>`
        SELECT
          CASE
            WHEN browser_name IS NULL THEN 'Unknown'
            WHEN browser_major_version IS NULL OR browser_major_version = '' THEN COALESCE(browser_name, 'Unknown')
            ELSE CONCAT(COALESCE(browser_name, 'Unknown'), ' ', browser_major_version)
          END as browser,
          COUNT(*) as count
        FROM pageviews
        WHERE added_iso >= ${startDate}
          AND added_iso <= ${endDate}
        GROUP BY browser
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      // Calculate count for top N browsers
      const topBrowsersCount = topBrowsers.reduce((sum, browser) => sum + Number(browser.count), 0);

      // Calculate "Other" count (remaining browsers not in top N)
      const otherCount = totalCount - topBrowsersCount;

      // Transform top browsers to expected structure with percentages
      const results: BrowserData[] = topBrowsers.map(browser => ({
        browser: browser.browser,
        count: Number(browser.count),
        percentage: (Number(browser.count) / totalCount) * 100
      }));

      // Add "Other" category if there are browsers beyond top N
      if (otherCount > 0) {
        results.push({
          browser: 'Other',
          count: otherCount,
          percentage: (otherCount / totalCount) * 100
        });
      }

      return results;
    });
  } catch (error) {
    console.error('Failed to get browser breakdown:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      startDate,
      endDate,
      limit
    });
    throw new DatabaseError(
      'Failed to retrieve browser breakdown',
      isPrismaError(error) ? error.code : undefined,
      error instanceof Error ? error : undefined
    );
  }
}
