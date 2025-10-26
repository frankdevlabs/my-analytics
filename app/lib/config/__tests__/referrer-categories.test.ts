import {
  CATEGORY_DIRECT,
  CATEGORY_SEARCH,
  CATEGORY_SOCIAL,
  CATEGORY_EXTERNAL,
  extractDomainFromUrl,
  getCategoryFromDomain,
} from '../referrer-categories';

describe('Referrer Categories Configuration', () => {
  describe('extractDomainFromUrl', () => {
    it('should extract domain from http URL', () => {
      const result = extractDomainFromUrl('http://example.com/path');
      expect(result).toBe('example.com');
    });

    it('should extract domain from https URL', () => {
      const result = extractDomainFromUrl('https://example.com/path?query=value');
      expect(result).toBe('example.com');
    });

    it('should remove www. prefix for consistency', () => {
      const result = extractDomainFromUrl('https://www.example.com/page');
      expect(result).toBe('example.com');
    });

    it('should handle URLs with paths and query parameters', () => {
      const result = extractDomainFromUrl('https://www.google.com/search?q=test&source=hp');
      expect(result).toBe('google.com');
    });

    it('should return null for null input', () => {
      const result = extractDomainFromUrl(null);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = extractDomainFromUrl('');
      expect(result).toBeNull();
    });

    it('should return null for malformed URL', () => {
      const result = extractDomainFromUrl('not-a-valid-url');
      expect(result).toBeNull();
    });
  });

  describe('getCategoryFromDomain', () => {
    it('should categorize search engine domains as Search', () => {
      expect(getCategoryFromDomain('google.com')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('bing.com')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('duckduckgo.com')).toBe(CATEGORY_SEARCH);
    });

    it('should categorize social network domains as Social', () => {
      expect(getCategoryFromDomain('facebook.com')).toBe(CATEGORY_SOCIAL);
      expect(getCategoryFromDomain('twitter.com')).toBe(CATEGORY_SOCIAL);
      expect(getCategoryFromDomain('linkedin.com')).toBe(CATEGORY_SOCIAL);
    });

    it('should categorize unknown domains as External', () => {
      expect(getCategoryFromDomain('example.com')).toBe(CATEGORY_EXTERNAL);
      expect(getCategoryFromDomain('myblog.net')).toBe(CATEGORY_EXTERNAL);
    });

    it('should return Direct for null domain', () => {
      expect(getCategoryFromDomain(null)).toBe(CATEGORY_DIRECT);
    });

    it('should return Direct for empty string', () => {
      expect(getCategoryFromDomain('')).toBe(CATEGORY_DIRECT);
    });

    it('should handle subdomains using includes matching', () => {
      expect(getCategoryFromDomain('www.google.com')).toBe(CATEGORY_SEARCH);
      expect(getCategoryFromDomain('m.facebook.com')).toBe(CATEGORY_SOCIAL);
    });
  });
});
