/**
 * Referrer URLs API Unit Tests
 * Tests for referrer URLs by domain endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getReferrerUrlsByDomain } from '@/lib/db/pageviews';

// Mock dependencies
jest.mock('lib/db/pageviews');

const mockGetReferrerUrlsByDomain = getReferrerUrlsByDomain as jest.MockedFunction<
  typeof getReferrerUrlsByDomain
>;

describe('GET /api/referrer-urls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success cases', () => {
    it('should return 200 with valid data for valid request', async () => {
      const mockData = [
        { url: 'https://google.com/search?q=analytics', pageviews: 150 },
        { url: 'https://google.com/search?q=tracking', pageviews: 100 },
      ];

      mockGetReferrerUrlsByDomain.mockResolvedValue(mockData);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31&limit=50'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockData);
      expect(data.meta).toEqual({
        count: 2,
        limit: 50,
        domain: 'google.com',
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'google.com',
        expect.any(Date),
        expect.any(Date),
        50
      );
    });

    it('should use default limit of 100 when not specified', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.limit).toBe(100);
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'example.com',
        expect.any(Date),
        expect.any(Date),
        100
      );
    });

    it('should cap limit at 100 even if higher requested', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31&limit=500'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.limit).toBe(100);
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'example.com',
        expect.any(Date),
        expect.any(Date),
        100
      );
    });

    it('should accept ISO 8601 date format', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01T00:00:00Z&to=2025-10-31T23:59:59Z'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when domain is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameter: domain');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 when domain is empty string', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Domain parameter cannot be empty');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 when from is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameters: from, to');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 when to is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameters: from, to');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid from date format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=not-a-date&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date format');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid to date format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=invalid-date'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date format');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 when startDate is after endDate', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-31&to=2025-10-01'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Start date must be before or equal to end date');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 for negative limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31&limit=-5'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Limit must be a positive integer');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 for non-integer limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31&limit=abc'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Limit must be a positive integer');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });

    it('should return 400 for zero limit', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31&limit=0'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Limit must be a positive integer');
      expect(mockGetReferrerUrlsByDomain).not.toHaveBeenCalled();
    });
  });

  describe('Database error handling', () => {
    it('should return 500 on database errors', async () => {
      mockGetReferrerUrlsByDomain.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Database connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGetReferrerUrlsByDomain.mockRejectedValue('Unexpected error');

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Unknown error');
    });
  });
});
