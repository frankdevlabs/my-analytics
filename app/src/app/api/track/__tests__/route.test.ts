/**
 * API Track Endpoint Tests
 * Tests the /api/track endpoint with various payloads and scenarios
 */

import { POST, OPTIONS } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from 'lib/db/prisma';
import { init } from '@paralleldrive/cuid2';

// Initialize CUID2 generator matching the format used in production (25 chars, starts with 'c')
const createCuid2 = init({ length: 24 });
const generateTestPageId = () => 'c' + createCuid2();

// Mock dependencies
jest.mock('lib/geoip/maxmind-reader');
jest.mock('lib/privacy/visitor-tracking');

import { lookupCountryCode } from 'lib/geoip/maxmind-reader';
import { checkAndRecordVisitor } from 'lib/privacy/visitor-tracking';

const mockLookupCountryCode = lookupCountryCode as jest.MockedFunction<typeof lookupCountryCode>;
const mockCheckAndRecordVisitor = checkAndRecordVisitor as jest.MockedFunction<typeof checkAndRecordVisitor>;

// Valid CUID2 format for test payloads
const VALID_CUID2 = 'clh7p1q8b0000qzrmn1h2w3x4';

describe('/api/track POST endpoint', () => {
  beforeAll(async () => {
    // Clean up any leftover test data from previous runs
    await prisma.pageview.deleteMany({
      where: {
        path: {
          contains: '/test-',
        },
      },
    });
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockLookupCountryCode.mockReturnValue('US');
    mockCheckAndRecordVisitor.mockResolvedValue(true);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pageview.deleteMany({
      where: {
        path: {
          contains: '/test-',
        },
      },
    });
    await prisma.$disconnect();
  });

  test('happy path: valid payload returns 204 and creates pageview', async () => {
    const validPayload = {
      page_id: generateTestPageId(),
      path: '/test-happy-path',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      added_iso: new Date().toISOString(),
      duration_seconds: 15,
      is_internal_referrer: false,
      visibility_changes: 0,
      referrer: 'https://google.com',
      utm_source: 'test',
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '8.8.8.8',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockLookupCountryCode).toHaveBeenCalledWith('8.8.8.8');

    // Verify pageview was created in database
    const pageview = await prisma.pageview.findFirst({
      where: { path: '/test-happy-path' },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview).not.toBeNull();
    expect(pageview?.device_type).toBe('desktop');
    expect(pageview?.country_code).toBe('US');
  });

  test('device override: client sends mobile but UA indicates desktop', async () => {
    const payload = {
      page_id: generateTestPageId(),
      path: '/test-device-override',
      device_type: 'mobile', // Client claims mobile
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // Desktop UA
      added_iso: new Date().toISOString(),
      duration_seconds: 10,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    // Verify device type was overridden to desktop based on UA
    const pageview = await prisma.pageview.findFirst({
      where: { path: '/test-device-override' },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview?.device_type).toBe('desktop');
  });

  test('GeoIP population: request with IP populates country_code', async () => {
    mockLookupCountryCode.mockReturnValue('NL');

    const payload = {
      page_id: generateTestPageId(),
      path: '/test-geoip',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 5,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'x-real-ip': '185.12.45.67',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockLookupCountryCode).toHaveBeenCalledWith('185.12.45.67');

    const pageview = await prisma.pageview.findFirst({
      where: { path: '/test-geoip' },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview?.country_code).toBe('NL');
  });

  test('graceful GeoIP failure: invalid IP returns null, pageview still recorded', async () => {
    mockLookupCountryCode.mockReturnValue(null);

    const payload = {
      page_id: generateTestPageId(),
      path: '/test-geoip-failure',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 5,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    const pageview = await prisma.pageview.findFirst({
      where: { path: '/test-geoip-failure' },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview?.country_code).toBeNull();
  });

  test('validation failure: missing required field returns 400 with error details', async () => {
    const invalidPayload = {
      page_id: VALID_CUID2,
      // Missing path
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 5,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'path',
        }),
      ])
    );
  });

  test('validation failure: path not starting with / returns 400', async () => {
    const invalidPayload = {
      page_id: VALID_CUID2,
      path: 'invalid-path', // Doesn't start with /
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 5,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details[0].field).toBe('path');
  });

  // ========================================
  // ADDITIONAL STRATEGIC TESTS (Task 4.3)
  // ========================================

  test('combined failure: both UA parsing and GeoIP lookup fail, pageview still recorded with defaults', async () => {
    mockLookupCountryCode.mockReturnValue(null);

    const payload = {
      page_id: generateTestPageId(),
      path: '/test-combined-failure',
      device_type: 'mobile',
      user_agent: 'invalid-ua-string', // Invalid but non-empty UA will fallback to desktop
      added_iso: new Date().toISOString(),
      duration_seconds: 8,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    const pageview = await prisma.pageview.findFirst({
      where: { path: '/test-combined-failure' },
      orderBy: { created_at: 'desc' },
    });

    // Both parsing failures should result in defaults
    expect(pageview).not.toBeNull();
    expect(pageview?.device_type).toBe('desktop'); // Fallback from invalid UA
    expect(pageview?.country_code).toBeNull(); // GeoIP failure
  });

  test('validation edge case: negative duration_seconds returns 400', async () => {
    const invalidPayload = {
      page_id: VALID_CUID2,
      path: '/test-negative-duration',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: -5, // Invalid negative value
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'duration_seconds',
        }),
      ])
    );
  });

  test('validation edge case: special characters and unicode in path are accepted', async () => {
    const payload = {
      page_id: generateTestPageId(),
      path: '/test-unicode-路径-特殊字符',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 3,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    const pageview = await prisma.pageview.findFirst({
      where: { path: { contains: 'unicode' } },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview).not.toBeNull();
  });

  test('validation edge case: control characters in path are sanitized', async () => {
    const payload = {
      page_id: generateTestPageId(),
      path: '/test-control\x00chars\x1F\x7F',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 2,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    // Verify control characters were removed (sanitizePath removes ASCII 0-31 and 127)
    const pageview = await prisma.pageview.findFirst({
      where: { path: { contains: 'test-control' } },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview).not.toBeNull();
    // Control characters should be stripped
    expect(pageview?.path).toBe('/test-controlchars');
  });

  test('validation edge case: SQL injection attempt in path is sanitized', async () => {
    const payload = {
      page_id: generateTestPageId(),
      path: "/test-sql'; DROP TABLE pageviews;--",
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 1,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    // Verify request was processed and database still exists
    const pageview = await prisma.pageview.findFirst({
      where: { path: { contains: 'test-sql' } },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview).not.toBeNull();
    // Table should still exist (Prisma parameterized queries prevent SQL injection)
  });

  test('concurrent requests: multiple requests with different IPs/UAs are processed independently', async () => {
    // Setup different mock returns for sequential calls
    mockLookupCountryCode
      .mockReturnValueOnce('US')
      .mockReturnValueOnce('GB')
      .mockReturnValueOnce('DE');

    const payload1 = {
      page_id: generateTestPageId(),
      path: '/test-concurrent-1',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      added_iso: new Date().toISOString(),
      duration_seconds: 5,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const payload2 = {
      page_id: generateTestPageId(),
      path: '/test-concurrent-2',
      device_type: 'mobile',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      added_iso: new Date().toISOString(),
      duration_seconds: 7,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const payload3 = {
      page_id: generateTestPageId(),
      path: '/test-concurrent-3',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      added_iso: new Date().toISOString(),
      duration_seconds: 9,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request1 = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload1),
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const request2 = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload2),
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });

    const request3 = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload3),
      headers: { 'x-forwarded-for': '9.10.11.12' },
    });

    // Process requests concurrently
    const responses = await Promise.all([
      POST(request1),
      POST(request2),
      POST(request3),
    ]);

    // All should succeed
    expect(responses[0].status).toBe(204);
    expect(responses[1].status).toBe(204);
    expect(responses[2].status).toBe(204);

    // Verify all pageviews were created with correct data
    const pageview1 = await prisma.pageview.findFirst({
      where: { path: '/test-concurrent-1' },
      orderBy: { created_at: 'desc' },
    });
    const pageview2 = await prisma.pageview.findFirst({
      where: { path: '/test-concurrent-2' },
      orderBy: { created_at: 'desc' },
    });
    const pageview3 = await prisma.pageview.findFirst({
      where: { path: '/test-concurrent-3' },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview1?.device_type).toBe('desktop');
    expect(pageview2?.device_type).toBe('mobile');
    expect(pageview3?.device_type).toBe('tablet');
    expect(pageview1?.country_code).toBe('US');
    expect(pageview2?.country_code).toBe('GB');
    expect(pageview3?.country_code).toBe('DE');
  });

  test('validation edge case: empty string referrer is accepted and transformed to undefined', async () => {
    const payload = {
      page_id: generateTestPageId(),
      path: '/test-empty-referrer',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: new Date().toISOString(),
      duration_seconds: 4,
      is_internal_referrer: false,
      visibility_changes: 0,
      referrer: '', // Empty string should be accepted
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);

    const pageview = await prisma.pageview.findFirst({
      where: { path: '/test-empty-referrer' },
      orderBy: { created_at: 'desc' },
    });

    expect(pageview).not.toBeNull();
    // Empty string referrer should be stored as null in database
    expect(pageview?.document_referrer).toBeNull();
  });

  test('validation edge case: invalid ISO timestamp format returns 400', async () => {
    const payload = {
      page_id: VALID_CUID2,
      path: '/test-invalid-timestamp',
      device_type: 'desktop',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      added_iso: '2024-13-45 25:99:99', // Invalid timestamp
      duration_seconds: 3,
      is_internal_referrer: false,
      visibility_changes: 0,
    };

    const request = new NextRequest('http://localhost:3000/api/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'added_iso',
        }),
      ])
    );
  });
});

describe('/api/track OPTIONS endpoint', () => {
  test('returns 204 with CORS headers', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
