/**
 * Tests for Referrer Data Backfill Script
 *
 * Focused tests for domain extraction and category computation logic
 * Does NOT test full migration execution (too slow for CI)
 */

import { extractDomainFromUrl, getCategoryFromDomain } from '../../../lib/config/referrer-categories';

describe('Backfill Referrer Data - Domain Extraction', () => {
  it('should extract domain from various referrer URL formats', () => {
    // HTTP and HTTPS
    expect(extractDomainFromUrl('https://google.com/search?q=test')).toBe('google.com');
    expect(extractDomainFromUrl('http://facebook.com/page')).toBe('facebook.com');

    // With www prefix (should be removed)
    expect(extractDomainFromUrl('https://www.twitter.com/user')).toBe('twitter.com');
    expect(extractDomainFromUrl('http://www.example.com/path')).toBe('example.com');

    // With paths and query strings
    expect(extractDomainFromUrl('https://linkedin.com/in/profile?ref=123')).toBe('linkedin.com');
    expect(extractDomainFromUrl('https://youtube.com/watch?v=abc123')).toBe('youtube.com');

    // Subdomains
    expect(extractDomainFromUrl('https://mail.google.com/mail')).toBe('mail.google.com');
    expect(extractDomainFromUrl('https://subdomain.example.com')).toBe('subdomain.example.com');
  });

  it('should handle null and empty referrers', () => {
    expect(extractDomainFromUrl(null)).toBeNull();
    expect(extractDomainFromUrl('')).toBeNull();
    expect(extractDomainFromUrl('   ')).toBeNull();
  });

  it('should handle malformed URLs gracefully', () => {
    // These should return null when URL parsing fails
    expect(extractDomainFromUrl('not-a-url')).toBeNull();
    expect(extractDomainFromUrl('://missing-protocol.com')).toBeNull();
  });
});

describe('Backfill Referrer Data - Category Computation', () => {
  it('should categorize search engine domains as Search', () => {
    expect(getCategoryFromDomain('google.com')).toBe('Search');
    expect(getCategoryFromDomain('bing.com')).toBe('Search');
    expect(getCategoryFromDomain('duckduckgo.com')).toBe('Search');
    expect(getCategoryFromDomain('yahoo.com')).toBe('Search');

    // With subdomains
    expect(getCategoryFromDomain('www.google.com')).toBe('Search');
    expect(getCategoryFromDomain('mail.google.com')).toBe('Search');
  });

  it('should categorize social network domains as Social', () => {
    expect(getCategoryFromDomain('facebook.com')).toBe('Social');
    expect(getCategoryFromDomain('twitter.com')).toBe('Social');
    expect(getCategoryFromDomain('linkedin.com')).toBe('Social');
    expect(getCategoryFromDomain('instagram.com')).toBe('Social');
    expect(getCategoryFromDomain('reddit.com')).toBe('Social');

    // With subdomains
    expect(getCategoryFromDomain('www.facebook.com')).toBe('Social');
    expect(getCategoryFromDomain('m.twitter.com')).toBe('Social');
  });

  it('should categorize unknown domains as External', () => {
    expect(getCategoryFromDomain('example.com')).toBe('External');
    expect(getCategoryFromDomain('news.bbc.co.uk')).toBe('External');
    expect(getCategoryFromDomain('my-website.io')).toBe('External');
  });

  it('should categorize null/empty domains as Direct', () => {
    expect(getCategoryFromDomain(null)).toBe('Direct');
    expect(getCategoryFromDomain('')).toBe('Direct');
    expect(getCategoryFromDomain('   ')).toBe('Direct');
  });
});

describe('Backfill Referrer Data - Integration', () => {
  it('should correctly process pageviews with various referrer types', () => {
    // Sample pageviews to process
    const samplePageviews = [
      { document_referrer: 'https://google.com/search?q=analytics' },
      { document_referrer: 'https://www.facebook.com/share' },
      { document_referrer: 'https://example.com/article' },
      { document_referrer: null },
      { document_referrer: '' },
    ];

    const results = samplePageviews.map((pv) => {
      const domain = extractDomainFromUrl(pv.document_referrer);
      const category = getCategoryFromDomain(domain);
      return { domain, category };
    });

    expect(results[0]).toEqual({ domain: 'google.com', category: 'Search' });
    expect(results[1]).toEqual({ domain: 'facebook.com', category: 'Social' });
    expect(results[2]).toEqual({ domain: 'example.com', category: 'External' });
    expect(results[3]).toEqual({ domain: null, category: 'Direct' });
    expect(results[4]).toEqual({ domain: null, category: 'Direct' });
  });

  it('should handle batch processing with mixed referrer types', () => {
    // Simulating a batch of 10 pageviews
    const batch = [
      'https://google.com/search',
      'https://twitter.com/status',
      null,
      'https://news.example.com',
      'malformed-url',
      'https://www.bing.com/results',
      'https://linkedin.com/in/profile',
      '',
      'https://reddit.com/r/programming',
      'https://another-site.org',
    ];

    const processed = batch.map((referrer) => {
      const domain = extractDomainFromUrl(referrer);
      const category = getCategoryFromDomain(domain);
      return { referrer, domain, category };
    });

    // Verify correct categorization
    expect(processed[0].category).toBe('Search'); // google
    expect(processed[1].category).toBe('Social'); // twitter
    expect(processed[2].category).toBe('Direct'); // null
    expect(processed[3].category).toBe('External'); // news.example.com
    expect(processed[4].category).toBe('Direct'); // malformed
    expect(processed[5].category).toBe('Search'); // bing
    expect(processed[6].category).toBe('Social'); // linkedin
    expect(processed[7].category).toBe('Direct'); // empty
    expect(processed[8].category).toBe('Social'); // reddit
    expect(processed[9].category).toBe('External'); // another-site.org

    // Verify all were processed without errors
    expect(processed).toHaveLength(10);
  });
});
