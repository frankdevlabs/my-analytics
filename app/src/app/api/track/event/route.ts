/**
 * Custom Event Tracking API Endpoint
 * POST /api/track/event - Records custom events with metadata
 *
 * Features:
 * - Flexible event tracking with JSONB metadata storage
 * - Event metadata size validation (5KB limit)
 * - Zod schema validation for payload
 * - GeoIP lookup for country code extraction
 * - Privacy-first: never stores raw IPs, only used for country lookup
 * - Links events to pageviews via optional page_id
 * - Supports session-level event tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { EventPayloadSchema } from 'lib/validation/event-schema';
import { lookupCountryCode } from 'lib/geoip/maxmind-reader';
import { prisma } from 'lib/db/prisma';

/**
 * Extract IP address from request headers
 * Supports x-forwarded-for and x-real-ip headers for proxy/CDN scenarios
 */
function extractIpAddress(request: NextRequest): string {
  // Check x-forwarded-for header (may contain multiple IPs)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP from comma-separated list
    return forwardedFor.split(',')[0].trim();
  }

  // Check x-real-ip header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to localhost (development)
  return '127.0.0.1';
}

/**
 * CORS headers for tracking endpoint
 * Only allows requests from franksblog.nl origin
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://franksblog.nl',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle OPTIONS preflight requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Handle POST requests to record custom events
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate payload with Zod schema
    const validationResult = EventPayloadSchema.safeParse(body);

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
          headers: CORS_HEADERS,
        }
      );
    }

    const payload = validationResult.data;

    // Extract IP address from request headers
    const ip = extractIpAddress(request);

    // Perform GeoIP lookup to extract country code
    // Returns null on failure (graceful degradation)
    const countryCode = await lookupCountryCode(ip);
    if (!countryCode) {
      console.warn(`GeoIP lookup returned null for IP: ${ip}`);
    }

    // Raw IP is now discarded after GeoIP lookup
    // Never stored in database to maintain privacy

    // Parse ISO timestamp
    const timestamp = new Date(payload.timestamp);

    try {
      // Insert event with all fields using Prisma
      // Follow existing retry logic pattern with exponential backoff
      await prisma.$transaction(
        async (tx) => {
          await tx.event.create({
            data: {
              // Event identification
              event_name: payload.event_name,
              event_metadata: payload.event_metadata ? (payload.event_metadata as Prisma.InputJsonValue) : Prisma.JsonNull,

              // Context linking
              page_id: payload.page_id || null,
              session_id: payload.session_id,

              // Location & timing
              path: payload.path,
              timestamp: timestamp,
              country_code: countryCode,
            },
          });
        },
        {
          maxWait: 10000, // 10 seconds max wait
          timeout: 10000, // 10 seconds timeout
        }
      );
    } catch (error) {
      console.error('Database error creating event:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Failed to record event',
        },
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }

    // Return 204 No Content on success
    return new NextResponse(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    // Log error for debugging
    console.error('Event tracking endpoint error:', error);

    // Return 500 for unexpected errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to record event',
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
