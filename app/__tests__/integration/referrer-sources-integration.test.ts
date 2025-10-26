/**
 * Integration Tests for Referrer Sources Feature
 * Task Group 7.3: Strategic integration tests for end-to-end workflows and critical edge cases
 *
 * These tests cover:
 * - Full user workflow from dashboard data fetching to modal drill-down
 * - Date range filtering integration
 * - Edge cases: null referrers, malformed URLs, empty states
 * - Large dataset handling
 */

import {
  getReferrersByCategory,
  getReferrersByDomain,
  getReferrerUrlsByDomain,
} from 'lib/db/pageviews';
import { prisma } from 'lib/db/prisma';
import { extractDomainFromUrl, getCategoryFromDomain } from 'lib/config/referrer-categories';

// Mock the Prisma client
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    pageview: {
      groupBy: jest.fn(),
    },
  },
}));

describe('Referrer Sources Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integration Test: Full Dashboard to Modal Workflow', () => {
    it('should fetch category data, then domain data, then drill down to URLs for a specific domain', async () => {
      // Step 1: Dashboard loads and fetches category data
      const mockCategoryData = [
        { referrer_category: 'Direct', pageviews: BigInt(1000) },
        { referrer_category: 'Search', pageviews: BigInt(500) },
        { referrer_category: 'Social', pageviews: BigInt(300) },
        { referrer_category: 'External', pageviews: BigInt(200) },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockCategoryData);

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const categories = await getReferrersByCategory(startDate, endDate);

      expect(categories).toEqual([
        { category: 'Direct', pageviews: 1000 },
        { category: 'Search', pageviews: 500 },
        { category: 'Social', pageviews: 300 },
        { category: 'External', pageviews: 200 },
      ]);

      // Step 2: Dashboard fetches domain data
      const mockDomainData = [
        { referrer_domain: 'google.com', referrer_category: 'Search', pageviews: BigInt(400) },
        { referrer_domain: 'facebook.com', referrer_category: 'Social', pageviews: BigInt(250) },
        { referrer_domain: 'example.com', referrer_category: 'External', pageviews: BigInt(150) },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockDomainData);

      const domains = await getReferrersByDomain(startDate, endDate, 50);

      expect(domains).toEqual([
        { domain: 'google.com', category: 'Search', pageviews: 400 },
        { domain: 'facebook.com', category: 'Social', pageviews: 250 },
        { domain: 'example.com', category: 'External', pageviews: 150 },
      ]);

      // Step 3: User clicks on google.com domain row -> modal opens and fetches URLs
      const mockUrlData = [
        { document_referrer: 'https://google.com/search?q=analytics', pageviews: BigInt(200) },
        { document_referrer: 'https://google.com/search?q=tracking', pageviews: BigInt(150) },
        { document_referrer: 'https://google.com/', pageviews: BigInt(50) },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockUrlData);

      const urls = await getReferrerUrlsByDomain('google.com', startDate, endDate, 100);

      expect(urls).toEqual([
        { url: 'https://google.com/search?q=analytics', pageviews: 200 },
        { url: 'https://google.com/search?q=tracking', pageviews: 150 },
        { url: 'https://google.com/', pageviews: 50 },
      ]);

      // Verify all three queries were called with correct parameters
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Test: Date Range Change Updates Data', () => {
    it('should return different results when date range changes', async () => {
      // Initial date range: October 2025
      const october = {
        start: new Date('2025-10-01'),
        end: new Date('2025-10-31'),
      };

      const mockOctoberData = [
        { referrer_category: 'Search', pageviews: BigInt(500) },
        { referrer_category: 'Direct', pageviews: BigInt(300) },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockOctoberData);

      const octoberResults = await getReferrersByCategory(october.start, october.end);

      expect(octoberResults).toHaveLength(2);
      expect(octoberResults[0].pageviews).toBe(500);

      // New date range: November 2025
      const november = {
        start: new Date('2025-11-01'),
        end: new Date('2025-11-30'),
      };

      const mockNovemberData = [
        { referrer_category: 'Search', pageviews: BigInt(800) },
        { referrer_category: 'Social', pageviews: BigInt(400) },
        { referrer_category: 'Direct', pageviews: BigInt(200) },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockNovemberData);

      const novemberResults = await getReferrersByCategory(november.start, november.end);

      expect(novemberResults).toHaveLength(3);
      expect(novemberResults[0].pageviews).toBe(800);

      // Verify both queries used correct date parameters
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      const firstCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
      const secondCall = (prisma.$queryRaw as jest.Mock).mock.calls[1];

      expect(firstCall).toContain(october.start);
      expect(firstCall).toContain(october.end);
      expect(secondCall).toContain(november.start);
      expect(secondCall).toContain(november.end);
    });
  });

  describe('Edge Case: All Direct Traffic (No Referrers)', () => {
    it('should handle scenario where all pageviews have null referrers', async () => {
      const mockAllDirectData = [
        { referrer_category: 'Direct', pageviews: BigInt(2000) },
      ];
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockAllDirectData);

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const results = await getReferrersByCategory(startDate, endDate);

      expect(results).toEqual([
        { category: 'Direct', pageviews: 2000 },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Direct');
    });

    it('should return empty array for domains when all traffic is direct', async () => {
      // When all referrers are null, getReferrersByDomain should return no domains
      // because the query filters WHERE referrer_domain IS NOT NULL
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const results = await getReferrersByDomain(startDate, endDate, 50);

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Edge Case: Null/Empty document_referrer Handling', () => {
    it('should extract null domain from null referrer URL', () => {
      const domain = extractDomainFromUrl(null);
      expect(domain).toBeNull();
    });

    it('should extract null domain from empty referrer URL', () => {
      const domain = extractDomainFromUrl('');
      expect(domain).toBeNull();
    });

    it('should categorize null domain as Direct', () => {
      const category = getCategoryFromDomain(null);
      expect(category).toBe('Direct');
    });

    it('should handle query results with only null referrers', async () => {
      // Simulating backfill script processing pageviews with null referrers
      const pageviewsWithNullReferrers = [
        { document_referrer: null },
        { document_referrer: '' },
        { document_referrer: undefined },
      ];

      const processed = pageviewsWithNullReferrers.map((pv) => {
        const domain = extractDomainFromUrl(pv.document_referrer as string | null);
        const category = getCategoryFromDomain(domain);
        return { domain, category };
      });

      // All should be categorized as Direct with null domain
      expect(processed).toEqual([
        { domain: null, category: 'Direct' },
        { domain: null, category: 'Direct' },
        { domain: null, category: 'Direct' },
      ]);
    });
  });

  describe('Edge Case: Malformed URLs in document_referrer', () => {
    it('should handle malformed URLs gracefully during extraction', () => {
      // Test URLs that cannot be parsed or result in null/empty domains
      const malformedUrls = [
        'not-a-url',
        '://missing-protocol',
        '   ', // Only whitespace
      ];

      malformedUrls.forEach((url) => {
        const domain = extractDomainFromUrl(url);
        // extractDomainFromUrl returns null for these malformed URLs
        expect(domain).toBeNull();
      });
    });

    it('should categorize extracted null domains from malformed URLs as Direct', () => {
      const malformedUrl = 'not-a-valid-url';
      const domain = extractDomainFromUrl(malformedUrl);
      const category = getCategoryFromDomain(domain);

      expect(domain).toBeNull();
      expect(category).toBe('Direct');
    });

    it('should process batch with mix of valid and malformed URLs', () => {
      const mixedBatch = [
        'https://google.com/search',
        'malformed-url',
        'https://facebook.com/share',
        '://no-protocol',
        'https://example.com/page',
        '',
      ];

      const processed = mixedBatch.map((referrer) => {
        const domain = extractDomainFromUrl(referrer);
        const category = getCategoryFromDomain(domain);
        return { referrer, domain, category, isValid: domain !== null };
      });

      // Should process all without errors
      expect(processed).toHaveLength(6);
      expect(processed.filter((p) => p.isValid)).toHaveLength(3);
      expect(processed.filter((p) => !p.isValid)).toHaveLength(3);

      // Valid URLs should have correct categories
      expect(processed[0].category).toBe('Search');
      expect(processed[2].category).toBe('Social');
      expect(processed[4].category).toBe('External');

      // Invalid URLs should be categorized as Direct
      expect(processed[1].category).toBe('Direct');
      expect(processed[3].category).toBe('Direct');
      expect(processed[5].category).toBe('Direct');
    });

    it('should handle unusual but technically parseable URLs appropriately', () => {
      // Test URLs with empty/unusual hostnames - these return null or empty string
      const jsUrl = 'javascript:void(0)';
      const jsDomain = extractDomainFromUrl(jsUrl);
      // javascript: URLs have empty hostname, which should be treated as null/Direct
      expect(jsDomain === null || jsDomain === '').toBe(true);
      expect(getCategoryFromDomain(jsDomain)).toBe('Direct');

      // Data URLs also have empty hostname
      const dataUrl = 'data:text/html,<h1>Test</h1>';
      const dataDomain = extractDomainFromUrl(dataUrl);
      expect(dataDomain === null || dataDomain === '').toBe(true);
      expect(getCategoryFromDomain(dataDomain)).toBe('Direct');

      // FTP protocol with valid domain should work normally
      const ftpUrl = 'ftp://example.com/file.txt';
      const ftpDomain = extractDomainFromUrl(ftpUrl);
      expect(ftpDomain).toBe('example.com');
      // example.com is not a search engine or social network, so it's External
      expect(getCategoryFromDomain(ftpDomain)).toBe('External');
    });
  });

  describe('Edge Case: Domain with 100+ URLs', () => {
    it('should respect limit parameter when fetching URLs for high-traffic domain', async () => {
      // Simulate a domain with many URLs (e.g., google.com)
      const mockManyUrls = Array.from({ length: 150 }, (_, i) => ({
        document_referrer: `https://google.com/search?q=query${i + 1}`,
        pageviews: BigInt(100 - i),
      }));

      // Mock should only return 100 results due to LIMIT clause
      const mockLimitedResults = mockManyUrls.slice(0, 100);
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockLimitedResults);

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');
      const limit = 100;

      const results = await getReferrerUrlsByDomain('google.com', startDate, endDate, limit);

      // Should return exactly 100 URLs (respecting limit)
      expect(results).toHaveLength(100);
      expect(results[0].url).toBe('https://google.com/search?q=query1');
      expect(results[99].url).toBe('https://google.com/search?q=query100');

      // Verify limit was passed to query
      const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
      expect(queryCall).toContain(limit);
    });

    it('should handle custom limit for pagination', async () => {
      const mockResults = Array.from({ length: 25 }, (_, i) => ({
        document_referrer: `https://example.com/page${i + 1}`,
        pageviews: BigInt(50 - i),
      }));

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockResults);

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');
      const customLimit = 25;

      const results = await getReferrerUrlsByDomain('example.com', startDate, endDate, customLimit);

      expect(results).toHaveLength(25);

      // Verify custom limit was used
      const queryCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
      expect(queryCall).toContain(customLimit);
    });
  });

  describe('Edge Case: Empty Results for Date Range', () => {
    it('should return empty arrays when no pageviews exist in date range', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const categories = await getReferrersByCategory(startDate, endDate);
      expect(categories).toEqual([]);

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
      const domains = await getReferrersByDomain(startDate, endDate, 50);
      expect(domains).toEqual([]);

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
      const urls = await getReferrerUrlsByDomain('google.com', startDate, endDate, 100);
      expect(urls).toEqual([]);
    });
  });

  describe('Integration: Category and Domain Consistency', () => {
    it('should ensure domain categories match getCategoryFromDomain logic', async () => {
      const mockDomainData = [
        { referrer_domain: 'google.com', referrer_category: 'Search', pageviews: BigInt(500) },
        { referrer_domain: 'facebook.com', referrer_category: 'Social', pageviews: BigInt(300) },
        { referrer_domain: 'example.com', referrer_category: 'External', pageviews: BigInt(200) },
        { referrer_domain: 'bing.com', referrer_category: 'Search', pageviews: BigInt(150) },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockDomainData);

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const results = await getReferrersByDomain(startDate, endDate, 50);

      // Verify each domain's category matches what getCategoryFromDomain would return
      results.forEach((result) => {
        const expectedCategory = getCategoryFromDomain(result.domain);
        expect(result.category).toBe(expectedCategory);
      });
    });
  });
});
