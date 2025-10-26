/**
 * Top Pages API Route
 *
 * GET endpoint that fetches top pages data with configurable limit.
 * Used by TopPagesPerformanceTable for "Show More" functionality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTopPages } from 'lib/db/pageviews';

/**
 * GET /api/top-pages
 *
 * Query params:
 * - from: Start date (YYYY-MM-DD or ISO 8601)
 * - to: End date (YYYY-MM-DD or ISO 8601)
 * - limit: Number of pages to return (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    // Validate required parameters
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const startDate = new Date(from);
    const endDate = new Date(to);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 format.' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    // Parse and validate limit
    let limit = 50; // Default limit for expanded view
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: 'Limit must be a positive integer' },
          { status: 400 }
        );
      }
      // Cap limit at 100 to prevent excessive data fetching
      limit = Math.min(parsedLimit, 100);
    }

    // Fetch top pages data
    const data = await getTopPages(startDate, endDate, limit);

    return NextResponse.json({
      data,
      meta: {
        count: data.length,
        limit,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching top pages:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
