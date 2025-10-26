/**
 * Tests for getPageviewsByCountry() with bot filtering
 * Focused tests for geographic distribution query functionality
 */

import {
  getPageviewsByCountry,
  DatabaseError
} from '../pageviews';
import { prisma } from '../prisma';

// Mock Prisma to avoid actual database calls during unit testing
jest.mock('../prisma', () => ({
  prisma: {
    pageview: {
      groupBy: jest.fn()
    }
  }
}));

describe('getPageviewsByCountry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return country distribution with bot filtering applied', async () => {
    const mockResults = [
      { country_code: 'US', _count: { country_code: 150 } },
      { country_code: 'CA', _count: { country_code: 75 } },
      { country_code: 'GB', _count: { country_code: 50 } }
    ];

    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getPageviewsByCountry(startDate, endDate);

    expect(results).toEqual([
      { country_code: 'US', count: 150 },
      { country_code: 'CA', count: 75 },
      { country_code: 'GB', count: 50 }
    ]);

    // Verify bot filtering is applied in the where clause
    expect(prisma.pageview.groupBy).toHaveBeenCalledWith({
      by: ['country_code'],
      where: {
        added_iso: {
          gte: startDate,
          lte: endDate
        },
        is_bot: false
      },
      _count: {
        country_code: true
      },
      orderBy: {
        _count: {
          country_code: 'desc'
        }
      }
    });
  });

  it('should filter results by date range correctly', async () => {
    const mockResults = [
      { country_code: 'US', _count: { country_code: 100 } }
    ];

    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-09-01T00:00:00Z');
    const endDate = new Date('2025-09-30T23:59:59Z');

    await getPageviewsByCountry(startDate, endDate);

    const callArgs = (prisma.pageview.groupBy as jest.Mock).mock.calls[0][0];
    expect(callArgs.where.added_iso.gte).toEqual(startDate);
    expect(callArgs.where.added_iso.lte).toEqual(endDate);
  });

  it('should order results by count in descending order', async () => {
    const mockResults = [
      { country_code: 'US', _count: { country_code: 500 } },
      { country_code: 'CA', _count: { country_code: 300 } },
      { country_code: 'GB', _count: { country_code: 100 } }
    ];

    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getPageviewsByCountry(startDate, endDate);

    // Verify descending order is maintained in results
    expect(results[0].count).toBeGreaterThan(results[1].count);
    expect(results[1].count).toBeGreaterThan(results[2].count);

    // Verify orderBy clause specifies descending order
    const callArgs = (prisma.pageview.groupBy as jest.Mock).mock.calls[0][0];
    expect(callArgs.orderBy._count.country_code).toBe('desc');
  });

  it('should handle null country codes gracefully', async () => {
    const mockResults = [
      { country_code: 'US', _count: { country_code: 150 } },
      { country_code: null, _count: { country_code: 25 } },
      { country_code: 'CA', _count: { country_code: 75 } }
    ];

    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getPageviewsByCountry(startDate, endDate);

    expect(results).toEqual([
      { country_code: 'US', count: 150 },
      { country_code: null, count: 25 },
      { country_code: 'CA', count: 75 }
    ]);

    // Should not throw error on null country_code
    expect(results.length).toBe(3);
  });

  it('should return empty array when no data is found', async () => {
    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue([]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getPageviewsByCountry(startDate, endDate);

    expect(results).toEqual([]);
  });

  it('should retry on transient database errors', async () => {
    let attemptCount = 0;
    (prisma.pageview.groupBy as jest.Mock).mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        return Promise.reject(new Error('Connection timeout'));
      }
      return Promise.resolve([
        { country_code: 'US', _count: { country_code: 100 } }
      ]);
    });

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getPageviewsByCountry(startDate, endDate);

    expect(results).toHaveLength(1);
    expect(attemptCount).toBe(2);
  });

  it('should throw DatabaseError after max retries', async () => {
    (prisma.pageview.groupBy as jest.Mock).mockRejectedValue(
      new Error('Persistent connection failure')
    );

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await expect(getPageviewsByCountry(startDate, endDate)).rejects.toThrow(DatabaseError);

    // Should attempt initial call + 3 retries = 4 total attempts
    expect((prisma.pageview.groupBy as jest.Mock).mock.calls.length).toBe(4);
  });

  it('should handle database errors with proper error context', async () => {
    const dbError = new Error('Query timeout');
    (prisma.pageview.groupBy as jest.Mock).mockRejectedValue(dbError);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await expect(getPageviewsByCountry(startDate, endDate)).rejects.toThrow(DatabaseError);
  });
});
