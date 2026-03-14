/**
 * Email Delivery Log API Endpoint
 * GET: Retrieve paginated email delivery history
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { getRecentLogs } from 'lib/db/email-logs';

/**
 * GET /api/settings/email/delivery-log
 * Retrieve paginated email delivery logs for authenticated user
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 *
 * Returns:
 * {
 *   logs: EmailDeliveryLog[],
 *   total: number,
 *   page: number,
 *   limit: number
 * }
 *
 * Returns:
 * - 200: Success with paginated logs
 * - 400: Invalid query parameters
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
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Validate and parse page
    let page = 1;
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return NextResponse.json(
          { error: 'Invalid page parameter. Must be a positive integer.' },
          { status: 400 }
        );
      }
      page = parsedPage;
    }

    // Validate and parse limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be between 1 and 100.' },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    // Get paginated logs
    const result = await getRecentLogs(session.user.id, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get delivery logs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve delivery logs' },
      { status: 500 }
    );
  }
}
