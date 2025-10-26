import { getRedisClient } from '../redis';

/**
 * Check if visitor hash exists in Redis and record if new
 * Returns true for new visitors, false for returning visitors
 *
 * @param hash - SHA-256 visitor hash
 * @returns Promise<boolean> - true if visitor is unique (new), false if returning
 */
export async function checkAndRecordVisitor(hash: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const key = `visitor:hash:${hash}`;

    const exists = await redis.get(key);

    if (exists === null) {
      await redis.setEx(key, 86400, '1');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Redis error in checkAndRecordVisitor - assuming unique visitor for graceful degradation:', error);
    // Return true to prefer overcounting unique visitors over undercounting to zero
    return true;
  }
}
