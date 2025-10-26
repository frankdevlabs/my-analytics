import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client singleton
 * Manages connection lifecycle with automatic reconnection
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.error('Redis: Max reconnection attempts reached');
          return new Error('Max reconnection attempts reached');
        }
        const delay = Math.min(retries * 1000, 3000);
        console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
  });

  redisClient.on('connect', () => {
    console.log('Redis: Connected successfully');
  });

  redisClient.on('error', (err) => {
    console.error('Redis: Connection error', err);
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis: Reconnecting...');
  });

  await redisClient.connect();

  return redisClient;
}

/**
 * Close Redis client connection gracefully
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
