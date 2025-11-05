/**
 * Next.js Middleware for MFA Enforcement
 * Runs on every request to enforce MFA verification before accessing protected routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './lib/auth/config';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/session',
  '/api/auth/providers',
  '/api/auth/csrf',
];

/**
 * MFA-related routes that should be accessible during MFA setup/verification
 */
const MFA_ROUTES = [
  '/mfa/setup',
  '/mfa/verify',
  '/api/auth/mfa/setup',
  '/api/auth/mfa/verify',
  '/api/auth/mfa/verify-setup',
];

/**
 * NextAuth callback routes
 */
const AUTH_CALLBACK_ROUTES = [
  '/api/auth/callback',
];

/**
 * Check if a path matches any of the allowed patterns
 */
function isAllowedPath(pathname: string, allowedPaths: string[]): boolean {
  return allowedPaths.some(path => pathname.startsWith(path));
}

/**
 * Middleware function
 * Enforces MFA verification for all protected routes
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isAllowedPath(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // Allow NextAuth callback routes
  if (isAllowedPath(pathname, AUTH_CALLBACK_ROUTES)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('.') // Files with extensions (images, etc.)
  ) {
    return NextResponse.next();
  }

  // Get the current session
  const session = await auth();

  // If no session, redirect to login (except for MFA routes)
  if (!session?.user) {
    // Allow MFA routes for unauthenticated users (they'll be handled by page guards)
    if (isAllowedPath(pathname, MFA_ROUTES)) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated - check MFA status
  const { mfaEnabled, mfaVerified } = session.user;

  // If MFA is enabled but not verified
  if (mfaEnabled && !mfaVerified) {
    // Allow access to MFA verification and setup routes
    if (isAllowedPath(pathname, MFA_ROUTES)) {
      return NextResponse.next();
    }

    // Redirect all other routes to MFA verification
    const mfaVerifyUrl = new URL('/mfa/verify', request.url);
    mfaVerifyUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(mfaVerifyUrl);
  }

  // All checks passed - allow request to proceed
  return NextResponse.next();
}

/**
 * Matcher configuration
 * Run middleware on all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
