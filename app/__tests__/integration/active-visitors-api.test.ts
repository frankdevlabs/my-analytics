/**
 * Active Visitors API Endpoints Tests
 * Tests the /api/active-visitors and /api/track endpoints for Redis-based active visitor tracking
 */

import { NextRequest } from 'next/server';
import { prisma } from 'lib/db/prisma';
import { getRedisClient, getRedisKey } from 'lib/redis';

// Import the route handlers
import { GET as getActiveVisitors } from '../../src/app/api/active-visitors/route';
import { POST as trackPageview } from '../../src/app/api/metrics/route';

// Import functions that will be mocked locally (not globally)
import * as maxmindReader from 'lib/geoip/maxmind-reader';
import * as visitorTracking from 'lib/privacy/visitor-tracking';

describe('Active Visitors API Integration', () => {
  let redisClient: Awaited<ReturnType<typeof getRedisClient>>;
  let mockLookupCountryCode: jest.SpyInstance;
  let mockCheckAndRecordVisitor: jest.SpyInstance;

  beforeAll(async () => {
    // Generate unique Redis prefix for this test file to prevent key collisions between test files
    process.env.TEST_REDIS_PREFIX = `test-api-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Get Redis client for test cleanup
    try {
      redisClient = await getRedisClient();
    } catch {
      console.warn('Redis not available for tests - skipping Redis-dependent tests');
    }
  });

  beforeEach(async () => {
    // Set up local mocks (not global - isolated to this test file)
    mockLookupCountryCode = jest.spyOn(maxmindReader, 'lookupCountryCode').mockReturnValue('US');
    mockCheckAndRecordVisitor = jest.spyOn(visitorTracking, 'checkAndRecordVisitor').mockResolvedValue(true);

    // Clean up Redis test data if available
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
          contains: '/test-active-visitor',
        },
      },
    });

    // Clean up Redis
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

  describe('GET /api/active-visitors', () => {
    test('returns correct count structure when visitors are active', async () => {
      if (!redisClient) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Manually add active visitors to Redis
      const currentTimestamp = Math.floor(Date.now() / 1000);
      await redisClient.zAdd(getRedisKey('active_visitors'), [
        { score: currentTimestamp, value: 'visitor1' },
        { score: currentTimestamp - 60, value: 'visitor2' },
        { score: currentTimestamp - 120, value: 'visitor3' },
      ]);

      const response = await getActiveVisitors();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('count');
      expect(typeof data.count).toBe('number');
      expect(data.count).toBe(3);
    });

    test('returns count: 0 when no visitors are active', async () => {
      if (!redisClient) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const response = await getActiveVisitors();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ count: 0 });
    });

    test('returns count: null when Redis is unavailable', async () => {
      if (!redisClient) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Temporarily mock the getActiveVisitorCount to simulate Redis failure
      const activeVisitorTracking = await import('../../lib/active-visitors/active-visitor-tracking');
      const mockGetActiveVisitorCount = jest.spyOn(
        activeVisitorTracking,
        'getActiveVisitorCount'
      );
      mockGetActiveVisitorCount.mockResolvedValueOnce(null);

      const response = await getActiveVisitors();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ count: null });

      mockGetActiveVisitorCount.mockRestore();
    });

    test('excludes expired visitors (older than 5 minutes)', async () => {
      if (!redisClient) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      await redisClient.zAdd(getRedisKey('active_visitors'), [
        { score: currentTimestamp, value: 'visitor_active_1' },
        { score: currentTimestamp - 299, value: 'visitor_active_2' }, // Just under 5 min
        { score: currentTimestamp - 301, value: 'visitor_expired_1' }, // Just over 5 min
        { score: currentTimestamp - 600, value: 'visitor_expired_2' }, // 10 minutes old
      ]);

      const response = await getActiveVisitors();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(2); // Only the two active visitors
    });
  });

  describe('POST /api/track with Redis visitor recording', () => {
    test('records visitor activity in Redis after successful pageview', async () => {
      if (!redisClient) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const payload = {
        page_id: 'clh1234567890abcdefghijk1', // Valid CUID format
        path: '/test-active-visitor-tracking',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
          'x-forwarded-for': '8.8.8.8',
        },
      });

      const response = await trackPageview(request);

      expect(response.status).toBe(204);

      // Wait a moment for Redis operation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify visitor was recorded in Redis
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const threshold = currentTimestamp - 300;
      const activeCount = await redisClient.zCount(getRedisKey('active_visitors'), threshold, '+inf');

      expect(activeCount).toBeGreaterThan(0);
    });

    test('continues working when Redis fails (graceful degradation)', async () => {
      if (!redisClient) {
        console.log('Skipping test - Redis not available');
        return;
      }

      // Mock recordVisitorActivity to simulate Redis failure
      const activeVisitorTracking = await import('../../lib/active-visitors/active-visitor-tracking');
      const mockRecordVisitorActivity = jest.spyOn(
        activeVisitorTracking,
        'recordVisitorActivity'
      );
      mockRecordVisitorActivity.mockRejectedValueOnce(new Error('Redis connection failed'));

      const payload = {
        page_id: 'clh2234567890abcdefghijk2', // Valid CUID format
        path: '/test-active-visitor-redis-failure',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
          'x-forwarded-for': '8.8.8.8',
        },
      });

      const response = await trackPageview(request);

      // Should still return success even though Redis failed
      expect(response.status).toBe(204);

      // Verify pageview was still recorded in database
      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-active-visitor-redis-failure' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();

      mockRecordVisitorActivity.mockRestore();
    });
  });
});
