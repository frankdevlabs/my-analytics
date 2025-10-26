/**
 * Active Visitor Tracking Service Tests
 *
 * Tests the Redis-based active visitor tracking service to ensure:
 * - ZADD operation records visitor activity correctly
 * - ZREMRANGEBYSCORE cleanup removes expired entries (older than 5 minutes)
 * - ZCOUNT query returns accurate active visitor count
 * - Graceful error handling when Redis is unavailable
 */

import { recordVisitorActivity, getActiveVisitorCount } from '../active-visitor-tracking';
import { getRedisClient } from '../../redis';

// Mock the Redis client
jest.mock('../../redis');

const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

interface MockRedisClient {
  zAdd: jest.Mock;
  zRemRangeByScore: jest.Mock;
  zCount: jest.Mock;
}

describe('Active Visitor Tracking Service', () => {
  let mockRedisClient: MockRedisClient;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock Redis client with all required methods
    mockRedisClient = {
      zAdd: jest.fn().mockResolvedValue(1),
      zRemRangeByScore: jest.fn().mockResolvedValue(0),
      zCount: jest.fn().mockResolvedValue(0),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetRedisClient.mockResolvedValue(mockRedisClient as any);

    // Spy on console.error to verify error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  /**
   * Test 1: ZADD operation for recording visitor activity
   * Verifies that visitor activity is recorded in Redis Sorted Set
   * with current timestamp as score
   */
  test('should record visitor activity using ZADD with current timestamp', async () => {
    const visitorHash = 'abc123def456';
    const beforeCall = Math.floor(Date.now() / 1000);

    await recordVisitorActivity(visitorHash);

    const afterCall = Math.floor(Date.now() / 1000);

    expect(mockGetRedisClient).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.zAdd).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.zAdd).toHaveBeenCalledWith('active_visitors', {
      score: expect.any(Number),
      value: visitorHash,
    });

    // Verify timestamp is current (within reasonable range)
    const callArgs = mockRedisClient.zAdd.mock.calls[0][1];
    expect(callArgs.score).toBeGreaterThanOrEqual(beforeCall);
    expect(callArgs.score).toBeLessThanOrEqual(afterCall);
  });

  /**
   * Test 2: ZREMRANGEBYSCORE cleanup of expired entries
   * Verifies that entries older than 5 minutes are removed
   * before counting active visitors
   */
  test('should cleanup expired entries using ZREMRANGEBYSCORE before counting', async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const threshold = currentTime - 300; // 5 minutes ago

    mockRedisClient.zCount.mockResolvedValue(3);

    await getActiveVisitorCount();

    expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.zRemRangeByScore).toHaveBeenCalledWith(
      'active_visitors',
      '-inf',
      expect.any(Number)
    );

    // Verify threshold is approximately 300 seconds before current time
    const thresholdArg = mockRedisClient.zRemRangeByScore.mock.calls[0][2];
    expect(thresholdArg).toBeGreaterThanOrEqual(threshold - 1);
    expect(thresholdArg).toBeLessThanOrEqual(threshold + 1);
  });

  /**
   * Test 3: ZCOUNT query for active visitor count
   * Verifies that the count of active visitors is queried correctly
   * and returned to the caller
   */
  test('should query active visitor count using ZCOUNT', async () => {
    const expectedCount = 5;
    mockRedisClient.zCount.mockResolvedValue(expectedCount);

    const count = await getActiveVisitorCount();

    expect(mockRedisClient.zCount).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.zCount).toHaveBeenCalledWith(
      'active_visitors',
      expect.any(Number),
      '+inf'
    );
    expect(count).toBe(expectedCount);
  });

  /**
   * Test 4: Error handling when Redis unavailable (recordVisitorActivity)
   * Verifies that errors are logged but not thrown,
   * allowing the application to continue functioning
   */
  test('should handle Redis errors gracefully in recordVisitorActivity', async () => {
    const visitorHash = 'xyz789';
    const redisError = new Error('Redis connection failed');
    mockGetRedisClient.mockRejectedValue(redisError);

    // Should not throw
    await expect(recordVisitorActivity(visitorHash)).resolves.toBeUndefined();

    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to record visitor activity in Redis:',
      redisError
    );
  });

  /**
   * Test 5: Error handling when Redis unavailable (getActiveVisitorCount)
   * Verifies that null is returned when Redis is unavailable,
   * allowing graceful degradation in the UI
   */
  test('should return null when Redis unavailable in getActiveVisitorCount', async () => {
    const redisError = new Error('Redis connection timeout');
    mockGetRedisClient.mockRejectedValue(redisError);

    const count = await getActiveVisitorCount();

    expect(count).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to get active visitor count from Redis:',
      redisError
    );
  });

  /**
   * Test 6: ZCOUNT uses correct time threshold (5 minutes)
   * Verifies that the threshold parameter passed to ZCOUNT
   * is exactly 300 seconds before current time
   */
  test('should use 5-minute threshold for ZCOUNT query', async () => {
    const beforeCall = Math.floor(Date.now() / 1000) - 300;
    mockRedisClient.zCount.mockResolvedValue(2);

    await getActiveVisitorCount();

    const afterCall = Math.floor(Date.now() / 1000) - 300;

    expect(mockRedisClient.zCount).toHaveBeenCalledTimes(1);
    const thresholdArg = mockRedisClient.zCount.mock.calls[0][1];

    // Verify threshold is approximately 300 seconds before current time
    expect(thresholdArg).toBeGreaterThanOrEqual(beforeCall - 1);
    expect(thresholdArg).toBeLessThanOrEqual(afterCall + 1);
  });
});
