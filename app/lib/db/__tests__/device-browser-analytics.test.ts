/**
 * Tests for Device and Browser Analytics Query Functions
 *
 * Tests getDeviceTypeBreakdown and getBrowserBreakdown functions to ensure
 * correct data aggregation, percentage calculations, and handling of edge cases.
 *
 * Task Group 3: Analytics Query Functions - Unit Tests
 */

import {
  getDeviceTypeBreakdown,
  getBrowserBreakdown,
  DatabaseError,
} from '../pageviews';
import { prisma } from '../prisma';

// Mock Prisma to avoid actual database calls during unit testing
jest.mock('../prisma', () => ({
  prisma: {
    pageview: {
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

describe('getDeviceTypeBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return device type breakdown with correct percentages', async () => {
    const mockResults = [
      { device_type: 'desktop', _count: { device_type: 50 } },
      { device_type: 'mobile', _count: { device_type: 30 } },
      { device_type: 'tablet', _count: { device_type: 20 } },
    ];

    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getDeviceTypeBreakdown(startDate, endDate);

    expect(results).toEqual([
      { device_type: 'Desktop', count: 50, percentage: 50 },
      { device_type: 'Mobile', count: 30, percentage: 30 },
      { device_type: 'Tablet', count: 20, percentage: 20 },
    ]);

    expect(prisma.pageview.groupBy).toHaveBeenCalledWith({
      by: ['device_type'],
      where: {
        added_iso: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        device_type: true,
      },
      orderBy: {
        _count: {
          device_type: 'desc',
        },
      },
    });
  });

  it('should handle empty results gracefully', async () => {
    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue([]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getDeviceTypeBreakdown(startDate, endDate);

    expect(results).toEqual([]);
  });

  it('should calculate correct percentages with decimal precision', async () => {
    const mockResults = [
      { device_type: 'desktop', _count: { device_type: 625 } },
      { device_type: 'mobile', _count: { device_type: 312 } },
      { device_type: 'tablet', _count: { device_type: 63 } },
    ];

    (prisma.pageview.groupBy as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getDeviceTypeBreakdown(startDate, endDate);

    // Verify percentages sum to 100
    const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
    expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.01);

    expect(results[0].device_type).toBe('Desktop');
    expect(results[0].count).toBe(625);
    expect(results[0].percentage).toBeCloseTo(62.5, 1);
  });

  it('should throw DatabaseError on query failure', async () => {
    (prisma.pageview.groupBy as jest.Mock).mockRejectedValue(
      new Error('Connection failed')
    );

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await expect(
      getDeviceTypeBreakdown(startDate, endDate)
    ).rejects.toThrow(DatabaseError);
  });
});

describe('getBrowserBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return top 5 browsers with correct percentages', async () => {
    // Mock total count query
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ total: BigInt(1000) }])
      .mockResolvedValueOnce([
        { browser: 'Chrome 120', count: BigInt(400) },
        { browser: 'Safari 17', count: BigInt(250) },
        { browser: 'Firefox 121', count: BigInt(200) },
        { browser: 'Edge 120', count: BigInt(100) },
        { browser: 'Opera 105', count: BigInt(30) },
      ]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getBrowserBreakdown(startDate, endDate, 5);

    expect(results).toHaveLength(6); // Top 5 + "Other"
    expect(results[0]).toEqual({
      browser: 'Chrome 120',
      count: 400,
      percentage: 40,
    });
    expect(results[5]).toEqual({
      browser: 'Other',
      count: 20,
      percentage: 2,
    });

    // Verify percentages sum to 100
    const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
    expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.01);
  });

  it('should not include "Other" category when all browsers are in top N', async () => {
    // Mock total count query
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ total: BigInt(1000) }])
      .mockResolvedValueOnce([
        { browser: 'Chrome 120', count: BigInt(500) },
        { browser: 'Safari 17', count: BigInt(300) },
        { browser: 'Firefox 121', count: BigInt(200) },
      ]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getBrowserBreakdown(startDate, endDate, 5);

    expect(results).toHaveLength(3); // Only 3 browsers, no "Other"
    expect(results.find((r) => r.browser === 'Other')).toBeUndefined();
  });

  it('should handle empty results gracefully', async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ total: BigInt(0) }]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getBrowserBreakdown(startDate, endDate, 5);

    expect(results).toEqual([]);
  });

  it('should handle Unknown browser gracefully', async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ total: BigInt(500) }])
      .mockResolvedValueOnce([
        { browser: 'Chrome 120', count: BigInt(300) },
        { browser: 'Unknown', count: BigInt(150) },
        { browser: 'Safari 17', count: BigInt(50) },
      ]);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getBrowserBreakdown(startDate, endDate, 5);

    expect(results).toHaveLength(3);
    expect(results[1].browser).toBe('Unknown');
    expect(results[1].count).toBe(150);
    expect(results[1].percentage).toBe(30);
  });

  it('should throw DatabaseError on query failure', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error('Connection failed')
    );

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await expect(
      getBrowserBreakdown(startDate, endDate, 5)
    ).rejects.toThrow(DatabaseError);
  });
});
