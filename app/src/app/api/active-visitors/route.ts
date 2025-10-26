/**
 * Active Visitors API Endpoint
 * GET /api/active-visitors - Returns count of active visitors (within last 5 minutes)
 *
 * Features:
 * - Redis-based real-time active visitor tracking
 * - Returns count of visitors active within last 5 minutes (300 seconds)
 * - Graceful degradation: returns null count when Redis unavailable
 * - Automatic cleanup of expired entries
 * - Single-site application (tracks franksblog.nl only)
 */

import { NextResponse } from 'next/server';
import { getActiveVisitorCount } from '@/lib/active-visitors/active-visitor-tracking';

/**
 * GET /api/active-visitors
 *
 * Returns the count of active visitors (within last 5 minutes)
 *
 * Query parameters: None (single-site application)
 *
 * Response format:
 * - Success: { "count": 5 }
 * - Redis unavailable: { "count": null }
 * - Server error: { "error": "message" }
 *
 * Status codes:
 * - 200: Success (includes successful error state with count: null)
 * - 500: Unexpected server error
 */
export async function GET() {
  try {
    // Get active visitor count from Redis
    // Returns null if Redis unavailable (graceful degradation)
    const count = await getActiveVisitorCount();

    // Return 200 with count (or null if Redis failed)
    return NextResponse.json(
      { count },
      { status: 200 }
    );
  } catch (error) {
    // Log unexpected errors
    console.error('Unexpected error in /api/active-visitors:', error);

    // Return 500 for unexpected errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve active visitor count',
      },
      { status: 500 }
    );
  }
}
