/**
 * Next.js 16 Proxy for Route Protection and Tracker.js Serving
 *
 * This proxy implements:
 * 1. Tracker.js serving logic (preserved from original implementation)
 * 2. Route-based authentication checks using NextAuth.js JWT tokens
 * 3. MFA (Multi-Factor Authentication) enforcement
 * 4. Automatic redirect to login for unauthenticated users
 * 5. Automatic redirect to MFA verification for unverified users
 *
 * Security Model: Opt-out (all routes protected by default, except explicitly public routes)
 *
 * Note: In Next.js 16, middleware.ts has been renamed to proxy.ts
 * and the export function must be named 'proxy' instead of 'middleware'
 */

import { NextResponse } from 'next/server';
import { auth } from '../lib/auth/config';

/**
 * Proxy function - runs on every request matching the config matcher
 * Uses NextAuth v5 auth wrapper for proper session handling
 */
export const proxy = auth(async function middleware(request) {
  const { pathname } = request.nextUrl;

  // CRITICAL: Preserve tracker.js serving logic FIRST (before any auth checks)
  // This ensures analytics tracking works without authentication
  if (pathname === '/tracker.js') {
    const environment = process.env.NODE_ENV;
    const trackerFile = environment === 'production' ? '/tracker.min.js' : '/tracker.js';

    // Rewrite request to serve the appropriate tracker file from public directory
    return NextResponse.rewrite(new URL(trackerFile, request.url));
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/api/track', '/api/metrics', '/tracker.min.js', '/fb-a7k2.js'];

  // Define MFA routes that should be accessible during MFA setup/verification
  const mfaRoutes = ['/mfa/setup', '/mfa/verify'];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an MFA route
  const isMfaRoute = mfaRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is a NextAuth.js route
  const isAuthRoute = pathname.startsWith('/api/auth');

  // Skip authentication check for public routes and NextAuth routes
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next();
  }

  // For all other routes, check authentication status
  // request.auth is populated by NextAuth's auth() wrapper
  if (!request.auth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);

    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated - now check MFA status
  const { mfaEnabled, mfaVerified } = request.auth.user;

  // SECURITY GATE 1: Force MFA setup for users who haven't set it up yet
  // This prevents users from accessing the dashboard without MFA configured
  if (!mfaEnabled) {
    // Allow access to MFA setup route itself
    if (pathname === '/mfa/setup') {
      return NextResponse.next();
    }

    // Redirect all other routes to MFA setup
    const mfaSetupUrl = new URL('/mfa/setup', request.url);
    mfaSetupUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(mfaSetupUrl);
  }

  // SECURITY GATE 2: Force MFA verification for users who have MFA but haven't verified this session
  // This ensures users verify their identity every time they log in
  if (mfaEnabled && !mfaVerified) {
    // Allow access to MFA routes for verification
    if (isMfaRoute) {
      return NextResponse.next();
    }

    // Redirect all other routes to MFA verification
    const mfaVerifyUrl = new URL('/mfa/verify', request.url);
    mfaVerifyUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(mfaVerifyUrl);
  }

  // User is authenticated, has MFA setup, and has verified this session - allow access
  return NextResponse.next();
});

/**
 * Proxy configuration - specify which routes to run proxy on
 *
 * Pattern matches all routes EXCEPT:
 * - Next.js internal routes (_next/static, _next/image)
 * - Static files (favicon.ico)
 * - Image files (.svg, .png, .jpg, .jpeg, .gif, .webp)
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
