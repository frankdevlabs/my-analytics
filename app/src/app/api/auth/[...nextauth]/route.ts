/**
 * NextAuth.js API Route Handler
 * Handles all authentication endpoints automatically
 */

import { handlers } from '../../../../../lib/auth/config';

/**
 * Export GET and POST handlers from NextAuth configuration
 * Handles:
 * - /api/auth/signin - Login page
 * - /api/auth/signout - Logout
 * - /api/auth/session - Current session data
 * - /api/auth/csrf - CSRF token
 * - /api/auth/callback/credentials - Credentials validation
 */
export const { GET, POST } = handlers;
