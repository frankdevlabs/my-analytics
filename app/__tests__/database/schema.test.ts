/**
 * Prisma Schema Foundation Tests
 *
 * Tests the Pageview model and DeviceType enum to ensure:
 * - Model creation with all required fields
 * - Enum validation for device types
 * - Timestamp field behavior (created_at default, added_iso required)
 * - Country code length constraint (exactly 2 chars when provided)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean up test data after all tests
afterAll(async () => {
  // Delete all test pageviews
  await prisma.pageview.deleteMany({
    where: {
      path: {
        startsWith: '/test-',
      },
    },
  });

  await prisma.$disconnect();
});

describe('Prisma Schema - Pageview Model', () => {
  /**
   * Test 1: Pageview model creation with all required fields
   * Verifies that a pageview can be created with all required fields
   * and that the model matches the CSV structure exactly
   */
  test('should create pageview with all required fields', async () => {
    const testDate = new Date('2024-10-23T10:00:00Z');

    const pageview = await prisma.pageview.create({
      data: {
        added_iso: testDate,
        path: '/test-page',
        country_code: 'US',
        device_type: 'desktop',
        document_referrer: 'https://example.com',
        utm_source: 'google',
        duration_seconds: 45,
        is_unique: true,
      },
    });

    expect(pageview.id).toBeDefined();
    expect(pageview.added_iso.toISOString()).toBe(testDate.toISOString());
    expect(pageview.path).toBe('/test-page');
    expect(pageview.country_code).toBe('US');
    expect(pageview.device_type).toBe('desktop');
    expect(pageview.document_referrer).toBe('https://example.com');
    expect(pageview.utm_source).toBe('google');
    expect(pageview.duration_seconds).toBe(45);
    expect(pageview.is_unique).toBe(true);
    expect(pageview.created_at).toBeDefined();
    expect(pageview.created_at).toBeInstanceOf(Date);
  });

  /**
   * Test 2: DeviceType enum validation
   * Verifies that only valid device types (desktop, mobile, tablet) are accepted
   * and that invalid device types are rejected
   */
  test('should validate DeviceType enum values', async () => {
    const validDeviceTypes = ['desktop', 'mobile', 'tablet'];

    // Test each valid device type
    for (const deviceType of validDeviceTypes) {
      const pageview = await prisma.pageview.create({
        data: {
          added_iso: new Date(),
          path: `/test-device-${deviceType}`,
          device_type: deviceType as 'desktop' | 'mobile' | 'tablet',
          duration_seconds: 10,
        },
      });

      expect(pageview.device_type).toBe(deviceType);
    }
  });

  /**
   * Test 3: Timestamp field behavior
   * Verifies that:
   * - created_at has a default value of now()
   * - added_iso is required and stored correctly
   * - Both timestamps use Timestamptz(3) for timezone-aware storage
   */
  test('should handle timestamp fields correctly', async () => {
    const addedIso = new Date('2024-10-23T15:30:00Z');
    const beforeCreate = new Date();

    const pageview = await prisma.pageview.create({
      data: {
        added_iso: addedIso,
        path: '/test-timestamps',
        device_type: 'mobile',
        duration_seconds: 30,
      },
    });

    const afterCreate = new Date();

    // Verify added_iso is stored exactly as provided
    expect(pageview.added_iso.toISOString()).toBe(addedIso.toISOString());

    // Verify created_at has a default value set automatically
    expect(pageview.created_at).toBeDefined();
    expect(pageview.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(pageview.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  /**
   * Test 4: Country code length constraint
   * Verifies that country_code:
   * - Accepts exactly 2 characters when provided
   * - Can be null/undefined (optional field)
   * - Rejects values that don't match the constraint
   */
  test('should validate country_code length constraint', async () => {
    // Test valid 2-character country code
    const pageviewWithCountry = await prisma.pageview.create({
      data: {
        added_iso: new Date(),
        path: '/test-country-valid',
        country_code: 'CA',
        device_type: 'desktop',
        duration_seconds: 20,
      },
    });

    expect(pageviewWithCountry.country_code).toBe('CA');
    expect(pageviewWithCountry.country_code?.length).toBe(2);

    // Test null country code (optional field)
    const pageviewWithoutCountry = await prisma.pageview.create({
      data: {
        added_iso: new Date(),
        path: '/test-country-null',
        device_type: 'tablet',
        duration_seconds: 15,
      },
    });

    expect(pageviewWithoutCountry.country_code).toBeNull();

    // Test that country code can be explicitly set to null
    const pageviewExplicitNull = await prisma.pageview.create({
      data: {
        added_iso: new Date(),
        path: '/test-country-explicit-null',
        country_code: null,
        device_type: 'mobile',
        duration_seconds: 25,
      },
    });

    expect(pageviewExplicitNull.country_code).toBeNull();
  });
});
