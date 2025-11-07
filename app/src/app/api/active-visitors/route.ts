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
import { auth } from '@/lib/auth/config';

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
 * - 401: Not authenticated or MFA not verified
 * - 500: Unexpected server error
 *
 * Requires authentication and MFA verification
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if MFA is enabled
    if (!session.user.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 401 }
      );
    }

    // Check if MFA is verified in this session
    if (!session.user.mfaVerified) {
      return NextResponse.json(
        { error: 'MFA verification required' },
        { status: 401 }
      );
    }

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
