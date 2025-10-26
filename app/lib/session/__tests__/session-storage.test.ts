/**
 * Session Storage Tests
 * Focused tests for session tracking functionality (Task 7.1)
 */

import { getOrCreateSession, updateSession } from '../session-storage';
import { getRedisClient } from '../../redis';

// Mock Redis client
jest.mock('../../redis');

// Type for the mock Redis client
interface MockRedisClient {
  get: jest.Mock;
  setEx: jest.Mock;
}

describe('Session Storage', () => {
  let mockRedis: MockRedisClient;

  beforeEach(() => {
    // Create mock Redis client
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
    };

    (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateSession', () => {
    it('should create new session with correct structure when session does not exist', async () => {
      const sessionId = 'test-session-123';
      const referrer = 'https://google.com';
      const utmParams = {
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'launch',
      };

      mockRedis.get.mockResolvedValue(null);

      const result = await getOrCreateSession(sessionId, referrer, utmParams);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        page_count: 1,
        initial_referrer: referrer,
        utm_params: {
          source: 'newsletter',
          medium: 'email',
          campaign: 'launch',
        },
      });
      expect(result?.start_time).toBeDefined();
      expect(result?.last_seen).toBeDefined();

      // Verify Redis setEx was called with 24hr TTL
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400,
        expect.any(String)
      );
    });

    it('should return existing session metadata when session exists in Redis', async () => {
      const sessionId = 'existing-session-456';
      const existingSession = {
        start_time: '2025-10-24T10:00:00.000Z',
        page_count: 3,
        last_seen: '2025-10-24T10:15:00.000Z',
        initial_referrer: 'https://twitter.com',
        utm_params: {
          source: 'social',
          medium: 'twitter',
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingSession));

      const result = await getOrCreateSession(sessionId, null, {});

      expect(result).toEqual(existingSession);
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });

    it('should gracefully degrade when Redis is unavailable', async () => {
      const sessionId = 'fail-session-789';

      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await getOrCreateSession(sessionId, null, {});

      expect(result).toBeNull();
      // Should not throw error
    });
  });

  describe('updateSession', () => {
    it('should increment page_count and update last_seen timestamp', async () => {
      const sessionId = 'update-session-123';
      const existingSession = {
        start_time: '2025-10-24T10:00:00.000Z',
        page_count: 2,
        last_seen: '2025-10-24T10:15:00.000Z',
        initial_referrer: 'https://google.com',
        utm_params: { source: 'search' },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingSession));

      const result = await updateSession(sessionId);

      expect(result).not.toBeNull();
      expect(result?.page_count).toBe(3);
      expect(result?.last_seen).not.toBe(existingSession.last_seen);

      // Verify Redis TTL was refreshed (sliding window)
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400,
        expect.any(String)
      );
    });

    it('should refresh session TTL to 24 hours on each update (sliding window)', async () => {
      const sessionId = 'ttl-session-456';
      const existingSession = {
        start_time: '2025-10-24T08:00:00.000Z',
        page_count: 5,
        last_seen: '2025-10-24T10:00:00.000Z',
        initial_referrer: null,
        utm_params: {},
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(existingSession));

      await updateSession(sessionId);

      // Verify TTL is set to 86400 seconds (24 hours)
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400,
        expect.any(String)
      );
    });

    it('should gracefully degrade when Redis is unavailable during update', async () => {
      const sessionId = 'fail-update-789';

      mockRedis.get.mockRejectedValue(new Error('Redis timeout'));

      const result = await updateSession(sessionId);

      expect(result).toBeNull();
      // Should not throw error
    });

    it('should return null when session does not exist for update', async () => {
      const sessionId = 'nonexistent-session';

      mockRedis.get.mockResolvedValue(null);

      const result = await updateSession(sessionId);

      expect(result).toBeNull();
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });
  });

  describe('Session ID format', () => {
    it('should handle session_id in crypto.randomUUID format', async () => {
      // crypto.randomUUID() format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidSessionId = '550e8400-e29b-41d4-a716-446655440000';

      mockRedis.get.mockResolvedValue(null);

      const result = await getOrCreateSession(uuidSessionId, null, {});

      expect(result).not.toBeNull();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${uuidSessionId}`,
        86400,
        expect.any(String)
      );
    });
  });
});
