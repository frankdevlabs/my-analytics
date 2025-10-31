/**
 * Tests for referrer categorization with internal domain detection
 */

import {
  extractDomainFromUrl,
  getCategoryFromDomain,
  CATEGORY_DIRECT,
  CATEGORY_EXTERNAL,
  CATEGORY_SEARCH,
  CATEGORY_SOCIAL,
} from '../referrer-categories';

describe('extractDomainFromUrl', () => {
  it('should extract domain from URL', () => {
    expect(extractDomainFromUrl('https://example.com/page')).toBe('example.com');
  });

  it('should remove www prefix', () => {
    expect(extractDomainFromUrl('https://www.example.com/page')).toBe('example.com');
  });

  it('should return null for empty URLs', () => {
    expect(extractDomainFromUrl('')).toBeNull();
    expect(extractDomainFromUrl(null)).toBeNull();
  });

  it('should handle malformed URLs', () => {
    expect(extractDomainFromUrl('not-a-url')).toBeNull();
  });
});

describe('getCategoryFromDomain with internal domain detection', () => {
  describe('Internal domain detection', () => {
    it('should categorize same domain as Direct', () => {
      const category = getCategoryFromDomain('franksblog.nl', 'franksblog.nl');
      expect(category).toBe(CATEGORY_DIRECT);
    });

    it('should handle www prefix on referrer domain', () => {
      const category = getCategoryFromDomain('www.franksblog.nl', 'franksblog.nl');
      expect(category).toBe(CATEGORY_DIRECT);
    });

    it('should handle www prefix on site hostname', () => {
      const category = getCategoryFromDomain('franksblog.nl', 'www.franksblog.nl');
      expect(category).toBe(CATEGORY_DIRECT);
    });

    it('should handle www on both domains', () => {
      const category = getCategoryFromDomain('www.franksblog.nl', 'www.franksblog.nl');
      expect(category).toBe(CATEGORY_DIRECT);
    });

    it('should be case-insensitive', () => {
      const category = getCategoryFromDomain('FranksBlog.nl', 'franksblog.nl');
      expect(category).toBe(CATEGORY_DIRECT);
    });

    it('should still categorize external domains as External', () => {
      const category = getCategoryFromDomain('example.com', 'franksblog.nl');
      expect(category).toBe(CATEGORY_EXTERNAL);
    });

    it('should still categorize search engines as Search', () => {
      const category = getCategoryFromDomain('google.com', 'franksblog.nl');
      expect(category).toBe(CATEGORY_SEARCH);
    });

    it('should still categorize social networks as Social', () => {
      const category = getCategoryFromDomain('facebook.com', 'franksblog.nl');
      expect(category).toBe(CATEGORY_SOCIAL);
    });

    it('should handle whitespace in domains', () => {
      const category = getCategoryFromDomain(' franksblog.nl ', ' franksblog.nl ');
      expect(category).toBe(CATEGORY_DIRECT);
    });
  });

  describe('Backward compatibility (no site hostname provided)', () => {
    it('should work without siteHostname parameter', () => {
      expect(getCategoryFromDomain('google.com')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('facebook.com')).toBe(CATEGORY_SOCIAL);
      expect(getCategoryFromDomain('example.com')).toBe(CATEGORY_EXTERNAL);
      expect(getCategoryFromDomain(null)).toBe(CATEGORY_DIRECT);
    });

    it('should treat internal domain as External when no hostname provided', () => {
      // Without site hostname, we can't detect internal referrers
      const category = getCategoryFromDomain('franksblog.nl');
      expect(category).toBe(CATEGORY_EXTERNAL);
    });
  });

  describe('Standard categorization', () => {
    it('should categorize null domains as Direct', () => {
      expect(getCategoryFromDomain(null, 'franksblog.nl')).toBe(CATEGORY_DIRECT);
      expect(getCategoryFromDomain('', 'franksblog.nl')).toBe(CATEGORY_DIRECT);
    });

    it('should categorize search engines', () => {
      expect(getCategoryFromDomain('google.com', 'franksblog.nl')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('bing.com', 'franksblog.nl')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('duckduckgo.com', 'franksblog.nl')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('yahoo.com', 'franksblog.nl')).toBe(CATEGORY_SEARCH);
    });

    it('should categorize social networks', () => {
      expect(getCategoryFromDomain('facebook.com', 'franksblog.nl')).toBe(CATEGORY_SOCIAL);
      expect(getCategoryFromDomain('twitter.com', 'franksblog.nl')).toBe(CATEGORY_SOCIAL);
      expect(getCategoryFromDomain('linkedin.com', 'franksblog.nl')).toBe(CATEGORY_SOCIAL);
      expect(getCategoryFromDomain('reddit.com', 'franksblog.nl')).toBe(CATEGORY_SOCIAL);
    });

    it('should categorize unknown domains as External', () => {
      expect(getCategoryFromDomain('example.com', 'franksblog.nl')).toBe(CATEGORY_EXTERNAL);
      expect(getCategoryFromDomain('unknown-site.org', 'franksblog.nl')).toBe(CATEGORY_EXTERNAL);
    });
  });
});
