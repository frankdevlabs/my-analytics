/**
 * Analytics Append API Endpoint
 * POST /api/metrics/append - Updates existing pageview with duration and scroll data
 *
 * Features:
 * - Updates duration_seconds and scrolled_percentage for existing pageviews
 * - Validates payload with Zod schema (AppendPayloadSchema)
 * - Finds pageview by page_id and updates engagement metrics
 * - Returns 404 if page_id not found
 * - Privacy-first: only updates data, no new collection
 * - Graceful error handling for database failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppendPayloadSchema } from 'lib/validation/append-schema';
import { prisma } from 'lib/db/prisma';
import { getCorsHeaders } from 'lib/config/cors';

/**
 * Handle OPTIONS preflight requests for CORS
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Handle POST requests to update pageview engagement metrics
 * Updates duration_seconds, scrolled_percentage, and time_on_page_seconds
 */
export async function POST(request: NextRequest) {
  // Get CORS headers based on request origin
  const corsHeaders = getCorsHeaders(request);

  try {
    // Parse request body
    const body = await request.json();

    // Validate payload with Zod schema
    const validationResult = AppendPayloadSchema.safeParse(body);

    if (!validationResult.success) {
      // Return 400 with detailed validation errors
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const payload = validationResult.data;

    try {
      // Update existing pageview by page_id
      // Follow existing retry logic pattern with exponential backoff
      await prisma.$transaction(
        async (tx) => {
          // Check if pageview exists
          const existingPageview = await tx.pageview.findUnique({
            where: { page_id: payload.page_id },
            select: { id: true },
          });

          if (!existingPageview) {
            // Throw error to be caught and returned as 404
            throw new Error('PAGEVIEW_NOT_FOUND');
          }

          // Update pageview with engagement metrics
          await tx.pageview.update({
            where: { page_id: payload.page_id },
            data: {
              duration_seconds: payload.duration_seconds,
              scrolled_percentage: payload.scrolled_percentage ?? null,
              // Calculate time_on_page_seconds (same as duration for now)
              time_on_page_seconds: payload.duration_seconds,
            },
          });
        },
        {
          maxWait: 10000, // 10 seconds max wait
          timeout: 10000, // 10 seconds timeout
        }
      );
    } catch (error) {
      // Handle 404 case for non-existent page_id
      if (error instanceof Error && error.message === 'PAGEVIEW_NOT_FOUND') {
        return NextResponse.json(
          {
            error: 'Not found',
            message: 'Pageview with provided page_id does not exist',
          },
          {
            status: 404,
            headers: corsHeaders,
          }
        );
      }

      // Log database error
      console.error('Database error updating pageview:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Failed to update pageview',
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // Return 204 No Content on success
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  } catch (error) {
    // Log error for debugging
    console.error('Append endpoint error:', error);

    // Return 500 for unexpected errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to update pageview',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
