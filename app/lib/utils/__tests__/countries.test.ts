import {
  getCountryName,
  transformCountryData,
  formatNumber,
  formatPercentage,
  CountryData,
} from '../countries';

describe('Country Utilities', () => {
  describe('getCountryName', () => {
    it('should convert valid country codes to display names', () => {
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('GB')).toBe('United Kingdom');
      expect(getCountryName('DE')).toBe('Germany');
      expect(getCountryName('CA')).toBe('Canada');
    });

    it('should handle lowercase country codes', () => {
      expect(getCountryName('us')).toBe('United States');
      expect(getCountryName('gb')).toBe('United Kingdom');
    });

    it('should return Unknown for null country codes', () => {
      expect(getCountryName(null)).toBe('Unknown');
    });

    it('should return Unknown for unrecognized country codes', () => {
      expect(getCountryName('XX')).toBe('Unknown');
      expect(getCountryName('ZZ')).toBe('Unknown');
    });
  });

  describe('transformCountryData', () => {
    it('should transform raw country data with accurate percentages', () => {
      const rawData: CountryData[] = [
        { country_code: 'US', count: 100 },
        { country_code: 'GB', count: 50 },
        { country_code: 'DE', count: 50 },
      ];

      const result = transformCountryData(rawData, 200);

      expect(result).toEqual([
        { countryCode: 'US', countryName: 'United States', pageviews: 100, percentage: 50 },
        { countryCode: 'GB', countryName: 'United Kingdom', pageviews: 50, percentage: 25 },
        { countryCode: 'DE', countryName: 'Germany', pageviews: 50, percentage: 25 },
      ]);

      // Verify percentages sum to 100
      const totalPercentage = result.reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPercentage).toBe(100);
    });

    it('should handle null country codes in transformation', () => {
      const rawData: CountryData[] = [
        { country_code: null, count: 50 },
        { country_code: 'US', count: 50 },
      ];

      const result = transformCountryData(rawData, 100);

      expect(result[0].countryName).toBe('Unknown');
      expect(result[0].countryCode).toBeNull();
      expect(result[0].percentage).toBe(50);
    });

    it('should return empty array for empty input data', () => {
      const result = transformCountryData([], 100);
      expect(result).toEqual([]);
    });

    it('should handle zero total pageviews without division by zero', () => {
      const rawData: CountryData[] = [
        { country_code: 'US', count: 0 },
      ];

      const result = transformCountryData(rawData, 0);

      expect(result[0].percentage).toBe(0);
      expect(result[0].pageviews).toBe(0);
    });

    it('should round percentages to 2 decimal places', () => {
      const rawData: CountryData[] = [
        { country_code: 'US', count: 100 },
        { country_code: 'GB', count: 33 },
      ];

      const result = transformCountryData(rawData, 133);

      // 100/133 = 75.18796992... should round to 75.19
      expect(result[0].percentage).toBe(75.19);
      // 33/133 = 24.81203007... should round to 24.81
      expect(result[1].percentage).toBe(24.81);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with locale-specific separators', () => {
      // Test that formatting adds separators (regardless of locale)
      const formatted = formatNumber(1234567);
      // Should contain digits 1, 2, 3, 4, 5, 6, 7
      expect(formatted).toMatch(/1.*2.*3.*4.*5.*6.*7/);
      // Should be different from plain number string (has separators)
      expect(formatted).not.toBe('1234567');

      // Smaller numbers
      expect(formatNumber(42)).toBe('42');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default 2 decimal places', () => {
      expect(formatPercentage(75.5)).toBe('75.50%');
      expect(formatPercentage(33.333)).toBe('33.33%');
    });

    it('should format percentage with custom decimal places', () => {
      expect(formatPercentage(100, 0)).toBe('100%');
      expect(formatPercentage(50.5, 1)).toBe('50.5%');
    });
  });
});
