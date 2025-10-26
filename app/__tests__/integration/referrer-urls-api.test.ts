/**
 * Integration Tests for Referrer URLs API
 * Tests the /api/referrer-urls endpoint with real database interactions
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/referrer-urls/route';
import { getReferrerUrlsByDomain } from 'lib/db/pageviews';

// Mock the database layer
jest.mock('lib/db/pageviews');

const mockGetReferrerUrlsByDomain = getReferrerUrlsByDomain as jest.MockedFunction<
  typeof getReferrerUrlsByDomain
>;

describe('Integration: GET /api/referrer-urls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('E2E: Fetch referrer URLs by domain through API', () => {
    it('should successfully fetch referrer URLs for a given domain', async () => {
      const mockData = [
        { url: 'https://google.com/search?q=analytics', pageviews: 150 },
        { url: 'https://google.com/search?q=tracking', pageviews: 100 },
        { url: 'https://google.com/', pageviews: 50 },
      ];

      mockGetReferrerUrlsByDomain.mockResolvedValue(mockData);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=google.com&from=2025-10-01&to=2025-10-31&limit=100'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.data).toEqual(mockData);
      expect(data.meta.domain).toBe('google.com');
      expect(data.meta.count).toBe(3);
      expect(data.meta.limit).toBe(100);
    });

    it('should handle empty results gracefully', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=unknown-domain.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.meta.count).toBe(0);
    });
  });

  describe('Date range filtering', () => {
    it('should pass correct date range to database function', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-15&to=2025-10-20'
      );

      await GET(request);

      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'example.com',
        new Date('2025-10-15'),
        new Date('2025-10-20'),
        100
      );
    });

    it('should handle same start and end date', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-15&to=2025-10-15'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'example.com',
        new Date('2025-10-15'),
        new Date('2025-10-15'),
        100
      );
    });
  });

  describe('Limit parameter behavior', () => {
    it('should respect custom limit within bounds', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31&limit=25'
      );

      await GET(request);

      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'example.com',
        expect.any(Date),
        expect.any(Date),
        25
      );
    });

    it('should return limited results when specified', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        url: `https://example.com/page${i}`,
        pageviews: 10 - i,
      }));

      mockGetReferrerUrlsByDomain.mockResolvedValue(mockData);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31&limit=10'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(10);
      expect(data.meta.limit).toBe(10);
    });
  });

  describe('Domain parameter validation', () => {
    it('should handle domains with special characters', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=sub-domain.example.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'sub-domain.example.com',
        expect.any(Date),
        expect.any(Date),
        100
      );
    });

    it('should handle domains with uppercase letters', async () => {
      mockGetReferrerUrlsByDomain.mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=Google.COM&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetReferrerUrlsByDomain).toHaveBeenCalledWith(
        'Google.COM',
        expect.any(Date),
        expect.any(Date),
        100
      );
    });
  });

  describe('Error resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      mockGetReferrerUrlsByDomain.mockRejectedValue(new Error('Connection timeout'));

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle query execution errors', async () => {
      mockGetReferrerUrlsByDomain.mockRejectedValue(new Error('Query execution failed'));

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Query execution failed');
    });
  });

  describe('Response format validation', () => {
    it('should return properly formatted response with all metadata', async () => {
      const mockData = [
        { url: 'https://example.com/page1', pageviews: 100 },
      ];

      mockGetReferrerUrlsByDomain.mockResolvedValue(mockData);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31&limit=50'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('count');
      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('domain');
      expect(data.meta).toHaveProperty('startDate');
      expect(data.meta).toHaveProperty('endDate');

      // Validate date formats in metadata
      expect(data.meta.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(data.meta.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Large dataset handling', () => {
    it('should handle large result sets efficiently', async () => {
      // Simulate a large dataset (100 URLs)
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        url: `https://example.com/page${i}`,
        pageviews: 1000 - i,
      }));

      mockGetReferrerUrlsByDomain.mockResolvedValue(mockData);

      const request = new NextRequest(
        'http://localhost:3000/api/referrer-urls?domain=example.com&from=2025-10-01&to=2025-10-31&limit=100'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(100);
      expect(data.meta.count).toBe(100);
    });
  });
});
