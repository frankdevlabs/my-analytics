import { getRedisClient } from '../redis';

const REDIS_KEY = 'active_visitors';
const ACTIVE_WINDOW_SECONDS = 300; // 5 minutes

/**
 * Record visitor activity in Redis Sorted Set
 * Stores visitor hash with current timestamp as score for active tracking
 *
 * @param visitorHash - SHA256 hash of visitor (IP + UserAgent + DailySalt)
 * @returns Promise that resolves when activity is recorded
 *
 * @remarks
 * - Gracefully degrades if Redis is unavailable (logs error but doesn't throw)
 * - Uses ZADD to store visitor hash with timestamp score
 * - Single Redis key 'active_visitors' for all visitors
 */
export async function recordVisitorActivity(visitorHash: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const currentTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

    await client.zAdd(REDIS_KEY, {
      score: currentTimestamp,
      value: visitorHash,
    });
  } catch (error) {
    console.error('Failed to record visitor activity in Redis:', error);
    // Don't throw - graceful degradation
  }
}

/**
 * Get count of active visitors (within last 5 minutes)
 * Cleans up expired entries before counting
 *
 * @returns Promise resolving to active visitor count, or null if Redis unavailable
 *
 * @remarks
 * - Returns null instead of throwing errors for graceful degradation
 * - Uses ZREMRANGEBYSCORE to cleanup expired entries (older than 5 minutes)
 * - Uses ZCOUNT to count active visitors within threshold
 * - Active window: 300 seconds (5 minutes)
 */
export async function getActiveVisitorCount(): Promise<number | null> {
  try {
    const client = await getRedisClient();
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const threshold = currentTimestamp - ACTIVE_WINDOW_SECONDS;

    // Clean up expired entries (older than 5 minutes)
    await client.zRemRangeByScore(REDIS_KEY, '-inf', threshold);

    // Count active visitors (within last 5 minutes)
    const count = await client.zCount(REDIS_KEY, threshold, '+inf');

    return count;
  } catch (error) {
    console.error('Failed to get active visitor count from Redis:', error);
    return null; // Graceful degradation
  }
}
