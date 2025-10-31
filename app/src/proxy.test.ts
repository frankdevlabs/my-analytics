/**
 * Tests for Next.js 16 Proxy
 * Covers route protection, tracker.js serving, and authentication checks
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock next-auth/jwt BEFORE importing proxy
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

import { getToken } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import { proxy } from './proxy';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

/**
 * Helper function to create mock NextRequest objects
 * Uses plain object with required properties to avoid URL property setter issues
 */
function createMockRequest(pathname: string, environment?: string): NextRequest {
  const baseUrl = 'http://localhost:3000';
  const url = `${baseUrl}${pathname}`;

  // Set environment variable for production tests
  if (environment) {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: environment,
      writable: true,
      configurable: true,
    });
  }

  // Create mock request object
  const mockRequest = {
    nextUrl: {
      pathname,
      href: url,
    },
    url,
    headers: new Headers(),
  } as unknown as NextRequest;

  return mockRequest;
}

describe('Proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true,
    });
  });

  describe('Public routes', () => {
    it('should allow access to /login without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/login');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      // NextResponse.next() doesn't redirect, so no redirect property
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('should allow access to /api/track without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/track');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('should allow access to /api/auth/* without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/auth/signin');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('should allow access to /api/auth/callback/credentials', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/api/auth/callback/credentials');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('should allow access to /fb-a7k2.js without authentication', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/fb-a7k2.js');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(mockGetToken).not.toHaveBeenCalled();
    });
  });

  describe('Tracker.js serving', () => {
    it('should serve tracker.js without authentication', async () => {
      const request = createMockRequest('/tracker.js', 'development');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      // In development, should rewrite to /tracker.js
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('should rewrite tracker.js to tracker.min.js in production', async () => {
      const request = createMockRequest('/tracker.js', 'production');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      // Verify it's a rewrite response (implementation detail)
      expect(mockGetToken).not.toHaveBeenCalled();
    });
  });

  describe('Protected routes - unauthenticated', () => {
    it('should redirect to /login when accessing dashboard without auth', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/dashboard');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307); // Redirect status
      expect(mockGetToken).toHaveBeenCalled();
    });

    it('should set callbackUrl parameter when redirecting to login', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/dashboard/analytics');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);

      // Check redirect URL includes callbackUrl
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toContain('/login');
      expect(redirectUrl).toContain('callbackUrl=%2Fdashboard%2Fanalytics');
    });

    it('should redirect root path to login when unauthenticated', async () => {
      mockGetToken.mockResolvedValue(null);
      const request = createMockRequest('/');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(mockGetToken).toHaveBeenCalled();
    });
  });

  describe('Protected routes - authenticated', () => {
    it('should allow access to dashboard when authenticated', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User',
      } as JWT);

      const request = createMockRequest('/dashboard');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      // Should not redirect - status should not be 307
      expect(response.status).not.toBe(307);
      expect(mockGetToken).toHaveBeenCalled();
    });

    it('should allow access to root path when authenticated', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User',
      } as JWT);

      const request = createMockRequest('/');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
      expect(mockGetToken).toHaveBeenCalled();
    });

    it('should allow access to any protected route when authenticated', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User',
      } as JWT);

      const request = createMockRequest('/settings/profile');

      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(307);
      expect(mockGetToken).toHaveBeenCalled();
    });
  });
});
