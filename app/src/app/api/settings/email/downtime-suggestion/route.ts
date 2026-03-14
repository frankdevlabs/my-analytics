/**
 * Downtime Suggestion API Endpoint
 * GET: Calculate and suggest whether to enable downtime alerts based on 7-day traffic average
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { getAveragePageviewsPerDay } from 'lib/db/pageviews';

/**
 * Suggestion result
 */
interface DowntimeSuggestion {
  averagePageviewsPerDay: number;
  suggestion: 'enable' | 'disable' | null;
  reason: string;
}

/**
 * GET /api/settings/email/downtime-suggestion
 * Calculate downtime alert suggestion based on 7-day average traffic
 *
 * Query params:
 * - websiteId: string (required) - Website ID to analyze
 *
 * Returns:
 * {
 *   averagePageviewsPerDay: number,
 *   suggestion: "enable" | "disable" | null,
 *   reason: string
 * }
 *
 * Logic:
 * - avg > 100/day: suggest "enable" (consistent traffic)
 * - avg <= 100/day: suggest "disable" (low traffic, may cause false positives)
 * - < 1 day data: return null (insufficient data)
 *
 * Returns:
 * - 200: Success with suggestion
 * - 400: Missing or invalid query parameters
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const websiteId = searchParams.get('websiteId');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'websiteId query parameter is required' },
        { status: 400 }
      );
    }

    // Calculate 7-day average
    const averagePageviewsPerDay = await getAveragePageviewsPerDay(websiteId, 7);

    // Determine suggestion
    let suggestion: 'enable' | 'disable' | null;
    let reason: string;

    if (averagePageviewsPerDay === 0) {
      // No pageviews in 7 days
      suggestion = null;
      reason = 'Insufficient data. Site has no pageviews in the last 7 days.';
    } else if (averagePageviewsPerDay > 100) {
      // High traffic - suggest enable
      suggestion = 'enable';
      reason = `Your site averages ${Math.round(averagePageviewsPerDay)} pageviews/day. Downtime alerts are recommended for sites with consistent traffic.`;
    } else {
      // Low traffic - suggest disable
      suggestion = 'disable';
      reason = `Your site averages ${Math.round(averagePageviewsPerDay)} pageviews/day. Low traffic may cause false positive downtime alerts.`;
    }

    const result: DowntimeSuggestion = {
      averagePageviewsPerDay,
      suggestion,
      reason,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to calculate downtime suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to calculate downtime suggestion' },
      { status: 500 }
    );
  }
}
