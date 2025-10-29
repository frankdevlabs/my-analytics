/**
 * Tests for MappedPageview Type Extraction (Task Group 6)
 *
 * Verifies proper type extraction from MappedPageviewWithMeta
 */

import { mapCsvRowToPageview, MappedPageview, MappedPageviewWithMeta } from '../../lib/import/field-mapper';

describe('MappedPageview Type Extraction', () => {
  describe('Type extraction from MappedPageviewWithMeta', () => {
    test('extracting MappedPageview from mapped.data', () => {
      const csvRow = {
        uuid: '',
        added_iso: '2025-10-25T10:00:00.000Z',
        path: '/test',
        duration_seconds: '10',
        is_unique: 'true',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
      };

      const mapped: MappedPageviewWithMeta = mapCsvRowToPageview(csvRow);
      const pageview: MappedPageview = mapped.data;

      expect(pageview).toBeDefined();
      expect(pageview.page_id).toBeDefined();
      expect(pageview.path).toBe('/test');
    });

    test('MappedPageviewWithMeta structure includes data property', () => {
      const csvRow = {
        uuid: 'clh1234567890abcdefghijk1',
        added_iso: '2025-10-25T10:00:00.000Z',
        path: '/test',
        duration_seconds: '0',
        is_unique: 'false',
        device_type: 'mobile',
        user_agent: 'Test UA',
      };

      const mapped = mapCsvRowToPageview(csvRow);

      expect(mapped.data).toBeDefined();
      expect(typeof mapped.data).toBe('object');
      expect(mapped.pageIdReplaced).toBeDefined();
    });

    test('extracted data matches MappedPageview type', () => {
      const csvRow = {
        uuid: '',
        added_iso: '2025-10-25T10:00:00.000Z',
        path: '/test-path',
        duration_seconds: '25',
        is_unique: 'true',
        device_type: 'tablet',
        user_agent: 'Test Agent',
      };

      const mapped = mapCsvRowToPageview(csvRow);
      const pageview = mapped.data;

      // Verify all required fields exist
      expect(pageview.page_id).toBeDefined();
      expect(pageview.added_iso).toBeDefined();
      expect(pageview.path).toBe('/test-path');
      expect(pageview.device_type).toBe('tablet');
      expect(pageview.user_agent).toBe('Test Agent');
    });
  });
});
