/**
 * Active Visitors End-to-End Integration Tests
 *
 * Strategic tests covering critical integration gaps:
 * 1. Full workflow from pageview tracking to active count retrieval
 * 2. 5-minute expiration window with time-based verification
 * 3. Daily salt rotation for visitor hash
 * 4. Multiple concurrent visitor tracking
 * 5. Redis cleanup and count accuracy across multiple operations
 */

import { NextRequest } from 'next/server';
import { prisma } from 'lib/db/prisma';
import { getRedisClient, getRedisKey } from 'lib/redis';
import { generateVisitorHash } from 'lib/privacy/visitor-hash';

// Import route handlers
import { GET as getActiveVisitors } from '../../src/app/api/active-visitors/route';
import { POST as trackPageview } from '../../src/app/api/metrics/route';

// Import modules that will be mocked locally (not globally)
import * as maxmindReader from 'lib/geoip/maxmind-reader';
import * as visitorTracking from 'lib/privacy/visitor-tracking';

describe('Active Visitors E2E Integration Tests', () => {
  let redisClient: Awaited<ReturnType<typeof getRedisClient>>;
  let _mockLookupCountryCode: jest.SpyInstance;
  let _mockCheckAndRecordVisitor: jest.SpyInstance;

  beforeAll(async () => {
    // Generate unique Redis prefix for this test file to prevent key collisions between test files
    process.env.TEST_REDIS_PREFIX = `test-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      redisClient = await getRedisClient();
    } catch {
      console.warn('Redis not available - skipping E2E tests');
    }
  });

  beforeEach(async () => {
    // Set up local mocks (not global - isolated to this test file)
    _mockLookupCountryCode = jest.spyOn(maxmindReader, 'lookupCountryCode').mockReturnValue('US');
    _mockCheckAndRecordVisitor = jest.spyOn(visitorTracking, 'checkAndRecordVisitor').mockResolvedValue(true);

    if (redisClient) {
      try {
        await redisClient.del(getRedisKey('active_visitors'));
      } catch {
        // Redis not available, skip cleanup
      }
    }
  });

  afterEach(() => {
    // Restore all mocks to prevent pollution of other tests
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pageview.deleteMany({
      where: {
        path: {
          contains: '/test-e2e-active-visitor',
        },
      },
    });

    if (redisClient) {
      try {
        await redisClient.del(getRedisKey('active_visitors'));
      } catch {
        // Redis not available, skip cleanup
      }
    }
    await prisma.$disconnect();

    // Clean up environment variable after all tests in this file complete
    delete process.env.TEST_REDIS_PREFIX;
  });

  /**
   * Integration Test 1: Full flow from /api/track to /api/active-visitors
   * Verifies: Track pageview → Redis records visitor → Query returns accurate count
   */
  test('full workflow: track pageview -> verify Redis entry -> query active count', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    // Step 1: Track a pageview
    const trackPayload = {
      page_id: 'c000000000000000000000001',
      path: '/test-e2e-active-visitor-flow',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Test Browser)',
      added_iso: new Date().toISOString(),
      duration_seconds: 15,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const trackRequest = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(trackPayload),
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.50',
      },
    });

    const trackResponse = await trackPageview(trackRequest);
    expect(trackResponse.status).toBe(204);

    // Wait for Redis operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Verify Redis entry exists
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const threshold = currentTimestamp - 300;
    const redisCount = await redisClient.zCount(getRedisKey('active_visitors'), threshold, '+inf');
    expect(redisCount).toBeGreaterThan(0);

    // Step 3: Query active visitor count via API
    const queryResponse = await getActiveVisitors();
    const queryData = await queryResponse.json();

    expect(queryResponse.status).toBe(200);
    expect(queryData.count).toBeGreaterThan(0);
    expect(queryData.count).toBe(redisCount);
  });

  /**
   * Integration Test 2: Multiple concurrent visitors tracking
   * Verifies: Multiple pageviews → All recorded → Accurate count with deduplication
   */
  test('tracks multiple concurrent visitors and returns accurate count', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    // Track 5 different visitors
    const visitors = [
      { ip: '203.0.113.1', ua: 'Mozilla/5.0 (Windows NT 10.0)' },
      { ip: '203.0.113.2', ua: 'Mozilla/5.0 (Macintosh)' },
      { ip: '203.0.113.3', ua: 'Mozilla/5.0 (Linux)' },
      { ip: '203.0.113.4', ua: 'Mozilla/5.0 (iPhone)' },
      { ip: '203.0.113.5', ua: 'Mozilla/5.0 (Android)' },
    ];

    // Track all visitors concurrently
    await Promise.all(
      visitors.map(async (visitor, index) => {
        const pageIdSuffix = (index + 2).toString();
        const payload = {
          page_id: `c00000000000000000000000${pageIdSuffix}`,
          path: '/test-e2e-active-visitor-multi',
          device_type: 'desktop',
          user_agent: visitor.ua,
          added_iso: new Date().toISOString(),
          duration_seconds: 10,
          is_internal_referrer: false,
          visibility_changes: 0,
        };

        const request = new NextRequest('http://localhost:3000/api/track', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': visitor.ip,
          },
        });

        return trackPageview(request);
      })
    );

    // Wait for all Redis operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Query active count
    const queryResponse = await getActiveVisitors();
    const queryData = await queryResponse.json();

    expect(queryResponse.status).toBe(200);
    expect(queryData.count).toBeGreaterThanOrEqual(5);
  });

  /**
   * Integration Test 3: Visitor deduplication within 5-minute window
   * Verifies: Same visitor multiple pageviews → Only counted once
   */
  test('deduplicates same visitor within active window', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const sameVisitor = {
      ip: '203.0.113.100',
      ua: 'Mozilla/5.0 (Consistent Browser)',
    };

    // Track same visitor 3 times
    for (let i = 0; i < 3; i++) {
      const pageIdSuffix = (i + 7).toString();
      const payload = {
        page_id: `c00000000000000000000000${pageIdSuffix}`,
        path: `/test-e2e-active-visitor-dedup-${i}`,
        device_type: 'desktop',
        user_agent: sameVisitor.ua,
        added_iso: new Date().toISOString(),
        duration_seconds: 5,
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': sameVisitor.ip,
        },
      });

      await trackPageview(request);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for Redis operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Query active count - should be 1 (deduplicated)
    const queryResponse = await getActiveVisitors();
    await queryResponse.json();

    expect(queryResponse.status).toBe(200);

    // Generate the expected hash for this visitor
    const today = new Date();
    const expectedHash = generateVisitorHash(sameVisitor.ip, sameVisitor.ua, today);

    // Count how many times this specific hash appears
    const members = await redisClient.zRange(getRedisKey('active_visitors'), 0, -1);
    const hashCount = members.filter(member => member === expectedHash).length;

    // Should only appear once due to ZADD behavior (updates score if member exists)
    expect(hashCount).toBe(1);
  });

  /**
   * Integration Test 4: Daily salt rotation for visitor hash
   * Verifies: Same visitor on different days → Different hashes
   */
  test('generates different hashes for same visitor on different days', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const visitor = {
      ip: '203.0.113.200',
      ua: 'Mozilla/5.0 (Salt Rotation Test)',
    };

    // Generate hash for today
    const today = new Date();
    const hashToday = generateVisitorHash(visitor.ip, visitor.ua, today);

    // Generate hash for yesterday
    const yesterday = new Date(Date.now() - 86400000);
    const hashYesterday = generateVisitorHash(visitor.ip, visitor.ua, yesterday);

    // Generate hash for tomorrow
    const tomorrow = new Date(Date.now() + 86400000);
    const hashTomorrow = generateVisitorHash(visitor.ip, visitor.ua, tomorrow);

    // Verify all hashes are different
    expect(hashToday).not.toBe(hashYesterday);
    expect(hashToday).not.toBe(hashTomorrow);
    expect(hashYesterday).not.toBe(hashTomorrow);

    // Verify hash format (SHA256 produces 64 hex characters)
    expect(hashToday).toMatch(/^[a-f0-9]{64}$/);
    expect(hashYesterday).toMatch(/^[a-f0-9]{64}$/);
    expect(hashTomorrow).toMatch(/^[a-f0-9]{64}$/);
  });

  /**
   * Integration Test 5: 5-minute expiration window accuracy
   * Verifies: Add visitors at different times → Only recent ones counted
   */
  test('correctly excludes visitors outside 5-minute window', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Manually add visitors at different timestamps
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_now' },
      { score: currentTimestamp - 60, value: 'visitor_1min_ago' },
      { score: currentTimestamp - 120, value: 'visitor_2min_ago' },
      { score: currentTimestamp - 180, value: 'visitor_3min_ago' },
      { score: currentTimestamp - 240, value: 'visitor_4min_ago' },
      { score: currentTimestamp - 299, value: 'visitor_4min59s_ago' }, // Just under 5 min
      { score: currentTimestamp - 301, value: 'visitor_5min01s_ago' }, // Just over 5 min
      { score: currentTimestamp - 360, value: 'visitor_6min_ago' },
      { score: currentTimestamp - 600, value: 'visitor_10min_ago' },
    ]);

    // Query active count
    const queryResponse = await getActiveVisitors();
    const queryData = await queryResponse.json();

    expect(queryResponse.status).toBe(200);

    // Should count exactly 6 visitors (those within 5 minutes)
    // Includes: now, 1min, 2min, 3min, 4min, 4min59s
    // Excludes: 5min01s, 6min, 10min
    expect(queryData.count).toBe(6);
  });

  /**
   * Integration Test 6: Redis cleanup removes expired entries
   * Verifies: Cleanup operation actually removes old entries
   */
  test('cleanup operation removes expired entries from Redis', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Add mix of active and expired visitors
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'active_1' },
      { score: currentTimestamp - 100, value: 'active_2' },
      { score: currentTimestamp - 400, value: 'expired_1' },
      { score: currentTimestamp - 500, value: 'expired_2' },
      { score: currentTimestamp - 1000, value: 'expired_3' },
    ]);

    // Count total entries before cleanup
    const beforeCleanup = await redisClient.zCount(getRedisKey('active_visitors'), '-inf', '+inf');
    expect(beforeCleanup).toBe(5);

    // Trigger cleanup by querying active visitors
    await getActiveVisitors();

    // Count total entries after cleanup
    const afterCleanup = await redisClient.zCount(getRedisKey('active_visitors'), '-inf', '+inf');

    // Should only have 2 active visitors left (expired ones removed)
    expect(afterCleanup).toBe(2);
  });

  /**
   * Integration Test 7: High-frequency updates from same visitor
   * Verifies: Rapid pageviews from same visitor → Last timestamp wins
   */
  test('handles high-frequency updates from same visitor correctly', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const visitor = {
      ip: '203.0.113.250',
      ua: 'Mozilla/5.0 (High Frequency Test)',
    };

    // Track 10 pageviews rapidly from same visitor
    // Use unique timestamp-based IDs to avoid database constraint violations
    const trackPromises = [];
    for (let i = 0; i < 10; i++) {
      // Generate unique page_id using timestamp + counter + random suffix
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const pageId = `c${timestamp}${i}${random}`.substring(0, 25).padEnd(25, '0');

      const payload = {
        page_id: pageId,
        path: `/test-e2e-high-freq-${i}`,
        device_type: 'desktop',
        user_agent: visitor.ua,
        added_iso: new Date().toISOString(),
        duration_seconds: 1,
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': visitor.ip,
        },
      });

      trackPromises.push(trackPageview(request));
    }

    await Promise.all(trackPromises);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Generate expected hash
    const today = new Date();
    const expectedHash = generateVisitorHash(visitor.ip, visitor.ua, today);

    // Verify only one entry for this visitor (ZADD updates score)
    const members = await redisClient.zRange(getRedisKey('active_visitors'), 0, -1);
    const hashCount = members.filter(member => member === expectedHash).length;
    expect(hashCount).toBe(1);

    // Verify timestamp is recent (within last second)
    const scores = await redisClient.zScore(getRedisKey('active_visitors'), expectedHash);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    expect(scores).toBeGreaterThanOrEqual(currentTimestamp - 2);
    expect(scores).toBeLessThanOrEqual(currentTimestamp + 1);
  });
});
