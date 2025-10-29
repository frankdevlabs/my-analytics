/**
 * Tests for CORS and CSP Configuration
 * Validates CORS headers for /api/metrics/* paths and CSP header generation
 */

import { NextRequest } from 'next/server';
import { getCorsHeaders, getPreflightCorsHeaders } from '../cors';

describe('CORS and CSP Configuration', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // Set development mode for tests
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('CORS headers for /api/metrics paths', () => {
    it('should recognize /api/metrics path and allow valid origin', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('should recognize /api/metrics/append path', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics/append', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    });

    it('should recognize /api/metrics/event path', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics/event', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    });
  });

  describe('GET method support', () => {
    it('should include GET in allowed methods', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('should allow GET method in preflight OPTIONS requests', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getPreflightCorsHeaders(request);

      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    });
  });

  describe('CSP header generation', () => {
    it('should generate CSP header with default-src self', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });

    it('should include CSP header for GET requests', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });

    it('should include CSP header even without origin (same-origin request)', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
      });

      const headers = getCorsHeaders(request);

      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });
  });

  describe('CORS and CSP headers combined', () => {
    it('should include both CORS and CSP headers in preflight OPTIONS', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getPreflightCorsHeaders(request);

      // CORS headers
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type');

      // CSP header
      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });

    it('should not conflict when both headers are present', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const headers = getCorsHeaders(request);

      // Both headers should be present
      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(headers['Content-Security-Policy']).toBeDefined();

      // Headers should have correct values
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });
  });

  describe('Production environment validation', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://franksblog.nl,https://example.com';
    });

    afterAll(() => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
    });

    it('should allow configured production origins', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          origin: 'https://franksblog.nl',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://franksblog.nl');
      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });

    it('should reject unauthorized origins', () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          origin: 'https://malicious-site.com',
        },
      });

      const headers = getCorsHeaders(request);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
      expect(headers['Content-Security-Policy']).toBe("default-src 'self'");
    });
  });
});
