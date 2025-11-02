/**
 * Integration Tests for Page ID Format Fix
 *
 * Tests end-to-end workflows for the CUID2 page_id format implementation.
 * Covers critical user workflows:
 * - Client-side tracking with CUID2 page_ids
 * - Server-side validation of CUID2 format
 * - CSV import with CUID2 generation
 * - Cross-endpoint consistency
 *
 * Task Group 4: Integration Testing for page_id format fix
 */

import { NextRequest } from 'next/server';
import { POST as trackPost } from '../../src/app/api/metrics/route';
import { POST as appendPost } from '../../src/app/api/metrics/append/route';
import { POST as eventPost } from '../../src/app/api/metrics/event/route';
import { prisma } from '../../lib/db/prisma';
import { mapCsvRowToPageview } from '../../lib/import/field-mapper';
import { validateCsvPageview } from '../../lib/import/validation-adapter';
import { generatePageId } from '../../lib/import/field-mapper';

// Import modules that will be mocked locally (not globally)
import * as visitorTracking from '../../lib/privacy/visitor-tracking';
import * as maxmindReader from '../../lib/geoip/maxmind-reader';

describe('Page ID Format Fix - Integration Tests', () => {
  let _mockCheckAndRecordVisitor: jest.SpyInstance;
  let _mockLookupCountryCode: jest.SpyInstance;
  let _mockPrismaTransaction: jest.SpyInstance;

  beforeEach(() => {
    // Set up local mocks (not global - isolated to this test file)
    _mockCheckAndRecordVisitor = jest.spyOn(visitorTracking, 'checkAndRecordVisitor').mockResolvedValue(true);
    _mockLookupCountryCode = jest.spyOn(maxmindReader, 'lookupCountryCode').mockReturnValue('US');

    // Mock transaction for all endpoints
    _mockPrismaTransaction = jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        const mockTx = {
          pageview: {
            create: jest.fn().mockResolvedValue({ id: 1 }),
            findUnique: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn().mockResolvedValue({ id: 1 }),
          },
          event: {
            create: jest.fn().mockResolvedValue({ id: 1 }),
          },
        };
        return await callback(mockTx);
      }
      return {};
    });
  });

  afterEach(() => {
    // Restore all mocks to prevent pollution of other tests
    jest.restoreAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
    const allHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'x-forwarded-for': '8.8.8.8',
      ...headers,
    };

    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: allHeaders,
    });
  };

  describe('End-to-End Tracking with CUID2 page_id', () => {
    it('should accept CUID2 page_id in /api/track and return 204', async () => {
      const validCuid2 = 'clh1234567890abcdefghijk1'; // 25 chars, starts with 'c'

      const payload = {
        page_id: validCuid2,
        path: '/test-page',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-25T10:00:00.000Z',
        duration_seconds: 0,
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = createMockRequest(payload);
      const response = await trackPost(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject old UUID format in /api/track with 400 validation error', async () => {
      const oldUuid = '550e8400-e29b-41d4-a716-446655440000'; // Old UUID format

      const payload = {
        page_id: oldUuid,
        path: '/test-page',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-25T10:00:00.000Z',
        duration_seconds: 0,
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = createMockRequest(payload);
      const response = await trackPost(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.details).toBeDefined();

      // Check that page_id validation error exists
      const pageIdError = (responseData.details as Array<{ field: string; message: string }>).find((d) => d.field === 'page_id');
      expect(pageIdError).toBeDefined();
      expect(pageIdError?.message).toContain('CUID format');
    });

    it('should accept CUID2 page_id in /api/track/append and return 204', async () => {
      const validCuid2 = 'clm9876543210zyxwvutsrqp9'; // 25 chars exactly

      const payload = {
        page_id: validCuid2,
        duration_seconds: 30,
      };

      const request = createMockRequest(payload);
      const response = await appendPost(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject old UUID format in /api/track/append with 400 validation error', async () => {
      const oldUuid = '123e4567-e89b-12d3-a456-426614174000';

      const payload = {
        page_id: oldUuid,
        duration_seconds: 30,
      };

      const request = createMockRequest(payload);
      const response = await appendPost(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');

      const pageIdError = (responseData.details as Array<{ field: string; message: string }>).find((d) => d.field === 'page_id');
      expect(pageIdError).toBeDefined();
      expect(pageIdError?.message).toContain('CUID format');
    });

    it('should accept CUID2 page_id in /api/track/event and return 204', async () => {
      const validCuid2 = 'cxn3456789012abcdefghijkl'; // 25 chars exactly

      const payload = {
        event_name: 'button_click',
        page_id: validCuid2,
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/test',
        timestamp: '2025-10-25T10:00:00.000Z',
      };

      const request = createMockRequest(payload);
      const response = await eventPost(request);

      expect(response.status).toBe(204);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject old UUID format in /api/track/event with 400 validation error', async () => {
      const oldUuid = 'abcdef01-2345-6789-abcd-ef0123456789';

      const payload = {
        event_name: 'button_click',
        page_id: oldUuid,
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/test',
        timestamp: '2025-10-25T10:00:00.000Z',
      };

      const request = createMockRequest(payload);
      const response = await eventPost(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');

      const pageIdError = (responseData.details as Array<{ field: string; message: string }>).find((d) => d.field === 'page_id');
      expect(pageIdError).toBeDefined();
      expect(pageIdError?.message).toContain('CUID format');
    });
  });

  describe('CSV Import with CUID2 Generation', () => {
    it('should generate valid CUID2 page_id when CSV uuid field is empty', () => {
      const csvRow = {
        uuid: '', // Empty - should auto-generate
        added_iso: '2025-10-25T10:00:00.000Z',
        path: '/imported-page',
        duration_seconds: '45',
        is_unique: 'true',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
      };

      const mapped = mapCsvRowToPageview(csvRow);

      // Verify CUID2 format
      expect(mapped.data.page_id).toMatch(/^c[a-z0-9]{24}$/);
      expect(mapped.data.page_id.length).toBe(25);
      expect(mapped.data.page_id[0]).toBe('c');
    });

    it('should validate and accept CSV-generated CUID2 page_ids', () => {
      const csvRow = {
        uuid: '', // Will be auto-generated
        added_iso: '2025-10-25T10:00:00.000Z',
        path: '/test',
        duration_seconds: '0',
        is_unique: 'false',
        device_type: 'mobile',
        user_agent: 'Mozilla/5.0',
      };

      const mapped = mapCsvRowToPageview(csvRow);
      const validation = validateCsvPageview(mapped.data);

      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.page_id).toMatch(/^c[a-z0-9]{24}$/);
      }
    });

    it('should generate unique CUID2 page_ids for multiple CSV rows', () => {
      const generatedIds = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const pageId = generatePageId();
        generatedIds.add(pageId);

        // Verify each ID is valid CUID2
        expect(pageId).toMatch(/^c[a-z0-9]{24}$/);
        expect(pageId.length).toBe(25);
      }

      // Verify all IDs are unique
      expect(generatedIds.size).toBe(100);
    });
  });

  describe('Format Validation Edge Cases', () => {
    it('should reject CUID2 with incorrect length (24 chars instead of 25)', async () => {
      const tooShort = 'clh1234567890abcdefghij'; // 24 chars

      const payload = {
        page_id: tooShort,
        path: '/test',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-25T10:00:00.000Z',
        duration_seconds: 0,
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = createMockRequest(payload);
      const response = await trackPost(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation failed');

      const pageIdError = (responseData.details as Array<{ field: string; message: string }>).find((d) => d.field === 'page_id');
      expect(pageIdError).toBeDefined();
      expect(pageIdError?.message).toContain('CUID format');
    });

    it('should reject CUID2 with incorrect prefix (starts with "x" instead of "c")', async () => {
      const wrongPrefix = 'xlh1234567890abcdefghijk1'; // Starts with 'x'

      const payload = {
        page_id: wrongPrefix,
        path: '/test',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-25T10:00:00.000Z',
        duration_seconds: 0,
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const request = createMockRequest(payload);
      const response = await trackPost(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      const pageIdError = (responseData.details as Array<{ field: string; message: string }>).find((d) => d.field === 'page_id');
      expect(pageIdError).toBeDefined();
    });
  });
});
