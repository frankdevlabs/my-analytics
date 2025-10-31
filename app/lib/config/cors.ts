/**
 * CORS and CSP Configuration for Metrics Endpoints
 * Manages Cross-Origin Resource Sharing and Content Security Policy headers
 *
 * Features:
 * - Auto-detects development vs production environment
 * - In development: allows all localhost origins
 * - In production: validates against ALLOWED_ORIGINS environment variable
 * - Supports multiple production origins (comma-separated)
 * - Secure: no wildcards, explicit origin validation
 * - CSP headers for defense-in-depth security
 * - Supports both GET and POST methods for metrics endpoints
 */

import { NextRequest } from 'next/server';

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get allowed origins from environment variable
 * Supports comma-separated list of origins
 * @returns Array of allowed origin URLs
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins) {
    // Default to franksblog.nl if not configured
    return ['https://franksblog.nl'];
  }

  // Split by comma and trim whitespace
  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Check if an origin is a localhost origin (development)
 * Matches: http://localhost:*, http://127.0.0.1:*
 */
function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/**
 * Determine if an origin is allowed
 * - In development: allows all localhost origins
 * - In production: validates against ALLOWED_ORIGINS
 */
function isOriginAllowed(origin: string): boolean {
  // In development, allow all localhost origins
  if (isDevelopment() && isLocalhostOrigin(origin)) {
    return true;
  }

  // In production (or non-localhost in dev), check against allowed list
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Get CORS and CSP headers based on request origin
 * Returns appropriate Access-Control-Allow-Origin and Content-Security-Policy headers
 *
 * Supports /api/metrics/* endpoints with both GET and POST methods
 *
 * @param request - NextRequest object containing headers
 * @returns Combined CORS and CSP headers object
 */
export function getCorsHeaders(
  request: NextRequest
): Record<string, string> {
  const origin = request.headers.get('origin');

  // Base headers that always include CSP and credentials support
  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Content-Security-Policy': "default-src 'self'",
  };

  // If no origin header (same-origin request), return base headers
  if (!origin) {
    return baseHeaders;
  }

  // Check if origin is allowed
  if (isOriginAllowed(origin)) {
    return {
      ...baseHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }

  // Origin not allowed - return headers without Allow-Origin
  // This will cause the browser to reject the request
  // CSP header still included for defense-in-depth
  return baseHeaders;
}

/**
 * Get CORS and CSP headers for OPTIONS preflight requests
 * Uses same logic as getCorsHeaders but optimized for preflight
 */
export function getPreflightCorsHeaders(
  request: NextRequest
): Record<string, string> {
  return getCorsHeaders(request);
}
