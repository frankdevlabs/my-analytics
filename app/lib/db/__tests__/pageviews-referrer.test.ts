/**
 * Tests for referrer query functions
 * Task Group 3.1: Tests for getReferrersByCategory, getReferrersByDomain, and getReferrerUrlsByDomain
 */

import {
  getReferrersByCategory,
  getReferrersByDomain,
  getReferrerUrlsByDomain
} from '../pageviews';
import { prisma } from '../prisma';

// Mock Prisma to avoid actual database calls during unit testing
jest.mock('../prisma', () => ({
  prisma: {
    pageview: {
      groupBy: jest.fn()
    },
    $queryRaw: jest.fn()
  }
}));

describe('getReferrersByCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return aggregated counts by category', async () => {
    const mockResults = [
      { referrer_category: 'Direct', pageviews: BigInt(100) },
      { referrer_category: 'Search', pageviews: BigInt(50) },
      { referrer_category: 'Social', pageviews: BigInt(30) },
      { referrer_category: 'External', pageviews: BigInt(20) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getReferrersByCategory(startDate, endDate);

    expect(results).toEqual([
      { category: 'Direct', pageviews: 100 },
      { category: 'Search', pageviews: 50 },
      { category: 'Social', pageviews: 30 },
      { category: 'External', pageviews: 20 }
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('should filter by date range', async () => {
    const mockResults = [
      { referrer_category: 'Direct', pageviews: BigInt(50) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await getReferrersByCategory(startDate, endDate);

    // Verify the query was called with date parameters
    expect(prisma.$queryRaw).toHaveBeenCalled();
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    expect(queryCall).toContain(startDate);
    expect(queryCall).toContain(endDate);
  });

  it('should exclude bot traffic', async () => {
    const mockResults = [
      { referrer_category: 'Direct', pageviews: BigInt(100) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await getReferrersByCategory(startDate, endDate);

    // Verify that the SQL query includes is_bot = false filter
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const queryString = queryCall[0].join('');
    expect(queryString).toContain('is_bot = false');
  });

  it('should convert BigInt to Number', async () => {
    const mockResults = [
      { referrer_category: 'Search', pageviews: BigInt(999999) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getReferrersByCategory(startDate, endDate);

    expect(typeof results[0].pageviews).toBe('number');
    expect(results[0].pageviews).toBe(999999);
  });
});

describe('getReferrersByDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return top domains with categories', async () => {
    const mockResults = [
      { referrer_domain: 'google.com', referrer_category: 'Search', pageviews: BigInt(100) },
      { referrer_domain: 'facebook.com', referrer_category: 'Social', pageviews: BigInt(50) },
      { referrer_domain: 'example.com', referrer_category: 'External', pageviews: BigInt(30) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getReferrersByDomain(startDate, endDate, 50);

    expect(results).toEqual([
      { domain: 'google.com', category: 'Search', pageviews: 100 },
      { domain: 'facebook.com', category: 'Social', pageviews: 50 },
      { domain: 'example.com', category: 'External', pageviews: 30 }
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('should filter by date range and exclude bots', async () => {
    const mockResults = [
      { referrer_domain: 'google.com', referrer_category: 'Search', pageviews: BigInt(100) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await getReferrersByDomain(startDate, endDate);

    // Verify the query includes date range and bot exclusion
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const queryString = queryCall[0].join('');
    expect(queryString).toContain('is_bot = false');
    expect(queryString).toContain('referrer_domain IS NOT NULL');
  });

  it('should exclude null domains', async () => {
    const mockResults = [
      { referrer_domain: 'google.com', referrer_category: 'Search', pageviews: BigInt(50) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await getReferrersByDomain(startDate, endDate);

    // Verify that the SQL query excludes null domains
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const queryString = queryCall[0].join('');
    expect(queryString).toContain('referrer_domain IS NOT NULL');
  });

  it('should respect limit parameter', async () => {
    const mockResults = [
      { referrer_domain: 'google.com', referrer_category: 'Search', pageviews: BigInt(100) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');
    const limit = 10;

    await getReferrersByDomain(startDate, endDate, limit);

    // Verify the query includes the limit
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    expect(queryCall).toContain(limit);
  });
});

describe('getReferrerUrlsByDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return URLs filtered by domain', async () => {
    const mockResults = [
      { document_referrer: 'https://google.com/search?q=test', pageviews: BigInt(50) },
      { document_referrer: 'https://google.com/search?q=analytics', pageviews: BigInt(30) },
      { document_referrer: 'https://google.com/', pageviews: BigInt(20) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const domain = 'google.com';
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getReferrerUrlsByDomain(domain, startDate, endDate, 100);

    expect(results).toEqual([
      { url: 'https://google.com/search?q=test', pageviews: 50 },
      { url: 'https://google.com/search?q=analytics', pageviews: 30 },
      { url: 'https://google.com/', pageviews: 20 }
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('should filter by domain, date range, and exclude bots', async () => {
    const mockResults = [
      { document_referrer: 'https://example.com/page', pageviews: BigInt(10) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const domain = 'example.com';
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    await getReferrerUrlsByDomain(domain, startDate, endDate);

    // Verify the query filters correctly
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const queryString = queryCall[0].join('');
    expect(queryString).toContain('is_bot = false');
    expect(queryString).toContain('referrer_domain');
  });

  it('should convert BigInt to Number', async () => {
    const mockResults = [
      { document_referrer: 'https://google.com/search', pageviews: BigInt(12345) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const domain = 'google.com';
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const results = await getReferrerUrlsByDomain(domain, startDate, endDate);

    expect(typeof results[0].pageviews).toBe('number');
    expect(results[0].pageviews).toBe(12345);
  });

  it('should respect limit parameter', async () => {
    const mockResults = [
      { document_referrer: 'https://google.com/', pageviews: BigInt(100) }
    ];

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

    const domain = 'google.com';
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');
    const limit = 25;

    await getReferrerUrlsByDomain(domain, startDate, endDate, limit);

    // Verify the query includes the limit
    const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    expect(queryCall).toContain(limit);
  });
});
