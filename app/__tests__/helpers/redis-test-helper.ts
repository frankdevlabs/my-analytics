/**
 * Redis Test Helper
 *
 * Provides isolated Redis key namespaces for test workers to prevent key collisions.
 * Each Jest worker gets its own key prefix (test:worker{N}:) ensuring tests don't
 * interfere with each other even when running in parallel.
 *
 * Usage:
 *   const redis = await getTestRedisClient();
 *   await redis.set('my_key', 'value'); // Automatically prefixed to test:worker1:my_key
 *   await cleanupTestRedisKeys(redis); // Cleans only this worker's keys
 */

import { RedisClientType } from 'redis';
import { getRedisClient } from 'lib/redis';

// Get Jest worker ID for unique namespace
function getWorkerID(): string {
  // Jest sets JEST_WORKER_ID environment variable (1, 2, 3, etc.)
  return process.env.JEST_WORKER_ID || '1';
}

// Generate unique prefix for this worker
function getKeyPrefix(): string {
  return `test:worker${getWorkerID()}:`;
}

/**
 * Wraps a Redis client to automatically prefix all keys
 */
class PrefixedRedisClient {
  constructor(
    private client: RedisClientType,
    private prefix: string
  ) {}

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // Wrap common Redis operations with auto-prefixing
  async get(key: string) {
    return this.client.get(this.prefixKey(key));
  }

  async set(key: string, value: string, options?: any) {
    return this.client.set(this.prefixKey(key), value, options);
  }

  async del(key: string | string[]) {
    const keys = Array.isArray(key) ? key : [key];
    const prefixedKeys = keys.map(k => this.prefixKey(k));
    return this.client.del(prefixedKeys);
  }

  async exists(key: string) {
    return this.client.exists(this.prefixKey(key));
  }

  async expire(key: string, seconds: number) {
    return this.client.expire(this.prefixKey(key), seconds);
  }

  async ttl(key: string) {
    return this.client.ttl(this.prefixKey(key));
  }

  async incr(key: string) {
    return this.client.incr(this.prefixKey(key));
  }

  async decr(key: string) {
    return this.client.decr(this.prefixKey(key));
  }

  async hSet(key: string, field: string, value: string) {
    return this.client.hSet(this.prefixKey(key), field, value);
  }

  async hGet(key: string, field: string) {
    return this.client.hGet(this.prefixKey(key), field);
  }

  async hGetAll(key: string) {
    return this.client.hGetAll(this.prefixKey(key));
  }

  async hDel(key: string, fields: string | string[]) {
    return this.client.hDel(this.prefixKey(key), fields);
  }

  async sAdd(key: string, members: string | string[]) {
    return this.client.sAdd(this.prefixKey(key), members);
  }

  async sMembers(key: string) {
    return this.client.sMembers(this.prefixKey(key));
  }

  async sRem(key: string, members: string | string[]) {
    return this.client.sRem(this.prefixKey(key), members);
  }

  async keys(pattern: string) {
    return this.client.keys(this.prefixKey(pattern));
  }

  // Expose underlying client for advanced operations
  getUnderlyingClient(): RedisClientType {
    return this.client;
  }

  // Get the prefix being used
  getPrefix(): string {
    return this.prefix;
  }
}

/**
 * Get a test Redis client with automatic key prefixing for isolation
 */
export async function getTestRedisClient(): Promise<PrefixedRedisClient> {
  const client = await getRedisClient();
  const prefix = getKeyPrefix();
  return new PrefixedRedisClient(client, prefix);
}

/**
 * Clean up all Redis keys created by this test worker
 * Call this in afterEach or afterAll to prevent test pollution
 */
export async function cleanupTestRedisKeys(
  client?: PrefixedRedisClient
): Promise<void> {
  try {
    const redisClient = client
      ? client.getUnderlyingClient()
      : await getRedisClient();

    const prefix = client ? client.getPrefix() : getKeyPrefix();
    const pattern = `${prefix}*`;

    // Get all keys matching this worker's prefix
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
      if (process.env.DEBUG_TESTS) {
        console.log(`🧹 Cleaned ${keys.length} Redis test keys`);
      }
    }
  } catch (error) {
    // Don't fail tests if Redis cleanup fails
    console.warn('Redis cleanup warning:', error);
  }
}

/**
 * Helper to wait for Redis key to appear (useful for testing async operations)
 */
export async function waitForRedisKey(
  client: PrefixedRedisClient,
  key: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const exists = await client.exists(key);
    if (exists) {
      return true;
    }
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return false;
}
