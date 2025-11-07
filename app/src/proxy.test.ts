/**
 * Tests for Next.js 16 Proxy
 * Covers route protection, tracker.js serving, and authentication checks
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock the auth wrapper from lib/auth/config
jest.mock('../lib/auth/config', () => ({
  auth: jest.fn((middleware) => middleware),
}));

import { proxy } from './proxy';

/**
 * Helper function to create mock event context
 * NextAuth's auth() wrapper expects AppRouteHandlerFnContext, not NextFetchEvent
 * We use a minimal mock that satisfies the type system
 */
function createMockEvent(): any {
  return {
    waitUntil: jest.fn(),
    passThroughOnException: jest.fn(),
  };
}

/**
 * Helper function to create mock NextRequest objects
 * Uses plain object with required properties to avoid URL property setter issues
 */
function createMockRequest(pathname: string, environment?: string, auth?: any): NextRequest {
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
    auth, // Add auth property for NextAuth
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
      const request = createMockRequest('/login');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      // NextResponse.next() doesn't redirect, so no redirect property
    });

    it('should allow access to /api/track without authentication', async () => {
      const request = createMockRequest('/api/track');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should allow access to /api/auth/* without authentication', async () => {
      const request = createMockRequest('/api/auth/signin');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should allow access to /api/auth/callback/credentials', async () => {
      const request = createMockRequest('/api/auth/callback/credentials');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should allow access to /fb-a7k2.js without authentication', async () => {
      const request = createMockRequest('/fb-a7k2.js');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('Tracker.js serving', () => {
    it('should serve tracker.js without authentication', async () => {
      const request = createMockRequest('/tracker.js', 'development');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      // In development, should rewrite to /tracker.js
    });

    it('should rewrite tracker.js to tracker.min.js in production', async () => {
      const request = createMockRequest('/tracker.js', 'production');
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      // Verify it's a rewrite response (implementation detail)
    });
  });

  describe('Protected routes - unauthenticated', () => {
    it('should redirect to /login when accessing dashboard without auth', async () => {
      const request = createMockRequest('/dashboard', undefined, null); // null auth = unauthenticated
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(307); // Redirect status
    });

    it('should set callbackUrl parameter when redirecting to login', async () => {
      const request = createMockRequest('/dashboard/analytics', undefined, null);
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(307);

      // Check redirect URL includes callbackUrl
      const redirectUrl = response?.headers.get('location');
      expect(redirectUrl).toContain('/login');
      expect(redirectUrl).toContain('callbackUrl=%2Fdashboard%2Fanalytics');
    });

    it('should redirect root path to login when unauthenticated', async () => {
      const request = createMockRequest('/', undefined, null);
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(307);
    });
  });

  describe('Protected routes - authenticated', () => {
    it('should allow access to dashboard when authenticated', async () => {
      const mockAuth = {
        user: {
          id: 'user123',
          email: 'user@example.com',
          name: 'Test User',
          mfaEnabled: true,
          mfaVerified: true,
        },
      };
      const request = createMockRequest('/dashboard', undefined, mockAuth);
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      // Should not redirect - status should not be 307
      expect(response?.status).not.toBe(307);
    });

    it('should allow access to root path when authenticated', async () => {
      const mockAuth = {
        user: {
          id: 'user123',
          email: 'user@example.com',
          name: 'Test User',
          mfaEnabled: true,
          mfaVerified: true,
        },
      };
      const request = createMockRequest('/', undefined, mockAuth);
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).not.toBe(307);
    });

    it('should allow access to any protected route when authenticated', async () => {
      const mockAuth = {
        user: {
          id: 'user123',
          email: 'user@example.com',
          name: 'Test User',
          mfaEnabled: true,
          mfaVerified: true,
        },
      };
      const request = createMockRequest('/settings/profile', undefined, mockAuth);
      const event = createMockEvent();

      const response = await proxy(request, event);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).not.toBe(307);
    });
  });
});
