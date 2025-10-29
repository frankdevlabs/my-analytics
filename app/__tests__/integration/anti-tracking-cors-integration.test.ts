/**
 * Integration tests for CORS and CSP Headers
 * Task Group 7.3: CORS and CSP Integration Tests (2-3 tests)
 *
 * These tests verify that CORS and CSP headers work correctly across
 * all /api/metrics/* endpoints with real cross-origin request scenarios.
 */

import { NextRequest } from 'next/server';
import { POST as MetricsPOST, GET as MetricsGET, OPTIONS as MetricsOPTIONS } from '@/app/api/metrics/route';
import { POST as AppendPOST, OPTIONS as AppendOPTIONS } from '@/app/api/metrics/append/route';
import { POST as EventPOST, OPTIONS as EventOPTIONS } from '@/app/api/metrics/event/route';
import { prisma } from 'lib/db/prisma';

// Mock dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('lib/config/cors', () => {
  const actualCors = jest.requireActual('lib/config/cors');
  return actualCors;
});

jest.mock('lib/parsing/user-agent-parser', () => ({
  parseUserAgent: jest.fn(() => ({
    browser_name: 'Chrome',
    browser_version: '120.0.0',
    os_name: 'Windows',
    os_version: '10',
  })),
}));

jest.mock('lib/parsing/extract-major-version', () => ({
  extractMajorVersion: jest.fn(() => '120'),
}));

jest.mock('lib/geoip/maxmind-reader', () => ({
  lookupCountryCode: jest.fn(async () => 'US'),
}));

jest.mock('lib/privacy/visitor-hash', () => ({
  generateVisitorHash: jest.fn(() => 'test-hash'),
}));

jest.mock('lib/privacy/visitor-tracking', () => ({
  checkAndRecordVisitor: jest.fn(async () => true),
}));

jest.mock('lib/session/session-storage', () => ({
  getOrCreateSession: jest.fn(async () => null),
  updateSession: jest.fn(async () => {}),
}));

jest.mock('lib/active-visitors/active-visitor-tracking', () => ({
  recordVisitorActivity: jest.fn(async () => {}),
}));

jest.mock('isbot', () => ({
  isbot: jest.fn(() => false),
}));

// Helper to create valid test payload
function createValidPayload() {
  return {
    page_id: 'clh1234567890abcdefghijk1',
    added_iso: '2025-10-29T12:00:00.000Z',
    session_id: 'test-session-uuid',
    hostname: 'example.com',
    path: '/test-page',
    hash: '',
    query_string: '',
    document_title: 'Test Page',
    document_referrer: '',
    is_internal_referrer: false,
    device_type: 'desktop',
    viewport_width: 1920,
    viewport_height: 1080,
    screen_width: 1920,
    screen_height: 1080,
    language: 'en-US',
    timezone: 'America/New_York',
    user_agent: 'Mozilla/5.0...',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    duration_seconds: 0,
    time_on_page_seconds: 0,
    scrolled_percentage: 0,
    visibility_changes: 0,
  };
}

describe('CORS and CSP Integration for Anti-Tracking Endpoints', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-origin POST requests with CORS headers', () => {
    it('should handle cross-origin POST to /api/metrics with full CORS flow', async () => {
      const payload = createValidPayload();

      // Simulate cross-origin request from localhost:3001 to localhost:3000
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await MetricsPOST(request);

      // Verify response
      expect(response.status).toBe(204);

      // Verify CORS headers allow the origin
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');

      // Verify CSP header is present
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should handle preflight OPTIONS request with combined CORS + CSP', async () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3001',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      const response = await MetricsOPTIONS(request);

      // Verify preflight response
      expect(response.status).toBe(204);

      // Verify CORS preflight headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');

      // Verify CSP header in preflight
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });

  describe('Cross-origin GET requests with CORS headers', () => {
    it('should handle cross-origin GET image beacon request with CORS', async () => {
      const payload = createValidPayload();
      const encodedData = Buffer.from(JSON.stringify(payload)).toString('base64');
      const url = `http://localhost:3000/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3001',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await MetricsGET(request);

      // Verify pixel response
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');

      // Verify CORS headers for GET method
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');

      // Verify CSP header is present
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });

  describe('CSP headers present on all /api/metrics/* endpoints', () => {
    it('should include CSP headers on /api/metrics endpoint', async () => {
      const payload = createValidPayload();

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await MetricsPOST(request);

      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should include CSP headers on /api/metrics/append endpoint', async () => {
      const payload = {
        page_id: 'clh1234567890abcdefghijk1',
        duration_seconds: 30,
        scrolled_percentage: 75,
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/append', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await AppendPOST(request);

      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should include CSP headers on /api/metrics/event endpoint', async () => {
      const payload = {
        event_name: 'button_click',
        event_metadata: { button_id: 'test' },
        page_id: 'clh1234567890abcdefghijk1',
        session_id: 'test-session',
        path: '/test',
        timestamp: '2025-10-29T12:00:00.000Z',
      };

      const request = new NextRequest('http://localhost:3000/api/metrics/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await EventPOST(request);

      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should include CSP headers in OPTIONS preflight for all endpoints', async () => {
      // Test /api/metrics OPTIONS
      const metricsOptions = await MetricsOPTIONS(
        new NextRequest('http://localhost:3000/api/metrics', {
          method: 'OPTIONS',
          headers: { 'Origin': 'http://localhost:3001' },
        })
      );
      expect(metricsOptions.headers.get('Content-Security-Policy')).toBe("default-src 'self'");

      // Test /api/metrics/append OPTIONS
      const appendOptions = await AppendOPTIONS(
        new NextRequest('http://localhost:3000/api/metrics/append', {
          method: 'OPTIONS',
          headers: { 'Origin': 'http://localhost:3001' },
        })
      );
      expect(appendOptions.headers.get('Content-Security-Policy')).toBe("default-src 'self'");

      // Test /api/metrics/event OPTIONS
      const eventOptions = await EventOPTIONS(
        new NextRequest('http://localhost:3000/api/metrics/event', {
          method: 'OPTIONS',
          headers: { 'Origin': 'http://localhost:3001' },
        })
      );
      expect(eventOptions.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });
});
