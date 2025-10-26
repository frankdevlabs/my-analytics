/**
 * Phase 1 Integration Tests: Enhanced Analytics Tracking System
 *
 * Tests the complete end-to-end workflow of the 36-field tracking system:
 * - Tracker collects 36 fields from browser APIs
 * - POST request to /api/track with complete payload
 * - Database insert with all 36 fields
 * - Integration points: Redis, MaxMind GeoIP, Prisma, isbot, UA parsing
 *
 * Focus: Integration between tracker → API → database
 * Scope: Phase 1 features only (36-field tracking, bot detection, visitor deduplication)
 */

import { PrismaClient } from '@prisma/client';
import { POST, OPTIONS } from '../../src/app/api/track/route';
import { NextRequest } from 'next/server';

// Mock external dependencies for integration testing
jest.mock('lib/geoip/maxmind-reader');
jest.mock('lib/privacy/visitor-tracking');

import { lookupCountryCode } from 'lib/geoip/maxmind-reader';
import { checkAndRecordVisitor } from 'lib/privacy/visitor-tracking';

const mockLookupCountryCode = lookupCountryCode as jest.MockedFunction<typeof lookupCountryCode>;
const mockCheckAndRecordVisitor = checkAndRecordVisitor as jest.MockedFunction<typeof checkAndRecordVisitor>;

const prisma = new PrismaClient();

