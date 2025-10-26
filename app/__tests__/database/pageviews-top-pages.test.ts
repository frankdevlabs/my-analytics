/**
 * Enhanced getTopPages() Function Tests
 *
 * Tests the enhanced getTopPages() function to ensure it correctly returns
 * pageviews and unique visitors per page using raw SQL with conditional aggregation.
 */

import { PrismaClient } from '@prisma/client';
import { getTopPages } from '../../lib/db/pageviews';

const prisma = new PrismaClient();

// Setup test data
beforeAll(async () => {
  // Clean up any existing test data
  await prisma.pageview.deleteMany({
    where: {
      path: {
        startsWith: '/test-top-',
      },
    },
  });

  // Create test pageviews with different paths
  const testDate = new Date('2025-01-15T10:00:00Z');

  await prisma.pageview.createMany({
    data: [
      // /test-top-home: 5 pageviews, 3 unique
      { path: '/test-top-home', is_unique: true, added_iso: testDate, device_type: 'desktop', duration_seconds: 30 },
      { path: '/test-top-home', is_unique: true, added_iso: testDate, device_type: 'mobile', duration_seconds: 25 },
      { path: '/test-top-home', is_unique: true, added_iso: testDate, device_type: 'tablet', duration_seconds: 40 },
      { path: '/test-top-home', is_unique: false, added_iso: testDate, device_type: 'desktop', duration_seconds: 20 },
      { path: '/test-top-home', is_unique: false, added_iso: testDate, device_type: 'mobile', duration_seconds: 15 },

      // /test-top-about: 3 pageviews, 2 unique
      { path: '/test-top-about', is_unique: true, added_iso: testDate, device_type: 'desktop', duration_seconds: 45 },
      { path: '/test-top-about', is_unique: true, added_iso: testDate, device_type: 'mobile', duration_seconds: 50 },
      { path: '/test-top-about', is_unique: false, added_iso: testDate, device_type: 'desktop', duration_seconds: 30 },

      // /test-top-contact: 2 pageviews, 1 unique
      { path: '/test-top-contact', is_unique: true, added_iso: testDate, device_type: 'desktop', duration_seconds: 60 },
      { path: '/test-top-contact', is_unique: false, added_iso: testDate, device_type: 'mobile', duration_seconds: 35 },

      // /test-top-blog: 1 pageview, 0 unique
      { path: '/test-top-blog', is_unique: false, added_iso: testDate, device_type: 'tablet', duration_seconds: 120 },
    ],
  });
});

// Clean up test data after all tests
afterAll(async () => {
  await prisma.pageview.deleteMany({
    where: {
      path: {
        startsWith: '/test-top-',
      },
    },
  });

  await prisma.$disconnect();
});

describe('getTopPages() - Enhanced Function', () => {
  /**
   * Test 1: Returns correct pageviews count
   */
  test('should return correct pageviews count for each path', async () => {
    const startDate = new Date('2025-01-15T00:00:00Z');
    const endDate = new Date('2025-01-15T23:59:59Z');

    const result = await getTopPages(startDate, endDate, 10);

    // Find test pages in results
    const homePage = result.find(p => p.path === '/test-top-home');
    const aboutPage = result.find(p => p.path === '/test-top-about');
    const contactPage = result.find(p => p.path === '/test-top-contact');

    expect(homePage).toBeDefined();
    expect(homePage?.pageviews).toBe(5);

    expect(aboutPage).toBeDefined();
    expect(aboutPage?.pageviews).toBe(3);

    expect(contactPage).toBeDefined();
    expect(contactPage?.pageviews).toBe(2);
  });

  /**
   * Test 2: Returns correct unique visitors count
   */
  test('should return correct unique visitors count for each path', async () => {
    const startDate = new Date('2025-01-15T00:00:00Z');
    const endDate = new Date('2025-01-15T23:59:59Z');

    const result = await getTopPages(startDate, endDate, 10);

    // Find test pages in results
    const homePage = result.find(p => p.path === '/test-top-home');
    const aboutPage = result.find(p => p.path === '/test-top-about');
    const contactPage = result.find(p => p.path === '/test-top-contact');
    const blogPage = result.find(p => p.path === '/test-top-blog');

    expect(homePage).toBeDefined();
    expect(homePage?.uniqueVisitors).toBe(3);

    expect(aboutPage).toBeDefined();
    expect(aboutPage?.uniqueVisitors).toBe(2);

    expect(contactPage).toBeDefined();
    expect(contactPage?.uniqueVisitors).toBe(1);

    expect(blogPage).toBeDefined();
    expect(blogPage?.uniqueVisitors).toBe(0);
  });

  /**
   * Test 3: Results ordered by pageviews descending
   */
  test('should return results ordered by pageviews descending', async () => {
    const startDate = new Date('2025-01-15T00:00:00Z');
    const endDate = new Date('2025-01-15T23:59:59Z');

    const result = await getTopPages(startDate, endDate, 10);

    // Filter to only our test pages
    const testPages = result.filter(p => p.path.startsWith('/test-top-'));

    // Verify ordering
    expect(testPages.length).toBeGreaterThanOrEqual(4);
    expect(testPages[0].path).toBe('/test-top-home');      // 5 pageviews
    expect(testPages[1].path).toBe('/test-top-about');     // 3 pageviews
    expect(testPages[2].path).toBe('/test-top-contact');   // 2 pageviews
    expect(testPages[3].path).toBe('/test-top-blog');      // 1 pageview
  });

  /**
   * Test 4: Limit parameter works correctly
   */
  test('should respect limit parameter', async () => {
    const startDate = new Date('2025-01-15T00:00:00Z');
    const endDate = new Date('2025-01-15T23:59:59Z');

    const result = await getTopPages(startDate, endDate, 2);

    expect(result.length).toBeLessThanOrEqual(2);
  });
});
