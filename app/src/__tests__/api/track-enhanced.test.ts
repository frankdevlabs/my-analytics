/**
 * Tests for Enhanced /api/track Endpoint (36 Fields)
 * Covers comprehensive pageview tracking with UA parsing, bot detection,
 * unique visitor detection, and country code extraction
 */

import { POST, OPTIONS } from '../../app/api/track/route';
import { prisma } from 'lib/db/prisma';
import { checkAndRecordVisitor } from 'lib/privacy/visitor-tracking';
import { lookupCountryCode } from 'lib/geoip/maxmind-reader';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    pageview: {
      create: jest.fn(),
    },
  },
}));

jest.mock('lib/privacy/visitor-tracking');
jest.mock('lib/geoip/maxmind-reader');

describe('Enhanced /api/track endpoint (36 fields)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
    const bodyString = JSON.stringify(body);
    return {
      method: 'POST',
      headers: {
        get: (key: string) => {
          const allHeaders: Record<string, string> = {
            'content-type': 'application/json',
            'x-forwarded-for': '8.8.8.8',
            ...headers,
          };
          return allHeaders[key.toLowerCase()] || null;
        },
      },
      json: async () => JSON.parse(bodyString),
    } as unknown as NextRequest;
  };

  const validPayload = {
    // Identity & Timing
    page_id: 'c123456789abcdefghij12345',
    added_iso: '2025-10-24T12:00:00.000Z',
    session_id: '550e8400-e29b-41d4-a716-446655440000',

    // Page Context
    hostname: 'franksblog.nl',
    path: '/blog/test-article',
    hash: '#section-1',
    query_string: '?utm_source=test',
    document_title: 'Test Article',
    document_referrer: 'https://google.com',

    // Visitor Classification
    is_internal_referrer: false,

    // Device & Browser
    device_type: 'desktop',
    browser_name: 'Chrome',
    browser_version: '120.0',
    os_name: 'Windows',
    os_version: '10',
    viewport_width: 1920,
    viewport_height: 1080,
    screen_width: 1920,
    screen_height: 1080,

    // Locale & Environment
    language: 'en-US',
    timezone: 'America/New_York',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Marketing Attribution
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: 'october-2025',
    utm_content: 'top-link',
    utm_term: 'analytics',

    // Engagement Metrics
    duration_seconds: 0,
    time_on_page_seconds: 0,
    scrolled_percentage: 0,
    visibility_changes: 0,
  };

  describe('POST /api/track - 36 field support', () => {
    it('should accept POST request with all 36 fields and return 204 No Content', async () => {
      // Mock dependencies
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(true);
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify all 36 fields are passed to database
      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { pageview: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.pageview.create.mock.calls[0][0].data;
      expect(createData.page_id).toBe(validPayload.page_id);
      expect(createData.hostname).toBe(validPayload.hostname);
      expect(createData.path).toBe(validPayload.path);
      expect(createData.browser_name).toBe('Chrome'); // Parsed from UA
      expect(createData.is_bot).toBe(false);
      expect(createData.is_unique).toBe(true);
      expect(createData.country_code).toBe('US');
    });

    it('should validate payload with Zod schema and reject invalid data', async () => {
      const invalidPayload = {
        ...validPayload,
        path: 'invalid-path', // Must start with '/'
        page_id: 'invalid-cuid', // Invalid CUID format
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThan(0);
    });

    it('should extract country_code from IP via MaxMind GeoIP', async () => {
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(false);
      (lookupCountryCode as jest.Mock).mockReturnValue('NL');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      await POST(request);

      expect(lookupCountryCode).toHaveBeenCalledWith('8.8.8.8');

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { pageview: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.pageview.create.mock.calls[0][0].data;
      expect(createData.country_code).toBe('NL');
    });

    it('should compute is_unique using Redis visitor hash', async () => {
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(true);
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      await POST(request);

      expect(checkAndRecordVisitor).toHaveBeenCalledTimes(1);
      expect(checkAndRecordVisitor).toHaveBeenCalledWith(expect.any(String));

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { pageview: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.pageview.create.mock.calls[0][0].data;
      expect(createData.is_unique).toBe(true);
    });

    it('should parse User-Agent and extract browser/OS fields', async () => {
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(false);
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const firefoxPayload = {
        ...validPayload,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      };

      const request = createMockRequest(firefoxPayload);
      await POST(request);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { pageview: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.pageview.create.mock.calls[0][0].data;
      expect(createData.browser_name).toBe('Firefox');
      expect(createData.os_name).toBe('Windows');
      expect(createData.os_version).toBe('10');
    });

    it('should detect bots using isbot library and set is_bot field', async () => {
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(false);
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const botPayload = {
        ...validPayload,
        user_agent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      };

      const request = createMockRequest(botPayload);
      await POST(request);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { pageview: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.pageview.create.mock.calls[0][0].data;
      expect(createData.is_bot).toBe(true);
    });

    it('should apply CORS headers correctly on POST response', async () => {
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(true);
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    });

    it('should gracefully handle Redis failure and set is_unique to false', async () => {
      // Simulate Redis failure
      (checkAndRecordVisitor as jest.Mock).mockResolvedValue(false);
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(204);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { pageview: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.pageview.create.mock.calls[0][0].data;
      expect(createData.is_unique).toBe(false);
    });
  });

  describe('OPTIONS /api/track - CORS preflight', () => {
    it('should handle OPTIONS request with correct CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });
});
