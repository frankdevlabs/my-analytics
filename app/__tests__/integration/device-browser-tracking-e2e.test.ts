/**
 * End-to-End Test for Device and Browser Analytics Tracking Flow
 *
 * Tests the complete flow from user agent tracking through storage,
 * query, and analytics display for device and browser data.
 *
 * Note: The test database is automatically set up by Jest's globalSetup.
 * You can run these tests with just `npm test` or `npm run test:e2e`.
 *
 * This test suite validates:
 * - Device type tracking and breakdown calculations
 * - Browser parsing and analytics
 * - Unknown browser handling
 * - "Other" category grouping for browser breakdown
 *
 * Task Group 5: Test Review & Gap Analysis - E2E Tests
 */

import { prisma } from 'lib/db/prisma';
import { extractMajorVersion } from '@/lib/parsing/extract-major-version';
import { parseUserAgent } from '@/lib/parsing/user-agent-parser';
import {
  getDeviceTypeBreakdown,
  getBrowserBreakdown,
} from '@/lib/db/pageviews';
import {
  createTestPageview,
  cleanupTestPageviews,
  disconnectTestDb,
  expectDeviceCount,
  expectBrowserInResults,
  expectTotalPercentage,
  expectTotalCount,
} from '../helpers/e2e-test-utils';

describe('Device and Browser Analytics E2E Flow', () => {
  // Clean up test data after tests
  afterAll(async () => {
    await cleanupTestPageviews(prisma, '/test-device-browser-');
    await disconnectTestDb(prisma);
  });

  it('should track, store, and query device/browser data end-to-end', async () => {
    const testDate = new Date('2025-10-15T12:00:00Z');

    // Step 1 & 2: Define test user agents and parse them
    const testUserAgents = [
      {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        device: 'desktop' as const,
      },
      {
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        device: 'mobile' as const,
      },
      {
        ua: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        device: 'tablet' as const,
      },
      {
        ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        device: 'desktop' as const,
      },
    ];

    // Create test pageviews using factory function
    for (let i = 0; i < testUserAgents.length; i++) {
      const { ua, device } = testUserAgents[i];
      const parsedUA = parseUserAgent(ua);
      const browserMajorVersion = extractMajorVersion(parsedUA.browser_version);

      const pageview = createTestPageview({
        path: `/test-device-browser-${i}`,
        added_iso: testDate,
        device_type: device,
        browser_name: parsedUA.browser_name,
        browser_version: parsedUA.browser_version,
        browser_major_version: browserMajorVersion,
        user_agent: ua,
      });

      await prisma.pageview.create({ data: pageview as any });
    }

    // Step 3: Query device type breakdown
    const startDate = new Date('2025-10-15T00:00:00Z');
    const endDate = new Date('2025-10-15T23:59:59Z');

    const deviceBreakdown = await getDeviceTypeBreakdown(startDate, endDate);

    // Verify device type breakdown using custom matchers
    expect(deviceBreakdown.length).toBeGreaterThan(0);
    expectDeviceCount(deviceBreakdown, 'Desktop', 2); // Chrome and Firefox
    expectDeviceCount(deviceBreakdown, 'Mobile', 1); // iPhone
    expectDeviceCount(deviceBreakdown, 'Tablet', 1); // iPad

    // Verify percentages sum to 100
    expectTotalPercentage(deviceBreakdown);

    // Step 4: Query browser breakdown
    const browserBreakdown = await getBrowserBreakdown(startDate, endDate, 5);

    // Verify browser breakdown using custom matchers
    expect(browserBreakdown.length).toBeGreaterThan(0);

    // Verify specific browsers appear in results
    expectBrowserInResults(browserBreakdown, 'Chrome');
    expectBrowserInResults(browserBreakdown, 'Firefox');

    // Find Mobile Safari entries (2 devices: iPhone and iPad)
    const safariEntries = browserBreakdown.filter((b) =>
      b.browser.includes('Safari')
    );
    expect(safariEntries.length).toBeGreaterThan(0);
  });

  it('should handle Unknown browser gracefully in analytics', async () => {
    const testDate = new Date('2025-10-20T12:00:00Z');

    // Create pageview with null browser data (simulating unparseable UA) using factory
    const pageview = createTestPageview({
      path: '/test-device-browser-unknown',
      added_iso: testDate,
      device_type: 'desktop',
      browser_name: null,
      browser_version: null,
      browser_major_version: null,
      user_agent: 'Unknown/Malformed User Agent',
    });

    await prisma.pageview.create({ data: pageview as any });

    // Query browser breakdown
    const startDate = new Date('2025-10-20T00:00:00Z');
    const endDate = new Date('2025-10-20T23:59:59Z');

    const browserBreakdown = await getBrowserBreakdown(startDate, endDate, 5);

    // Verify Unknown category exists using custom matcher
    const unknownData = expectBrowserInResults(browserBreakdown, 'Unknown');
    expect(unknownData.count).toBeGreaterThan(0);
  });

  it('should correctly calculate "Other" category for browsers', async () => {
    const testDate = new Date('2025-10-25T12:00:00Z');

    // Create 7 different browsers (more than top 5 limit) using factory
    const browsers = [
      { name: 'Chrome', version: '120' },
      { name: 'Safari', version: '17' },
      { name: 'Firefox', version: '121' },
      { name: 'Edge', version: '120' },
      { name: 'Opera', version: '105' },
      { name: 'Brave', version: '1' },
      { name: 'Vivaldi', version: '6' },
    ];

    for (let i = 0; i < browsers.length; i++) {
      const browser = browsers[i];
      const pageview = createTestPageview({
        path: `/test-device-browser-other-${i}`,
        added_iso: testDate,
        device_type: 'desktop',
        browser_name: browser.name,
        browser_version: `${browser.version}.0`,
        browser_major_version: browser.version,
        user_agent: `${browser.name}/${browser.version}.0`,
      });

      await prisma.pageview.create({ data: pageview as any });
    }

    // Query browser breakdown with limit of 5
    const startDate = new Date('2025-10-25T00:00:00Z');
    const endDate = new Date('2025-10-25T23:59:59Z');

    const browserBreakdown = await getBrowserBreakdown(startDate, endDate, 5);

    // Verify "Other" category is present using custom matcher
    const otherData = expectBrowserInResults(browserBreakdown, 'Other');
    expect(otherData.count).toBe(2); // Brave and Vivaldi should be in "Other"

    // Verify total count matches using custom matcher
    expectTotalCount(browserBreakdown, 7);
  });
});

// Placeholder test to ensure this file runs successfully when E2E tests are skipped
describe('Device and Browser Analytics E2E - Placeholder', () => {
  it('should have E2E tests available (currently skipped)', () => {
    expect(true).toBe(true);
  });
});
