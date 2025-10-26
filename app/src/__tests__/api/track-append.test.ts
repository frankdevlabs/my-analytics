/**
 * Tests for /api/track/append Endpoint
 * Covers updating existing pageviews with duration and scroll data
 */

import { POST, OPTIONS } from '../../app/api/track/append/route';
import { prisma } from 'lib/db/prisma';
import { NextRequest } from 'next/server';

// Mock Prisma client
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    pageview: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('/api/track/append endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      method: 'POST',
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'content-type') {
            return 'application/json';
          }
          return null;
        },
      },
      json: async () => body,
    } as unknown as NextRequest;
  };

  const validPayload = {
    page_id: 'c123456789abcdefghij12345',
    duration_seconds: 45,
    scrolled_percentage: 75,
  };

  describe('POST /api/track/append - Valid updates', () => {
    it('should accept valid append with both duration and scroll percentage', async () => {
      // Mock successful database update
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should accept valid append with duration only (no scroll percentage)', async () => {
      // Mock successful database update
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const payloadWithoutScroll = {
        page_id: 'c123456789abcdefghij12345',
        duration_seconds: 30,
      };

      const request = createMockRequest(payloadWithoutScroll);
      const response = await POST(request);

      expect(response.status).toBe(204);

      // Verify update was called with correct data
      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = {
        pageview: {
          findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
          update: jest.fn(),
        },
      };
      await transactionCallback(mockTx);

      expect(mockTx.pageview.update).toHaveBeenCalledWith({
        where: { page_id: 'c123456789abcdefghij12345' },
        data: {
          duration_seconds: 30,
          scrolled_percentage: null,
          time_on_page_seconds: 30,
        },
      });
    });

    it('should update database with correct fields including time_on_page_seconds', async () => {
      // Mock successful database update
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const request = createMockRequest(validPayload);
      await POST(request);

      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const mockTx = {
        pageview: {
          findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
          update: jest.fn(),
        },
      };
      await transactionCallback(mockTx);

      expect(mockTx.pageview.update).toHaveBeenCalledWith({
        where: { page_id: 'c123456789abcdefghij12345' },
        data: {
          duration_seconds: 45,
          scrolled_percentage: 75,
          time_on_page_seconds: 45,
        },
      });
    });

    it('should handle multiple appends to same page_id (last write wins)', async () => {
      // Mock successful database updates
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      // First append
      const firstPayload = {
        page_id: 'c123456789abcdefghij12345',
        duration_seconds: 10,
        scrolled_percentage: 25,
      };
      const firstRequest = createMockRequest(firstPayload);
      const firstResponse = await POST(firstRequest);
      expect(firstResponse.status).toBe(204);

      // Second append (should overwrite)
      const secondPayload = {
        page_id: 'c123456789abcdefghij12345',
        duration_seconds: 30,
        scrolled_percentage: 50,
      };
      const secondRequest = createMockRequest(secondPayload);
      const secondResponse = await POST(secondRequest);
      expect(secondResponse.status).toBe(204);

      // Verify both updates were attempted
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should return 204 No Content on success', async () => {
      // Mock successful database update
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(204);
      // 204 No Content should have no body
      expect(response.body).toBeNull();
    });
  });

  describe('POST /api/track/append - Validation errors', () => {
    it('should reject invalid page_id format', async () => {
      const invalidPayload = {
        page_id: 'invalid-cuid-format', // Not a valid CUID
        duration_seconds: 45,
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThan(0);
      expect(body.details.some((d: { field: string }) => d.field === 'page_id')).toBe(true);
    });

    it('should reject negative duration_seconds', async () => {
      const invalidPayload = {
        page_id: 'c123456789abcdefghij12345',
        duration_seconds: -10, // Negative not allowed
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field === 'duration_seconds')).toBe(true);
    });

    it('should reject scrolled_percentage > 100', async () => {
      const invalidPayload = {
        page_id: 'c123456789abcdefghij12345',
        duration_seconds: 45,
        scrolled_percentage: 150, // Must be 0-100
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field === 'scrolled_percentage')).toBe(true);
    });

    it('should reject scrolled_percentage < 0', async () => {
      const invalidPayload = {
        page_id: 'c123456789abcdefghij12345',
        duration_seconds: 45,
        scrolled_percentage: -5, // Must be 0-100
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field === 'scrolled_percentage')).toBe(true);
    });

    it('should reject missing page_id', async () => {
      const invalidPayload = {
        duration_seconds: 45,
        // Missing page_id
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details.some((d: { field: string }) => d.field === 'page_id')).toBe(true);
    });
  });

  describe('POST /api/track/append - 404 handling', () => {
    it('should return 404 if page_id does not exist', async () => {
      // Mock pageview not found
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue(null), // Not found
            update: jest.fn(),
          },
        };
        try {
          await callback(mockTx);
        } catch (error) {
          throw error;
        }
      });

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Not found');
      expect(body.message).toContain('page_id');
    });
  });

  describe('POST /api/track/append - CORS headers', () => {
    it('should apply CORS headers to successful response', async () => {
      // Mock successful database update
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          pageview: {
            findUnique: jest.fn().mockResolvedValue({ id: 'pageview-123' }),
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    it('should apply CORS headers to error response', async () => {
      const invalidPayload = {
        page_id: 'invalid',
        duration_seconds: 45,
      };

      const request = createMockRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
    });
  });

  describe('POST /api/track/append - Database errors', () => {
    it('should handle database errors gracefully and return 500', async () => {
      // Mock database error (not the PAGEVIEW_NOT_FOUND error)
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest(validPayload);
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Failed to update pageview');
    });
  });

  describe('OPTIONS /api/track/append - CORS preflight', () => {
    it('should handle OPTIONS request with correct CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://franksblog.nl');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});
