/**
 * Websites API Endpoint
 * GET: Retrieve user's websites
 */

import { NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { getWebsitesByUserId } from 'lib/db/websites';

/**
 * GET /api/websites
 * Retrieve all websites for authenticated user
 *
 * Returns:
 * - 200: Success with websites array
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get websites for user
    const websites = await getWebsitesByUserId(session.user.id);

    return NextResponse.json(websites);
  } catch (error) {
    console.error('Failed to get websites:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve websites' },
      { status: 500 }
    );
  }
}
