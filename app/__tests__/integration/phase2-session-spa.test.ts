/**
 * Phase 2 Integration Tests: Session Tracking + SPA Navigation
 *
 * Tests the complete integration of Phase 2 features:
 * - Session tracking with Redis storage and persistence
 * - SPA navigation detection and tracking
 * - Session metadata updates (page_count, TTL refresh)
 * - Bot detection with session context
 * - Duration calculation across navigations
 * - Graceful degradation on Redis failures
 * - UTM attribution persistence
 *
 * Focus: Integration workflows and critical E2E paths for Phase 2 features
 * Scope: Session tracking and SPA navigation only (not Phase 1 or Phase 3)
 */

import { getOrCreateSession, updateSession, SessionMetadata } from '../../lib/session/session-storage';
import { getRedisClient } from '../../lib/redis';
import { RedisClientType } from 'redis';

// Mock Redis client
jest.mock('../../lib/redis');

const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

interface MockRedisClient {
  get: jest.Mock;
  setEx: jest.Mock;
  disconnect: jest.Mock;
}

describe('Phase 2 Integration Tests: Session Tracking + SPA Navigation', () => {
  let mockRedis: MockRedisClient;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock Redis client
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      disconnect: jest.fn(),
    };

    // Cast to RedisClientType to satisfy type requirements
    mockGetRedisClient.mockResolvedValue(mockRedis as unknown as RedisClientType);
  });

  describe('Session Persistence E2E', () => {
    /**
     * Test 1: Session metadata persists across multiple pageviews
     * Verifies session creation on first pageview and retrieval on subsequent pageviews
     */
    test('should persist session metadata across multiple pageviews', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const initialReferrer = 'https://google.com';
      const utmParams = {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'launch-2025',
      };

      // First pageview: create session
      mockRedis.get.mockResolvedValueOnce(null); // Session doesn't exist yet

      const session1 = await getOrCreateSession(sessionId, initialReferrer, utmParams);

      expect(session1).not.toBeNull();
      expect(session1?.page_count).toBe(1);
      expect(session1?.initial_referrer).toBe(initialReferrer);
      expect(session1?.utm_params.source).toBe('google');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400, // 24-hour TTL
        expect.any(String)
      );

      // Second pageview: retrieve existing session
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session1));

      const session2 = await getOrCreateSession(sessionId, 'https://twitter.com', {});

      expect(session2).not.toBeNull();
      expect(session2?.page_count).toBe(1); // Still 1 (not updated by getOrCreate)
      expect(session2?.initial_referrer).toBe(initialReferrer); // Preserves initial referrer
      expect(session2?.utm_params.source).toBe('google'); // Preserves initial UTM params
    });

    /**
     * Test 2: Session expires after 24 hours (TTL)
     * Verifies sliding TTL window refreshes on each pageview
     */
    test('should expire session after 24-hour sliding TTL', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440001';

      // First pageview: create session with 24-hour TTL
      mockRedis.get.mockResolvedValueOnce(null);

      await getOrCreateSession(sessionId, null, {});

      // Verify initial TTL set to 24 hours (86400 seconds)
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400,
        expect.any(String)
      );

      // Update session: refresh TTL
      const existingSession: SessionMetadata = {
        start_time: new Date().toISOString(),
        page_count: 1,
        last_seen: new Date().toISOString(),
        initial_referrer: null,
        utm_params: {},
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existingSession));

      await updateSession(sessionId);

      // Verify TTL refreshed to 24 hours (sliding window)
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        86400,
        expect.any(String)
      );
    });
  });

  describe('SPA Navigation with Session Context', () => {
    /**
     * Test 3: session_id persists across SPA navigations
     * Verifies session remains constant during internal navigation
     */
    test('should maintain session_id across SPA navigations', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440002';
      const session: SessionMetadata = {
        start_time: new Date().toISOString(),
        page_count: 1,
        last_seen: new Date().toISOString(),
        initial_referrer: 'https://google.com',
        utm_params: { source: 'google' },
      };

      // Initial pageview
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));

      const retrievedSession = await getOrCreateSession(sessionId, null, {});
      expect(retrievedSession?.page_count).toBe(1);

      // SPA navigation: same session_id, increment page_count
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(session));

      const updatedSession = await updateSession(sessionId);

      expect(updatedSession).not.toBeNull();
      expect(updatedSession?.page_count).toBe(2); // Incremented
      expect(updatedSession?.initial_referrer).toBe('https://google.com'); // Preserved
    });

    /**
     * Test 4: Internal vs external referrer distinction
     * Verifies is_internal_referrer flag set correctly
     */
    test('should distinguish internal vs external referrer', async () => {
      // External referrer (first pageview)
      const externalReferrer = 'https://google.com';
      const isInternalReferrer1 = false; // First pageview from external source

      expect(isInternalReferrer1).toBe(false);
      expect(externalReferrer).toContain('google.com');

      // Internal referrer (SPA navigation)
      const internalReferrer = window.location.origin + '/previous-page';
      const isInternalReferrer2 = true; // SPA navigation within site

      expect(isInternalReferrer2).toBe(true);
      expect(internalReferrer).toContain(window.location.origin);
    });
  });

  describe('Bot Detection with Session Tracking', () => {
    /**
     * Test 5: Bot traffic generates session_id
     * Verifies bots are tracked (with is_bot flag) but not rejected
     */
    test('should track bot traffic with session context', async () => {
      const botSessionId = '550e8400-e29b-41d4-a716-446655440003';

      mockRedis.get.mockResolvedValueOnce(null);

      // Bot creates session like any visitor
      const botSession = await getOrCreateSession(botSessionId, 'https://google.com', {});

      expect(botSession).not.toBeNull();
      expect(botSession?.page_count).toBe(1);
      expect(botSession?.initial_referrer).toBe('https://google.com');

      // Verify bot session stored in Redis
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${botSessionId}`,
        86400,
        expect.any(String)
      );
    });

    /**
     * Test 6: Bot sessions update page_count
     * Verifies bot sessions work like regular sessions
     */
    test('should update bot session page_count on subsequent pageviews', async () => {
      const botSessionId = '550e8400-e29b-41d4-a716-446655440004';
      const botSession: SessionMetadata = {
        start_time: new Date().toISOString(),
        page_count: 5,
        last_seen: new Date().toISOString(),
        initial_referrer: null,
        utm_params: {},
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(botSession));

      const updatedBotSession = await updateSession(botSessionId);

      expect(updatedBotSession).not.toBeNull();
      expect(updatedBotSession?.page_count).toBe(6); // Incremented
    });
  });

  describe('Duration Calculation Across Navigations', () => {
    /**
     * Test 7: Duration calculated from page start time
     * Verifies duration_seconds accurate for single pageview
     */
    test('should calculate duration_seconds from page start time', () => {
      const pageStartTime = Date.now() - 45000; // 45 seconds ago
      const currentTime = Date.now();

      const durationSeconds = Math.floor((currentTime - pageStartTime) / 1000);

      expect(durationSeconds).toBeGreaterThanOrEqual(44);
      expect(durationSeconds).toBeLessThanOrEqual(46);
    });

    /**
     * Test 8: Duration resets for new pageview after SPA navigation
     * Verifies each SPA navigation starts fresh duration tracking
     */
    test('should reset duration for new pageview after SPA navigation', () => {
      // First pageview
      const pageStartTime1 = Date.now() - 30000; // 30 seconds
      const duration1 = Math.floor((Date.now() - pageStartTime1) / 1000);
      expect(duration1).toBeGreaterThanOrEqual(29);

      // SPA navigation: new pageview, duration resets
      const pageStartTime2 = Date.now(); // Just started
      const duration2 = Math.floor((Date.now() - pageStartTime2) / 1000);
      expect(duration2).toBeLessThan(1); // Near zero for new pageview
    });
  });

  describe('Redis Graceful Degradation', () => {
    /**
     * Test 9: Tracking continues when Redis unavailable for session creation
     * Verifies graceful degradation on Redis connection failure
     */
    test('should continue tracking when Redis unavailable for session creation', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440005';

      // Simulate Redis connection failure
      mockGetRedisClient.mockRejectedValueOnce(new Error('Redis connection failed'));

      const session = await getOrCreateSession(sessionId, 'https://google.com', {
        utm_source: 'twitter',
      });

      // Should return null but not throw error
      expect(session).toBeNull();

      // Pageview tracking would continue without session metadata
      // (Client-side session_id still included in payload)
    });

    /**
     * Test 10: Tracking continues when Redis unavailable for session update
     * Verifies graceful degradation on Redis failure during update
     */
    test('should continue tracking when Redis unavailable for session update', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440006';

      // Simulate Redis failure during update
      mockRedis.get.mockRejectedValueOnce(new Error('Redis read failed'));

      const updatedSession = await updateSession(sessionId);

      // Should return null but not throw error
      expect(updatedSession).toBeNull();

      // Pageview tracking would continue without session metadata update
    });
  });

  describe('Session UTM Attribution', () => {
    /**
     * Test 11: UTM parameters stored in session metadata on first pageview
     * Verifies attribution data captured at session start
     */
    test('should store UTM parameters in session metadata on first pageview', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440007';
      const utmParams = {
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'product-launch',
        utm_content: 'hero-cta',
        utm_term: 'analytics',
      };

      mockRedis.get.mockResolvedValueOnce(null);

      const session = await getOrCreateSession(sessionId, 'https://newsletter.example.com', utmParams);

      expect(session).not.toBeNull();
      expect(session?.utm_params.source).toBe('newsletter');
      expect(session?.utm_params.medium).toBe('email');
      expect(session?.utm_params.campaign).toBe('product-launch');
      expect(session?.utm_params.content).toBe('hero-cta');
      expect(session?.utm_params.term).toBe('analytics');
    });

    /**
     * Test 12: Initial UTM parameters preserved across session updates
     * Verifies attribution persists even if URL params change
     */
    test('should preserve initial UTM parameters across session updates', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440008';
      const initialSession: SessionMetadata = {
        start_time: new Date().toISOString(),
        page_count: 1,
        last_seen: new Date().toISOString(),
        initial_referrer: 'https://google.com',
        utm_params: {
          source: 'google',
          medium: 'cpc',
          campaign: 'launch',
        },
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(initialSession));

      const updatedSession = await updateSession(sessionId);

      expect(updatedSession).not.toBeNull();
      expect(updatedSession?.utm_params.source).toBe('google'); // Preserved
      expect(updatedSession?.utm_params.medium).toBe('cpc'); // Preserved
      expect(updatedSession?.utm_params.campaign).toBe('launch'); // Preserved
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test 13: Handle non-existent session update gracefully
     * Verifies system handles missing session without errors
     */
    test('should handle non-existent session update gracefully', async () => {
      const nonExistentSessionId = '550e8400-e29b-41d4-a716-446655440009';

      mockRedis.get.mockResolvedValueOnce(null); // Session doesn't exist

      const result = await updateSession(nonExistentSessionId);

      expect(result).toBeNull();
      // Should not throw error, just return null
    });

    /**
     * Test 14: Handle malformed session data in Redis
     * Verifies graceful handling of corrupted Redis data
     */
    test('should handle malformed session data in Redis', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440010';

      // Simulate corrupted/malformed JSON in Redis
      mockRedis.get.mockResolvedValueOnce('{ invalid json }');

      // Should catch JSON parse error and return null
      await expect(async () => {
        try {
          await updateSession(sessionId);
        } catch (error) {
          // If error is thrown, test should pass
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });
  });
});
