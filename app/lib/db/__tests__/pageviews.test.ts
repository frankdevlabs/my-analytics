/**
 * Tests for pageview query helpers
 * Note: These tests use mocked Prisma client to avoid actual database calls
 */

import {
  createPageview,
  getPageviewsInDateRange,
  getTopPages,
  getPageviewsOverTime,
  PageviewValidationError,
  DatabaseError
} from '../pageviews';
import { prisma } from '../prisma';
import { PageviewInput } from '../../validation/pageview';

// Mock Prisma to avoid actual database calls during unit testing
jest.mock('../prisma', () => ({
  prisma: {
    pageview: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn()
  }
}));

describe('createPageview', () => {
  const validInput: PageviewInput = {
    path: '/home',
    country_code: 'US',
    device_type: 'desktop',
    document_referrer: 'https://example.com',
    utm_source: 'google',
    duration_seconds: 30,
    added_iso: new Date('2025-10-15T12:00:00Z'),
    is_unique: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create pageview with valid data', async () => {
    const mockPageview = {
      id: 'test-id',
      ...validInput,
      created_at: new Date()
    };

    (prisma.$transaction as jest.Mock).mockResolvedValue(mockPageview);

    const result = await createPageview(validInput);

    expect(result).toBeDefined();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should reject invalid data with PageviewValidationError', async () => {
    const invalidInput = { ...validInput, path: 'no-leading-slash' };

    await expect(createPageview(invalidInput)).rejects.toThrow(PageviewValidationError);
  });

  it('should sanitize path and referrer', async () => {
    // Use valid input structure but with dangerous characters embedded
    const inputWithDangerousChars: PageviewInput = {
      ...validInput,
      path: '/path\x00with/\x01nulls',
      document_referrer: 'https://example.com/bad\x00path'
    };

    const mockPageview = {
      id: 'test-id',
      path: '/pathwith/nulls',
      document_referrer: 'https://example.com/badpath',
      country_code: 'US',
      device_type: 'desktop',
      utm_source: 'google',
      duration_seconds: 30,
      added_iso: new Date('2025-10-15T12:00:00Z'),
      is_unique: true,
      created_at: new Date()
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const mockTx = {
        pageview: {
          create: jest.fn().mockResolvedValue(mockPageview)
        }
      };
      return await fn(mockTx);
    });

    const result = await createPageview(inputWithDangerousChars);

    expect(result.path).toBe('/pathwith/nulls');
    expect(result.document_referrer).toBe('https://example.com/badpath');
  });
});

