/**
 * Analytics Metrics API Endpoint
 * POST /api/metrics - Records pageview events with privacy-first approach
 * GET /api/metrics - Image beacon fallback with btoa-encoded query parameter
 *
 * Features:
 * - Comprehensive 36-field pageview tracking
 * - Session tracking with Redis-backed metadata storage
 * - Zod schema validation for all payload fields
 * - Server-side User-Agent parsing for browser/OS extraction
 * - Browser major version extraction for cleaner analytics
 * - Bot detection using isbot library
 * - GeoIP lookup for country code extraction
 * - Redis-based unique visitor detection with daily rotation
 * - Redis-based active visitor tracking (5-minute window)
 * - Privacy-first: never stores raw IPs, only hashed for deduplication
 * - Graceful fallback: service failures don't reject tracking requests
 * - GET method: btoa-decoded image beacon with 1x1 transparent GIF response
 * - Silent failure for malformed GET data (returns pixel anyway)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isbot } from 'isbot';
import { PageviewPayloadSchema } from 'lib/validation/pageview-schema';
import { parseUserAgent } from 'lib/parsing/user-agent-parser';
import { extractMajorVersion } from 'lib/parsing/extract-major-version';
import { lookupCountryCode } from 'lib/geoip/maxmind-reader';
import { generateVisitorHash } from 'lib/privacy/visitor-hash';
import { checkAndRecordVisitor } from 'lib/privacy/visitor-tracking';
import { getOrCreateSession, updateSession } from 'lib/session/session-storage';
import { recordVisitorActivity } from 'lib/active-visitors/active-visitor-tracking';
import { prisma } from 'lib/db/prisma';
import { getCorsHeaders } from 'lib/config/cors';
import { extractDomainFromUrl, getCategoryFromDomain } from 'lib/config/referrer-categories';

/**
 * 1x1 transparent GIF pixel (43 bytes)
 * Base64-encoded GIF89a format
 */
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

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
 * Process pageview payload and record to database
 * Shared logic between POST and GET handlers
 */
async function processPageview(payload: any, request: NextRequest): Promise<void> {
  // Extract IP address from request headers
  const ip = extractIpAddress(request);

  // Parse ISO date for visitor hash and database
  const addedDate = new Date(payload.added_iso);

  // Parse User-Agent for browser and OS information
  const parsedUA = parseUserAgent(payload.user_agent);

  // Extract major version from parsed browser version for cleaner analytics display
  // Gracefully handles null values (returns null if browser_version is null)
  const browserMajorVersion = extractMajorVersion(parsedUA.browser_version);

  // Bot detection using isbot library
  const isBotDetected = isbot(payload.user_agent);

  // Generate visitor hash for unique visitor detection
  // SHA256(IP + UserAgent + YYYY-MM-DD)
  let visitorHash: string;
  try {
    visitorHash = generateVisitorHash(ip, payload.user_agent, addedDate);
  } catch (error) {
    console.error('Error generating visitor hash:', error);
    throw new Error('Unable to process request');
  }

  // Check if visitor is unique (Redis-based)
  // Gracefully handles Redis failures by returning false
  const isUnique = await checkAndRecordVisitor(visitorHash);

  // Perform GeoIP lookup to extract country code
  // Returns null on failure (graceful degradation)
  const countryCode = await lookupCountryCode(ip);
  if (!countryCode) {
    console.warn(`GeoIP lookup returned null for IP: ${ip}`);
  }

  // Session tracking: Get or create session metadata in Redis
  // Gracefully degrades on Redis failure (returns null, tracking continues)
  if (payload.session_id) {
    // Check if session exists
    const existingSession = await getOrCreateSession(
      payload.session_id,
      payload.document_referrer || null,
      {
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
        utm_term: payload.utm_term,
      }
    );

    // If session exists, update it (increment page_count, refresh TTL)
    if (existingSession && existingSession.page_count > 1) {
      await updateSession(payload.session_id);
    }
  }

  // Extract referrer domain and category for analytics
  // Pass the site's hostname to detect internal referrers (franksblog.nl → franksblog.nl)
  const referrerDomain = extractDomainFromUrl(payload.document_referrer || null);
  const referrerCategory = getCategoryFromDomain(referrerDomain, payload.hostname);

  // Raw IP is now discarded after hashing and GeoIP lookup
  // Never stored in database to maintain privacy

  // Insert pageview with all 36 fields using Prisma
  // Follow existing retry logic pattern with exponential backoff
  await prisma.$transaction(
    async (tx) => {
      await tx.pageview.create({
        data: {
          // Identity & Timing (4 fields - created_at auto-generated)
          page_id: payload.page_id,
          added_iso: addedDate,
          session_id: payload.session_id || null,

          // Page Context (6 fields)
          hostname: payload.hostname || null,
          path: payload.path.replace(/\0/g, ''), // Remove null bytes
          hash: payload.hash || null,
          query_string: payload.query_string || null,
          document_title: payload.document_title || null,
          document_referrer: payload.document_referrer || null,

          // Referrer Analytics (2 fields)
          referrer_domain: referrerDomain,
          referrer_category: referrerCategory,

          // Visitor Classification (3 fields)
          is_unique: isUnique,
          is_bot: isBotDetected,
          is_internal_referrer: payload.is_internal_referrer,

          // Device & Browser (10 fields - added browser_major_version)
          device_type: payload.device_type,
          browser_name: parsedUA.browser_name,
          browser_version: parsedUA.browser_version,
          browser_major_version: browserMajorVersion,
          os_name: parsedUA.os_name,
          os_version: parsedUA.os_version,
          viewport_width: payload.viewport_width || null,
          viewport_height: payload.viewport_height || null,
          screen_width: payload.screen_width || null,
          screen_height: payload.screen_height || null,

          // Locale & Environment (3 fields)
          language: payload.language || null,
          timezone: payload.timezone || null,
          user_agent: payload.user_agent,

          // Geographic (1 field from server-side lookup)
          country_code: countryCode,

          // Marketing Attribution (5 fields)
          utm_source: payload.utm_source || null,
          utm_medium: payload.utm_medium || null,
          utm_campaign: payload.utm_campaign || null,
          utm_content: payload.utm_content || null,
          utm_term: payload.utm_term || null,

          // Engagement Metrics (4 fields)
          duration_seconds: payload.duration_seconds,
          time_on_page_seconds: payload.time_on_page_seconds || null,
          scrolled_percentage: payload.scrolled_percentage || null,
          visibility_changes: payload.visibility_changes,
        },
      });
    },
    {
      maxWait: 10000, // 10 seconds max wait
      timeout: 10000, // 10 seconds timeout
    }
  );

  // After successful pageview storage, record visitor activity in Redis
  // This tracks active visitors for real-time counter
  // Gracefully degrades if Redis fails - doesn't affect pageview tracking
  try {
    await recordVisitorActivity(visitorHash);
  } catch (error) {
    // Log Redis error but don't fail the request
    console.error('Failed to record visitor activity in Redis (non-critical):', error);
  }
}

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
 * Handle POST requests to record pageview with all 36 fields
 */
