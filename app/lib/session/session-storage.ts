import { getRedisClient } from '../redis';

/**
 * Session metadata structure stored in Redis
 * Tracks visitor session information for analytics
 */
export interface SessionMetadata {
  start_time: string; // ISO 8601 timestamp
  page_count: number;
  last_seen: string; // ISO 8601 timestamp
  initial_referrer: string | null;
  utm_params: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

/**
 * UTM parameters extracted from URL
 */
export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

/**
 * Get existing session metadata or create new session in Redis
 * Implements 24-hour sliding TTL for session expiration
 *
 * @param sessionId - Client-generated session UUID
 * @param referrer - Initial referrer URL (only used for new sessions)
 * @param utmParams - UTM parameters from URL (only used for new sessions)
 * @returns SessionMetadata object or null on Redis failure (graceful degradation)
 */
export async function getOrCreateSession(
  sessionId: string,
  referrer: string | null,
  utmParams: UtmParams
): Promise<SessionMetadata | null> {
  try {
    const redis = await getRedisClient();
    const key = `session:${sessionId}`;

    // Check if session exists
    const existingSession = await redis.get(key);

    if (existingSession) {
      // Parse existing session
      const session: SessionMetadata = JSON.parse(existingSession);
      return session;
    }

    // Create new session
    const now = new Date().toISOString();
    const newSession: SessionMetadata = {
      start_time: now,
      page_count: 1,
      last_seen: now,
      initial_referrer: referrer,
      utm_params: {
        source: utmParams.utm_source,
        medium: utmParams.utm_medium,
        campaign: utmParams.utm_campaign,
        content: utmParams.utm_content,
        term: utmParams.utm_term,
      },
    };

    // Store session with 24-hour TTL
    await redis.setEx(key, 86400, JSON.stringify(newSession));

    return newSession;
  } catch (error) {
    console.error('Redis error in getOrCreateSession:', error);
    // Graceful degradation: return null, allow tracking to continue
    return null;
  }
}

/**
 * Update existing session metadata (increment page_count, refresh last_seen, refresh TTL)
 * Implements sliding window: TTL resets to 24 hours on each pageview
 *
 * @param sessionId - Client-generated session UUID
 * @returns Updated SessionMetadata or null on Redis failure (graceful degradation)
 */
export async function updateSession(
  sessionId: string
): Promise<SessionMetadata | null> {
  try {
    const redis = await getRedisClient();
    const key = `session:${sessionId}`;

    // Get existing session
    const existingSession = await redis.get(key);

    if (!existingSession) {
      console.warn(`Session not found for update: ${sessionId}`);
      return null;
    }

    // Parse and update session
    const session: SessionMetadata = JSON.parse(existingSession);
    session.page_count += 1;
    session.last_seen = new Date().toISOString();

    // Store updated session with refreshed 24-hour TTL (sliding window)
    await redis.setEx(key, 86400, JSON.stringify(session));

    return session;
  } catch (error) {
    console.error('Redis error in updateSession:', error);
    // Graceful degradation: return null, allow tracking to continue
    return null;
  }
}
