/**
 * Referrer Categorization Configuration
 * Manages categorization of referrer sources into Direct, Search, Social, and External
 */

// Category constants
export const CATEGORY_DIRECT = 'Direct';
export const CATEGORY_SEARCH = 'Search';
export const CATEGORY_SOCIAL = 'Social';
export const CATEGORY_EXTERNAL = 'External';

// Known search engines
export const SEARCH_ENGINES = [
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'baidu.com',
  'yandex.com',
];

// Known social networks
export const SOCIAL_NETWORKS = [
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'pinterest.com',
  'reddit.com',
  'tiktok.com',
  'youtube.com',
];

/**
 * Extract domain from a URL string
 * Removes www. prefix for consistency and handles malformed URLs gracefully
 * @param {string | null} url - The URL to extract domain from
 * @returns {string | null} Extracted domain without www. prefix, or null if invalid
 */
export function extractDomainFromUrl(url: string | null): string | null {
  // Handle null or empty URLs
  if (!url || url.trim() === '') {
    return null;
  }

  try {
    // Parse the URL
    const urlObject = new URL(url);
    let hostname = urlObject.hostname;

    // Remove www. prefix for consistency
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch {
    // Handle malformed URLs gracefully
    return null;
  }
}

/**
 * Determine the category for a given domain
 * Categorizes domains as Direct, Search, Social, or External
 * @param {string | null} domain - The domain to categorize
 * @returns {string} Category constant (CATEGORY_DIRECT, CATEGORY_SEARCH, CATEGORY_SOCIAL, or CATEGORY_EXTERNAL)
 */
export function getCategoryFromDomain(domain: string | null): string {
  // Return Direct for null or empty domains
  if (!domain || domain.trim() === '') {
    return CATEGORY_DIRECT;
  }

  // Check if domain matches search engines (using includes to handle subdomains)
  for (const searchEngine of SEARCH_ENGINES) {
    if (domain.includes(searchEngine)) {
      return CATEGORY_SEARCH;
    }
  }

  // Check if domain matches social networks
  for (const socialNetwork of SOCIAL_NETWORKS) {
    if (domain.includes(socialNetwork)) {
      return CATEGORY_SOCIAL;
    }
  }

  // Default to External for all other domains
  return CATEGORY_EXTERNAL;
}
