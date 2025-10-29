/**
 * Tests for /api/metrics endpoint (POST and GET handlers)
 * Task Group 2.1: 4-6 focused tests for metrics endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET, OPTIONS } from '@/app/api/metrics/route';
import { prisma } from 'lib/db/prisma';

// Mock dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('lib/config/cors', () => ({
  getCorsHeaders: jest.fn(() => ({
    'Access-Control-Allow-Origin': 'http://localhost:3000',
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
  generateVisitorHash: jest.fn(() => 'hash123'),
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
    session_id: 'session-456',
    hostname: 'example.com',
    path: '/test',
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

describe('/api/metrics endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OPTIONS handler', () => {
    it('should return 204 with CORS and CSP headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });

  describe('POST handler', () => {
    it('should maintain existing track endpoint functionality', async () => {
      const mockPayload = createValidPayload();

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify(mockPayload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should include CORS and CSP headers in response', async () => {
      const mockPayload = createValidPayload();

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify(mockPayload),
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });

  describe('GET handler', () => {
    it('should decode btoa-encoded data parameter', async () => {
      const mockPayload = createValidPayload();

      const encodedData = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
      const url = `http://localhost:3000/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should return 1x1 transparent GIF pixel', async () => {
      const mockPayload = createValidPayload();

      const encodedData = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
      const url = `http://localhost:3000/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');

      // Check if response body exists (NextResponse always has a body)
      expect(response.body).toBeTruthy();
    });

    it('should validate payload with Zod schemas', async () => {
      const mockPayload = createValidPayload();

      const encodedData = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
      const url = `http://localhost:3000/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(request);

      // Should succeed with valid payload
      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should return pixel with silent failure for malformed btoa data', async () => {
      const url = 'http://localhost:3000/api/metrics?data=INVALID_BASE64!!!';

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const response = await GET(request);

      // Should still return pixel (silent failure)
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/gif');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should include CORS and CSP headers in GET response', async () => {
      const mockPayload = createValidPayload();

      const encodedData = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
      const url = `http://localhost:3000/api/metrics?data=${encodedData}`;

      const request = new NextRequest(url, {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });
});
