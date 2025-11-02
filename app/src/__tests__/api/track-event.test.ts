/**
 * Tests for /api/metrics/event Endpoint
 * Covers custom event tracking with JSONB metadata storage,
 * validation, country code extraction, and CORS headers
 */

import { POST, OPTIONS } from '../../app/api/metrics/event/route';
import { prisma } from 'lib/db/prisma';
import { lookupCountryCode } from 'lib/geoip/maxmind-reader';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    event: {
      create: jest.fn(),
    },
  },
}));

jest.mock('lib/geoip/maxmind-reader');

describe('/api/metrics/event endpoint', () => {
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
    event_name: 'button_click',
    event_metadata: {
      button_id: 'subscribe-button',
      location: 'header',
      timestamp_ms: 1234567890,
    },
    page_id: 'c123456789abcdefghij12345',
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    path: '/blog/test-article',
    timestamp: '2025-10-24T12:00:00.000Z',
  };

  describe('POST /api/metrics/event - Valid submissions', () => {
    it('should accept valid event with metadata and return 204 No Content', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify event data structure
      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { event: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.event.create.mock.calls[0][0].data;
      expect(createData.event_name).toBe('button_click');
      expect(createData.event_metadata).toEqual(validPayload.event_metadata);
      expect(createData.page_id).toBe(validPayload.page_id);
      expect(createData.session_id).toBe(validPayload.session_id);
      expect(createData.path).toBe(validPayload.path);
      expect(createData.country_code).toBe('US');
    });

    it('should accept valid event without metadata', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue('NL');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const payloadWithoutMetadata = {
        event_name: 'page_scroll',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/blog/test',
        timestamp: '2025-10-24T12:00:00.000Z',
      };

      const request = createMockRequest(payloadWithoutMetadata);
      const response = await POST(request);

      expect(response.status).toBe(204);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { event: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.event.create.mock.calls[0][0].data;
      expect(createData.event_name).toBe('page_scroll');
      // Prisma.JsonNull is stored as {} in the mock (not null)
      expect(createData.event_metadata).toEqual({});
      expect(createData.page_id).toBeNull();
    });

    it('should handle nullable page_id correctly', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const payloadWithoutPageId = {
        event_name: 'form_submit',
        event_metadata: { form_id: 'contact-form' },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/contact',
        timestamp: '2025-10-24T12:00:00.000Z',
      };

      const request = createMockRequest(payloadWithoutPageId);
      const response = await POST(request);

      expect(response.status).toBe(204);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { event: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.event.create.mock.calls[0][0].data;
      expect(createData.page_id).toBeNull();
    });
  });

  describe('POST /api/metrics/event - Validation errors', () => {
    it('should reject request with missing event_name', async () => {
      const invalidPayload = {
        ...validPayload,
        event_name: undefined,
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThan(0);
    });

    it('should reject request with missing session_id', async () => {
      const invalidPayload = {
        event_name: 'test_event',
        path: '/test',
        timestamp: '2025-10-24T12:00:00.000Z',
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field ==='session_id')).toBe(true);
    });

    it('should reject request with missing path', async () => {
      const invalidPayload = {
        event_name: 'test_event',
        session_id: 'test-session',
        timestamp: '2025-10-24T12:00:00.000Z',
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field ==='path')).toBe(true);
    });

    it('should reject request with invalid timestamp', async () => {
      const invalidPayload = {
        ...validPayload,
        timestamp: 'not-a-date',
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field ==='timestamp')).toBe(true);
    });

    it('should reject metadata exceeding 5KB size limit', async () => {
      // Create a metadata object that exceeds 5KB
      const largeMetadata: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key_${i}`] = 'a'.repeat(100);
      }

      const payloadWithLargeMetadata = {
        ...validPayload,
        event_metadata: largeMetadata,
      };

      const request = createMockRequest(payloadWithLargeMetadata);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field ==='event_metadata')).toBe(true);
    });

    it('should reject invalid page_id format', async () => {
      const invalidPayload = {
        ...validPayload,
        page_id: 'invalid-cuid-format',
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field ==='page_id')).toBe(true);
    });
  });

  describe('POST /api/metrics/event - Country code extraction', () => {
    it('should extract country_code from IP address', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue('NL');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload, {
        'x-forwarded-for': '185.2.3.4',
      });
      await POST(request);

      expect(lookupCountryCode).toHaveBeenCalledWith('185.2.3.4');

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { event: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.event.create.mock.calls[0][0].data;
      expect(createData.country_code).toBe('NL');
    });

    it('should gracefully handle GeoIP lookup failure', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue(null);
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(204);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = { event: { create: jest.fn() } };
      await transactionCallback(mockTx);

      const createData = mockTx.event.create.mock.calls[0][0].data;
      expect(createData.country_code).toBeNull();
    });
  });

  describe('POST /api/metrics/event - CORS headers', () => {
    it('should apply correct CORS headers on successful response', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockResolvedValue({});

      const request = createMockRequest(validPayload, { origin: 'https://franksblog.nl' });
      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    it('should apply CORS headers on validation error response', async () => {
      const invalidPayload = {
        event_name: 'test',
        // Missing required fields
      };

      const request = createMockRequest(invalidPayload, { origin: 'https://franksblog.nl' });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
    });
  });

  describe('POST /api/metrics/event - Database errors', () => {
    it('should return 500 on database error', async () => {
      (lookupCountryCode as jest.Mock).mockReturnValue('US');
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Failed to record event');
    });
  });

  describe('OPTIONS /api/metrics/event - CORS preflight', () => {
    it('should handle OPTIONS request with correct CORS headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/metrics/event', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://franksblog.nl',
        },
      });
      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});
