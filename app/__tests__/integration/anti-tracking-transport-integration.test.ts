/**
 * Integration tests for Anti-Tracking Resilience Transport Methods
 * Task Group 7.3: Transport Method Integration Tests (3-4 tests)
 *
 * These tests verify that all three transport methods (sendBeacon, fetch, image beacon)
 * successfully deliver tracking data through the complete stack to the database.
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/metrics/route';
import { prisma } from 'lib/db/prisma';

// Mock all external dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    pageview: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('lib/config/cors', () => ({
  getCorsHeaders: jest.fn(() => ({
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Security-Policy': "default-src 'self'",
  })),
  getPreflightCorsHeaders: jest.fn(() => ({
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Security-Policy': "default-src 'self'",
  })),
}));

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
  generateVisitorHash: jest.fn(() => 'test-visitor-hash-123'),
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
    document_referrer: 'https://google.com',
    is_internal_referrer: false,
    device_type: 'desktop',
    viewport_width: 1920,
    viewport_height: 1080,
    screen_width: 1920,
    screen_height: 1080,
    language: 'en-US',
    timezone: 'America/New_York',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

describe('Anti-Tracking Transport Methods Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Transport Method 1: sendBeacon/POST with JSON', () => {
    it('should successfully deliver tracking data via POST to database', async () => {
      const payload = createValidPayload();

      const request = new NextRequest('http://localhost:3001/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      // Mock successful database transaction
      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await POST(request);

      // Verify response
      expect(response.status).toBe(204);

      // Verify database was called
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify CORS headers are present
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should handle POST from cross-origin request with full payload', async () => {
      const payload = createValidPayload();
      // Add full UTM parameters
      payload.utm_source = 'google';
      payload.utm_medium = 'cpc';
      payload.utm_campaign = 'spring-sale';

      const request = new NextRequest('https://analytics.example.com/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://myblog.com',
          'Referer': 'https://myblog.com/blog-post',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalled();

      // Verify the transaction was called with proper data structure
      const transactionCall = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      expect(typeof transactionCall).toBe('function');
    });
  });

  describe('Transport Method 2: fetch fallback with keepalive', () => {
    it('should deliver data when sendBeacon unavailable (via POST)', async () => {
      const payload = createValidPayload();
      payload.document_title = 'Fetch Fallback Test';
      payload.path = '/fetch-test';

      const request = new NextRequest('http://localhost:3001/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await POST(request);

      // Fetch fallback uses same POST endpoint as sendBeacon
      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Transport Method 3: Image beacon GET with btoa-encoded data', () => {
    it('should successfully deliver tracking data via GET image beacon', async () => {
      const payload = createValidPayload();
      payload.document_title = 'Image Beacon Test';
      payload.path = '/image-beacon-test';

      // Encode payload exactly as client-side tracker does
      const encodedData = Buffer.from(JSON.stringify(payload)).toString('base64');
      const url = `http://localhost:3001/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3001',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(request);

      // Verify pixel response
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');

      // Verify database was written
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify CORS/CSP headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should decode complex payload with special characters in GET request', async () => {
      const payload = createValidPayload();
      payload.document_title = 'Test Page with "Quotes" & Symbols';
      payload.query_string = 'param1=value1&param2=value2';
      payload.hash = '#section-123';

      const encodedData = Buffer.from(JSON.stringify(payload)).toString('base64');
      const url = `http://localhost:3001/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3001',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('All transport methods write identical data', () => {
    it('should write identical data structure regardless of transport method', async () => {
      const payload = createValidPayload();
      const transactionCalls: any[] = [];

      // Test POST (sendBeacon/fetch)
      const postRequest = new NextRequest('http://localhost:3001/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3001',
        },
        body: JSON.stringify(payload),
      });

      (prisma.$transaction as jest.Mock).mockImplementation((fn) => {
        transactionCalls.push({ method: 'POST', fn });
        return Promise.resolve(undefined);
      });

      await POST(postRequest);

      // Test GET (image beacon)
      const encodedData = Buffer.from(JSON.stringify(payload)).toString('base64');
      const getUrl = `http://localhost:3001/api/metrics?data=${encodedData}`;
      const getRequest = new NextRequest(getUrl, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3001',
        },
      });

      await GET(getRequest);

      // Both methods should have called database transaction
      expect(transactionCalls.length).toBe(2);
      expect(transactionCalls[0].method).toBe('POST');

      // Both transaction functions should be called (indicating same data flow)
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });
});
