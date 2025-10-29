/**
 * End-to-End Fallback Scenario Tests
 * Task Group 7.3: E2E Fallback Scenario Tests (2 tests)
 *
 * These tests verify the complete fallback chain behavior when transport
 * methods fail or are unavailable. Tests the tracker script's resilience.
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/metrics/route';
import { prisma } from 'lib/db/prisma';

// Mock dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
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

function createValidPayload() {
  return {
    page_id: 'clh1234567890abcdefghijk1',
    added_iso: '2025-10-29T12:00:00.000Z',
    session_id: 'test-session-uuid',
    hostname: 'example.com',
    path: '/test-page',
    hash: '',
    query_string: '',
    document_title: 'Fallback Test',
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

describe('Anti-Tracking Fallback Chain E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fallback Scenario: sendBeacon fail → fetch success', () => {
    it('should successfully deliver data via fetch when sendBeacon fails', async () => {
      const payload = createValidPayload();
      payload.document_title = 'Fetch Fallback Success';

      /**
       * Simulating the fallback scenario:
       * 1. Client-side: sendBeacon fails or returns false
       * 2. Client-side: Falls back to fetch with keepalive
       * 3. fetch sends POST request (same as sendBeacon would have)
       * 4. Server successfully receives and processes data
       */

      // Simulate the fetch fallback making a POST request
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

      // Verify successful delivery via fetch fallback
      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify CORS headers work for fallback request
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
    });
  });

  describe('Fallback Scenario: fetch fail → image beacon success', () => {
    it('should successfully deliver data via image beacon when fetch fails', async () => {
      const payload = createValidPayload();
      payload.document_title = 'Image Beacon Fallback Success';

      /**
       * Simulating the final fallback scenario:
       * 1. Client-side: sendBeacon fails or unavailable
       * 2. Client-side: fetch fails or unavailable
       * 3. Client-side: Falls back to image beacon with GET request
       * 4. Data is btoa-encoded and sent as query parameter
       * 5. Server decodes and processes data successfully
       * 6. Server returns 1x1 transparent GIF pixel
       */

      // Encode payload as client would do
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

      // Verify successful delivery via image beacon
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify CORS headers work for image beacon
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('should return pixel even when image beacon data is invalid', async () => {
      /**
       * Testing silent failure philosophy:
       * Even when data is malformed, image beacon should return pixel
       * to prevent console errors and maintain stealth operation
       */

      const url = 'http://localhost:3001/api/metrics?data=INVALID!!!BASE64';

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3001',
        },
      });

      const response = await GET(request);

      // Should still return pixel (silent failure)
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');

      // Database should NOT be called with invalid data
      expect(prisma.$transaction).not.toHaveBeenCalled();

      // CORS headers should still be present
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
    });
  });

  describe('Complete fallback chain resilience', () => {
    it('should handle multiple concurrent requests using different transport methods', async () => {
      const payload1 = createValidPayload();
      payload1.page_id = 'clh1234567890abcdefghijk1';
      payload1.path = '/page-1';

      const payload2 = createValidPayload();
      payload2.page_id = 'clh9876543210abcdefghijk2';
      payload2.path = '/page-2';

      const payload3 = createValidPayload();
      payload3.page_id = 'clh5555555555abcdefghijk3';
      payload3.path = '/page-3';

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      // Simulate concurrent requests from different transport methods
      const postRequest1 = POST(
        new NextRequest('http://localhost:3001/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3001',
          },
          body: JSON.stringify(payload1),
        })
      );

      const postRequest2 = POST(
        new NextRequest('http://localhost:3001/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3001',
          },
          body: JSON.stringify(payload2),
        })
      );

      const encodedData = Buffer.from(JSON.stringify(payload3)).toString('base64');
      const getRequest = GET(
        new NextRequest(`http://localhost:3001/api/metrics?data=${encodedData}`, {
          method: 'GET',
          headers: {
            'Origin': 'http://localhost:3001',
          },
        })
      );

      // Wait for all requests to complete
      const [response1, response2, response3] = await Promise.all([
        postRequest1,
        postRequest2,
        getRequest,
      ]);

      // All requests should succeed
      expect(response1.status).toBe(204);
      expect(response2.status).toBe(204);
      expect(response3.status).toBe(200);

      // Database should be called three times
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
  });
});
