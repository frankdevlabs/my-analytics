/**
 * E2E Test Utilities for Analytics Testing
 *
 * Provides factory functions, cleanup helpers, and custom matchers
 * for end-to-end testing of analytics functionality.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Type for device breakdown results
 */
interface DeviceBreakdown {
  device_type: string;
  count: number;
  percentage: number;
}

/**
 * Type for browser breakdown results
 */
interface BrowserBreakdown {
  browser: string;
  count: number;
  percentage: number;
}

/**
 * Partial pageview data for factory function
 */
interface TestPageviewData {
  path?: string;
  added_iso?: Date;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  browser_name?: string | null;
  browser_version?: string | null;
  browser_major_version?: string | null;
  user_agent?: string;
  duration_seconds?: number;
  is_bot?: boolean;
  is_internal_referrer?: boolean;
  visibility_changes?: number;
  page_id?: string;
  session_id?: string | null;
}

/**
 * Generate a valid CUID-format page ID for testing
 * Format: 'c' + 24 random alphanumeric characters
 */
export function generateTestPageId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'c';
  for (let i = 0; i < 24; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generate a realistic user agent string for testing
 */
export function generateTestUserAgent(
  type: 'desktop' | 'mobile' | 'tablet' = 'desktop'
): string {
  const userAgents = {
    desktop: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
    mobile: [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ],
    tablet: [
      'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 12; SM-X906C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
  };

  const agents = userAgents[type];
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Factory function to create test pageview data with sensible defaults
 */
export function createTestPageview(
  overrides: TestPageviewData = {}
): Omit<TestPageviewData, 'page_id'> & { page_id: string } {
  const defaults: Required<
    Omit<TestPageviewData, 'browser_name' | 'browser_version' | 'browser_major_version' | 'session_id'>
  > & {
    browser_name: string | null;
    browser_version: string | null;
    browser_major_version: string | null;
    session_id: string | null;
  } = {
    path: `/test-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    added_iso: new Date(),
    device_type: 'desktop',
    browser_name: 'Chrome',
    browser_version: '120.0.0.0',
    browser_major_version: '120',
    user_agent: generateTestUserAgent('desktop'),
    duration_seconds: 30,
    is_bot: false,
    is_internal_referrer: false,
    visibility_changes: 0,
    page_id: generateTestPageId(),
    session_id: null,
  };

  return { ...defaults, ...overrides } as Omit<TestPageviewData, 'page_id'> & {
    page_id: string;
  };
}

/**
 * Cleanup test pageviews by path prefix
 */
export async function cleanupTestPageviews(
  prisma: PrismaClient,
  pathPrefix: string = '/test-'
): Promise<number> {
  const result = await prisma.pageview.deleteMany({
    where: {
      path: {
        startsWith: pathPrefix,
      },
    },
  });

  return result.count;
}

/**
 * Safely disconnect from the test database
 */
export async function disconnectTestDb(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Custom Jest matchers for database assertions
 */

/**
 * Assert that a device type has the expected count in breakdown results
 */
export function expectDeviceCount(
  breakdown: DeviceBreakdown[],
  deviceType: 'Desktop' | 'Mobile' | 'Tablet',
  expectedCount: number
): void {
  const data = breakdown.find((d) => d.device_type === deviceType);
  expect(data).toBeDefined();
  expect(data!.count).toBe(expectedCount);
}

/**
 * Assert that a browser appears in breakdown results
 */
export function expectBrowserInResults(
  breakdown: BrowserBreakdown[],
  browserName: string
): BrowserBreakdown {
  const data = breakdown.find((b) => b.browser.includes(browserName));
  expect(data).toBeDefined();
  return data!;
}

/**
 * Assert that total percentages sum to approximately 100%
 */
export function expectTotalPercentage(
  breakdown: Array<{ percentage: number }>,
  expectedTotal: number = 100,
  tolerance: number = 0.01
): void {
  const totalPercentage = breakdown.reduce((sum, item) => sum + item.percentage, 0);
  expect(Math.abs(totalPercentage - expectedTotal)).toBeLessThan(tolerance);
}

/**
 * Assert that total counts match expected sum
 */
export function expectTotalCount(
  breakdown: Array<{ count: number }>,
  expectedTotal: number
): void {
  const totalCount = breakdown.reduce((sum, item) => sum + item.count, 0);
  expect(totalCount).toBe(expectedTotal);
}

/**
 * Create multiple test pageviews with different configurations
 */
export async function createTestPageviews(
  prisma: PrismaClient,
  configs: TestPageviewData[]
): Promise<void> {
  for (const config of configs) {
    const pageview = createTestPageview(config);
    await prisma.pageview.create({
      data: pageview as any,
    });
  }
}

/**
 * Helper to create a unique test path prefix for isolation
 */
export function generateTestPathPrefix(testName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `/test-${testName}-${timestamp}-${random}`;
}
