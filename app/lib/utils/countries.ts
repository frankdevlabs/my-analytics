/**
 * Country Code Utilities
 *
 * Provides utilities for converting ISO 3166-1 alpha-2 country codes
 * to human-readable display names and transforming raw country data
 * for frontend consumption.
 */

/**
 * Raw country data from database query
 * Matches the return type of getPageviewsByCountry()
 */
export interface CountryData {
  country_code: string | null;
  count: number;
}

/**
 * Transformed country distribution data for frontend display
 */
export interface CountryDistribution {
  countryCode: string | null;
  countryName: string;
  pageviews: number;
  percentage: number;
}

/**
 * Mapping of ISO 3166-1 alpha-2 country codes to display names
 * Covers 70+ common countries for analytics purposes
 */
const COUNTRY_CODE_MAP: Record<string, string> = {
  // North America
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',

  // Europe
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PT: 'Portugal',
  PL: 'Poland',
  CZ: 'Czech Republic',
  GR: 'Greece',
  RO: 'Romania',
  HU: 'Hungary',

  // Asia
  CN: 'China',
  JP: 'Japan',
  IN: 'India',
  KR: 'South Korea',
  SG: 'Singapore',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  MY: 'Malaysia',
  PH: 'Philippines',
  PK: 'Pakistan',
  BD: 'Bangladesh',

  // Oceania
  AU: 'Australia',
  NZ: 'New Zealand',

  // South America
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  VE: 'Venezuela',

  // Middle East
  IL: 'Israel',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  TR: 'Turkey',

  // Africa
  ZA: 'South Africa',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
};

/**
 * Convert ISO country code to human-readable display name
 * @param countryCode - ISO 3166-1 alpha-2 country code (2 characters)
 * @returns Display name for the country or "Unknown" if not found
 *
 * @example
 * getCountryName('US') // Returns 'United States'
 * getCountryName('gb') // Returns 'United Kingdom' (case-insensitive)
 * getCountryName(null) // Returns 'Unknown'
 * getCountryName('XX') // Returns 'Unknown'
 */
export function getCountryName(countryCode: string | null): string {
  if (!countryCode) {
    return 'Unknown';
  }

  // Convert to uppercase for case-insensitive lookup
  const code = countryCode.toUpperCase();
  return COUNTRY_CODE_MAP[code] || 'Unknown';
}

/**
 * Transform raw country data from database query to frontend-ready format
 * Converts country codes to names, calculates percentages, and formats data
 *
 * @param data - Raw country data from getPageviewsByCountry()
 * @param totalPageviews - Total pageviews for percentage calculation
 * @returns Array of transformed country distribution data
 *
 * @example
 * const rawData = [
 *   { country_code: 'US', count: 100 },
 *   { country_code: 'GB', count: 50 }
 * ];
 * transformCountryData(rawData, 150);
 * // Returns:
 * // [
 * //   { countryCode: 'US', countryName: 'United States', pageviews: 100, percentage: 66.67 },
 * //   { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 50, percentage: 33.33 }
 * // ]
 */
export function transformCountryData(
  data: CountryData[],
  totalPageviews: number
): CountryDistribution[] {
  // Handle empty data
  if (!data || data.length === 0) {
    return [];
  }

  // Handle zero total (prevent division by zero)
  if (totalPageviews === 0) {
    return data.map(item => ({
      countryCode: item.country_code,
      countryName: getCountryName(item.country_code),
      pageviews: item.count,
      percentage: 0,
    }));
  }

  // Transform data with percentage calculation
  return data.map(item => {
    const pageviews = item.count;
    const percentage = (pageviews / totalPageviews) * 100;

    return {
      countryCode: item.country_code,
      countryName: getCountryName(item.country_code),
      pageviews,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    };
  });
}

/**
 * Format a number with thousands separators
 * @param value - Number to format
 * @returns Formatted string with commas
 *
 * @example
 * formatNumber(1234567) // Returns '1,234,567'
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format a percentage with specified decimal places
 * @param value - Percentage value (e.g., 66.67 for 66.67%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with % symbol
 *
 * @example
 * formatPercentage(66.67) // Returns '66.67%'
 * formatPercentage(50, 1) // Returns '50.0%'
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}
