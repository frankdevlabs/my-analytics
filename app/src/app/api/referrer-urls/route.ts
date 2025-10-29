/**
 * Referrer URLs API Route
 *
 * GET endpoint that fetches referrer URLs by domain with configurable limit.
 * Used by ReferrerSourcesSection for drill-down modal functionality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReferrerUrlsByDomain } from '@/lib/db/pageviews';

/**
 * GET /api/referrer-urls
 *
 * Query params:
 * - domain: Referrer domain to fetch URLs for (required)
 * - from: Start date (YYYY-MM-DD or ISO 8601)
 * - to: End date (YYYY-MM-DD or ISO 8601)
 * - limit: Number of URLs to return (default: 100, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Get search params from URL
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const domain = searchParams.get('domain');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    // Validate required parameters
    if (domain === null) {
      return NextResponse.json(
        { error: 'Missing required parameter: domain' },
        { status: 400 }
      );
    }

    // Validate domain is non-empty
    if (domain.trim() === '') {
      return NextResponse.json(
        { error: 'Domain parameter cannot be empty' },
        { status: 400 }
      );
    }

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const startDate = new Date(from);
    const endDate = new Date(to);
    // Set end date to end of day (23:59:59.999 UTC) to include all data for that day
    endDate.setUTCHours(23, 59, 59, 999);

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
    let limit = 100; // Default limit
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

    // Fetch referrer URLs data
    const data = await getReferrerUrlsByDomain(domain, startDate, endDate, limit);

    return NextResponse.json({
      data,
      meta: {
        count: data.length,
        limit,
        domain,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching referrer URLs:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