export async function POST(request: NextRequest) {
  // Get CORS headers based on request origin
  const corsHeaders = getCorsHeaders(request);

  try {
    // Parse request body
    const body = await request.json();

    // Validate payload with Zod schema (36 fields)
    const validationResult = PageviewPayloadSchema.safeParse(body);

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
      await processPageview(payload, request);
    } catch (error) {
      console.error('Database error creating pageview:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Failed to record pageview',
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
    console.error('Tracking endpoint error:', error);

    // Return 500 for unexpected errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to record pageview',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

/**
 * Handle GET requests for image beacon with btoa-encoded data
 * Accepts ?data=BASE64_ENCODED_JSON parameter
 * Returns 1x1 transparent GIF pixel with silent failure on errors
 */
export async function GET(request: NextRequest) {
  // Get CORS headers based on request origin
  const corsHeaders = getCorsHeaders(request);

  // Prepare pixel response headers
  const pixelHeaders = {
    ...corsHeaders,
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    // Extract data parameter from URL
    const { searchParams } = new URL(request.url);
    const encodedData = searchParams.get('data');

    if (!encodedData) {
      // No data parameter - return pixel (silent failure)
      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: pixelHeaders,
      });
    }

    // Decode btoa-encoded data
    let decodedData: string;
    try {
      decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
    } catch (error) {
      // Base64 decode failed - return pixel (silent failure)
      console.error('Failed to decode base64 data:', error);
      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: pixelHeaders,
      });
    }

    // Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(decodedData);
    } catch (error) {
      // JSON parse failed - return pixel (silent failure)
      console.error('Failed to parse JSON from decoded data:', error);
      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: pixelHeaders,
      });
    }

    // Validate payload with Zod schema
    const validationResult = PageviewPayloadSchema.safeParse(payload);

    if (!validationResult.success) {
      // Validation failed - return pixel anyway (silent failure)
      console.error('Validation failed for GET data:', validationResult.error);
      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: pixelHeaders,
      });
    }

    const validatedPayload = validationResult.data;

    try {
      // Process pageview (shared logic with POST handler)
      await processPageview(validatedPayload, request);
    } catch (error) {
      // Processing failed - return pixel anyway (silent failure)
      console.error('Failed to process pageview from GET request:', error);
      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: pixelHeaders,
      });
    }

    // Return pixel on success
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: pixelHeaders,
    });
  } catch (error) {
    // Unexpected error - return pixel (silent failure)
    console.error('GET endpoint error:', error);
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: pixelHeaders,
    });
  }
}