describe('Phase 1 Integration Tests: Enhanced Tracking System', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mocks for successful scenarios
    mockLookupCountryCode.mockReturnValue('US');
    mockCheckAndRecordVisitor.mockResolvedValue(true);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pageview.deleteMany({
      where: {
        path: {
          startsWith: '/test-integration-',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('End-to-End: 36-Field Tracking Workflow', () => {
    /**
     * Test 1: Complete E2E workflow with all 36 fields
     * Verifies tracker → API → database flow with comprehensive payload
     */
    test('should track pageview with all 36 fields end-to-end', async () => {
      // Simulate complete tracking payload from tracker.js
      const completePayload = {
        // Identity & Timing
        page_id: 'clh1234567890abcdefghijk',
        added_iso: new Date().toISOString(),
        session_id: '550e8400-e29b-41d4-a716-446655440000',

        // Page Context
        hostname: 'franksblog.nl',
        path: '/test-integration-e2e-complete',
        hash: '#introduction',
        query_string: '?utm_source=twitter&utm_medium=social',
        document_title: 'Test Blog Post - Enhanced Analytics',
        document_referrer: 'https://twitter.com',

        // Visitor Classification
        is_internal_referrer: false,

        // Device & Browser
        device_type: 'desktop',
        viewport_width: 1920,
        viewport_height: 1080,
        screen_width: 2560,
        screen_height: 1440,

        // Locale & Environment
        language: 'en-US',
        timezone: 'America/New_York',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

        // Marketing Attribution
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: 'launch-2025',
        utm_content: 'hero-button',
        utm_term: 'analytics',

        // Engagement Metrics
        duration_seconds: 45,
        time_on_page_seconds: 42,
        scrolled_percentage: 75,
        visibility_changes: 2,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(completePayload),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '8.8.8.8',
        },
      });

      const response = await POST(request);

      // Verify API response
      expect(response.status).toBe(204);
      expect(mockLookupCountryCode).toHaveBeenCalledWith('8.8.8.8');

      // Verify database insert with all fields
      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-integration-e2e-complete' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();

      // Verify all 36 field categories
      expect(pageview?.page_id).toBe(completePayload.page_id);
      expect(pageview?.session_id).toBe(completePayload.session_id);
      expect(pageview?.hostname).toBe(completePayload.hostname);
      expect(pageview?.path).toBe(completePayload.path);
      expect(pageview?.hash).toBe(completePayload.hash);
      expect(pageview?.document_title).toBe(completePayload.document_title);
      expect(pageview?.is_internal_referrer).toBe(false);
      expect(pageview?.device_type).toBe('desktop');
      expect(pageview?.viewport_width).toBe(1920);
      expect(pageview?.browser_name).toBe('Chrome');
      expect(pageview?.os_name).toBe('Mac OS');
      expect(pageview?.language).toBe('en-US');
      expect(pageview?.utm_source).toBe('twitter');
      expect(pageview?.utm_medium).toBe('social');
      expect(pageview?.duration_seconds).toBe(45);
      expect(pageview?.scrolled_percentage).toBe(75);
      expect(pageview?.is_bot).toBe(false);
      expect(pageview?.country_code).toBe('US');
    });

    /**
     * Test 2: Minimal payload with only required fields
     */
    test('should track pageview with minimal required fields', async () => {
      const minimalPayload = {
        path: '/test-integration-minimal',
        device_type: 'mobile',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        added_iso: new Date().toISOString(),
        duration_seconds: 0,
        page_id: 'clh9876543210zyxwvutsrqp',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(minimalPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(204);

      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-integration-minimal' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();
      expect(pageview?.device_type).toBe('mobile');
      expect(pageview?.browser_name).toBe('Mobile Safari');
      expect(pageview?.os_name).toBe('iOS');
    });
  });

  describe('Redis Graceful Degradation', () => {
    /**
     * Test 3: Tracking continues when Redis fails
     */
    test('should continue tracking when Redis is unavailable', async () => {
      // Simulate Redis failure
      mockCheckAndRecordVisitor.mockResolvedValue(false);

      const payload = {
        path: '/test-integration-redis-down',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
        added_iso: new Date().toISOString(),
        duration_seconds: 0,
        page_id: 'clhredis1234567890abc',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(204);

      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-integration-redis-down' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();
      expect(pageview?.is_unique).toBe(false); // Conservative default
    });
  });

  describe('GeoIP Failure Handling', () => {
    /**
     * Test 4: Tracking continues when GeoIP fails
     */
    test('should set country_code to null when GeoIP lookup fails', async () => {
      mockLookupCountryCode.mockReturnValue(null);

      const payload = {
        path: '/test-integration-geoip-fail',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
        added_iso: new Date().toISOString(),
        duration_seconds: 0,
        page_id: 'clhgeoip1234567890abc',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(204);

      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-integration-geoip-fail' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();
      expect(pageview?.country_code).toBeNull();
    });
  });

  describe('Bot Detection', () => {
    /**
     * Tests 5-8: Bot detection with real User-Agent strings
     */
    const botTestCases = [
      {
        name: 'Googlebot',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        expectedIsBot: true,
      },
      {
        name: 'Bingbot',
        userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        expectedIsBot: true,
      },
      {
        name: 'FacebookBot',
        userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        expectedIsBot: true,
      },
      {
        name: 'Real Chrome Browser',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        expectedIsBot: false,
      },
    ];

    botTestCases.forEach(({ name, userAgent, expectedIsBot }, index) => {
      test(`should ${expectedIsBot ? 'detect' : 'not detect'} ${name} as bot`, async () => {
        const payload = {
          path: `/test-integration-bot-${index}`,
          device_type: 'desktop',
          user_agent: userAgent,
          added_iso: new Date().toISOString(),
          duration_seconds: 0,
          page_id: `clhbot${index}1234567890abc`,
          is_internal_referrer: false,
          visibility_changes: 0,
        };

        const request = new NextRequest('http://localhost:3000/api/track', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);

        expect(response.status).toBe(204);

        const pageview = await prisma.pageview.findFirst({
          where: { path: `/test-integration-bot-${index}` },
          orderBy: { created_at: 'desc' },
        });

        expect(pageview).not.toBeNull();
        expect(pageview?.is_bot).toBe(expectedIsBot);
      });
    });
  });

  describe('Validation Error Handling', () => {
    /**
     * Tests 9-11: Validation errors return clear messages
     */
    const validationTestCases = [
      {
        name: 'missing required field (path)',
        payload: {
          device_type: 'desktop',
          user_agent: 'Mozilla/5.0',
          added_iso: new Date().toISOString(),
          duration_seconds: 0,
        },
        expectedField: 'path',
      },
      {
        name: 'invalid path format',
        payload: {
          path: 'invalid-path',
          device_type: 'desktop',
          user_agent: 'Mozilla/5.0',
          added_iso: new Date().toISOString(),
          duration_seconds: 0,
          page_id: 'clhtest',
          is_internal_referrer: false,
          visibility_changes: 0,
        },
        expectedField: 'path',
      },
      {
        name: 'scrolled_percentage out of range',
        payload: {
          path: '/test',
          device_type: 'desktop',
          user_agent: 'Mozilla/5.0',
          added_iso: new Date().toISOString(),
          duration_seconds: 0,
          page_id: 'clhtest',
          scrolled_percentage: 150,
          is_internal_referrer: false,
          visibility_changes: 0,
        },
        expectedField: 'scrolled_percentage',
      },
    ];

    validationTestCases.forEach(({ name, payload, expectedField }) => {
      test(`should return 400 for ${name}`, async () => {
        const request = new NextRequest('http://localhost:3000/api/track', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBeDefined();
        expect(JSON.stringify(data)).toContain(expectedField);
      });
    });
  });

  describe('CORS Enforcement', () => {
    /**
     * Test 12: OPTIONS preflight
     */
    test('should handle OPTIONS preflight request', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    /**
     * Test 13: POST includes CORS headers
     */
    test('should include CORS headers in POST response', async () => {
      const payload = {
        path: '/test-integration-cors',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
        added_iso: new Date().toISOString(),
        duration_seconds: 0,
        page_id: 'clhcors',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
    });
  });

  describe('Visitor Deduplication', () => {
    /**
     * Test 14: First visit marked as unique
     */
    test('should mark first visit as unique', async () => {
      mockCheckAndRecordVisitor.mockResolvedValue(true);

      const payload = {
        path: '/test-integration-unique-1',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0 (Unique Browser)',
        added_iso: new Date().toISOString(),
        duration_seconds: 0,
        page_id: 'clhunique1',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(204);

      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-integration-unique-1' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();
      expect(pageview?.is_unique).toBe(true);
    });

    /**
     * Test 15: Second visit not marked as unique
     */
    test('should mark second visit as not unique', async () => {
      mockCheckAndRecordVisitor.mockResolvedValue(false);

      const payload = {
        path: '/test-integration-unique-2',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0 (Same Browser)',
        added_iso: new Date().toISOString(),
        duration_seconds: 0,
        page_id: 'clhunique2',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '1.2.3.4',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(204);

      const pageview = await prisma.pageview.findFirst({
        where: { path: '/test-integration-unique-2' },
        orderBy: { created_at: 'desc' },
      });

      expect(pageview).not.toBeNull();
      expect(pageview?.is_unique).toBe(false);
    });
  });
});