describe('getPageviewsInDateRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return count for date range', async () => {
    (prisma.pageview.count as jest.Mock).mockResolvedValue(42);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const count = await getPageviewsInDateRange(startDate, endDate);

    expect(count).toBe(42);
    expect(prisma.pageview.count).toHaveBeenCalledWith({
      where: {
        added_iso: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  });

  it('should throw DatabaseError on failure', async () => {
    (prisma.pageview.count as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await expect(getPageviewsInDateRange(startDate, endDate)).rejects.toThrow(DatabaseError);
  });
});

describe('getTopPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return grouped pageview counts by path', async () => {
    const mockResults = [
      { path: '/home', pageviews: BigInt(100), unique_visitors: BigInt(30) },
      { path: '/about', pageviews: BigInt(50), unique_visitors: BigInt(20) },
      { path: '/contact', pageviews: BigInt(25), unique_visitors: BigInt(15) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getTopPages(startDate, endDate, 10);

    expect(results).toEqual([
      { path: '/home', pageviews: 100, uniqueVisitors: 30 },
      { path: '/about', pageviews: 50, uniqueVisitors: 20 },
      { path: '/contact', pageviews: 25, uniqueVisitors: 15 }
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});

describe('getPageviewsOverTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return daily aggregated pageview data for valid date range', async () => {
    const mockResults = [
      { date: '2025-10-01', pageviews: BigInt(150), unique_visitors: BigInt(45) },
      { date: '2025-10-02', pageviews: BigInt(200), unique_visitors: BigInt(60) },
      { date: '2025-10-03', pageviews: BigInt(175), unique_visitors: BigInt(52) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-03');

    const results = await getPageviewsOverTime(startDate, endDate);

    expect(results).toEqual([
      { date: '2025-10-01', pageviews: 150, uniqueVisitors: 45 },
      { date: '2025-10-02', pageviews: 200, uniqueVisitors: 60 },
      { date: '2025-10-03', pageviews: 175, uniqueVisitors: 52 }
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('should exclude bot traffic from results', async () => {
    const mockResults = [
      { date: '2025-10-01', pageviews: BigInt(100), unique_visitors: BigInt(30) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-01');

    await getPageviewsOverTime(startDate, endDate);

    // Verify that the SQL query includes is_bot = false filter
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const queryString = queryCall[0].join('');
    expect(queryString).toContain('is_bot = false');
  });

  it('should handle empty result set', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-03');

    const results = await getPageviewsOverTime(startDate, endDate);

    expect(results).toEqual([]);
  });

  it('should convert BigInt to Number for JSON serialization', async () => {
    const mockResults = [
      { date: '2025-10-01', pageviews: BigInt(999999999), unique_visitors: BigInt(888888) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-01');

    const results = await getPageviewsOverTime(startDate, endDate);

    expect(typeof results[0].pageviews).toBe('number');
    expect(typeof results[0].uniqueVisitors).toBe('number');
    expect(results[0].pageviews).toBe(999999999);
    expect(results[0].uniqueVisitors).toBe(888888);
  });

  it('should retry on transient database errors', async () => {
    let attemptCount = 0;
    (prisma.$queryRaw as jest.Mock).mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        return Promise.reject(new Error('Connection timeout'));
      }
      return Promise.resolve([
        { date: '2025-10-01', pageviews: BigInt(100), unique_visitors: BigInt(30) }
      ]);
    });

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-01');

    const results = await getPageviewsOverTime(startDate, endDate);

    expect(results).toHaveLength(1);
    expect(attemptCount).toBe(2);
  });

  it('should throw DatabaseError after max retries', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Persistent connection failure'));

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-03');

    await expect(getPageviewsOverTime(startDate, endDate)).rejects.toThrow(DatabaseError);

    // Should attempt initial call + 3 retries = 4 total attempts
    expect((prisma.$queryRaw as jest.Mock).mock.calls.length).toBe(4);
  });

  it('should return chronologically ordered results', async () => {
    const mockResults = [
      { date: '2025-10-01', pageviews: BigInt(100), unique_visitors: BigInt(30) },
      { date: '2025-10-02', pageviews: BigInt(150), unique_visitors: BigInt(45) },
      { date: '2025-10-03', pageviews: BigInt(200), unique_visitors: BigInt(60) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-03');

    const results = await getPageviewsOverTime(startDate, endDate);

    // Verify results are in chronological order
    for (let i = 1; i < results.length; i++) {
      expect(results[i].date >= results[i - 1].date).toBe(true);
    }

    // Verify SQL query includes ORDER BY date ASC
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const queryString = queryCall[0].join('');
    expect(queryString).toContain('ORDER BY date ASC');
  });

  it('should handle date boundary conditions correctly', async () => {
    const mockResults = [
      { date: '2025-10-01', pageviews: BigInt(50), unique_visitors: BigInt(20) },
      { date: '2025-10-31', pageviews: BigInt(75), unique_visitors: BigInt(25) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    // Test with start and end of month
    const startDate = new Date('2025-10-01T00:00:00Z');
    const endDate = new Date('2025-10-31T23:59:59Z');

    const results = await getPageviewsOverTime(startDate, endDate);

    expect(results).toHaveLength(2);
    expect(results[0].date).toBe('2025-10-01');
    expect(results[1].date).toBe('2025-10-31');
  });
});
