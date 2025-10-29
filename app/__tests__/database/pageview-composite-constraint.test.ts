/**
 * Focused tests for Pageview composite unique constraint
 * Tests the composite unique constraint on (added_iso, path, session_id, hostname)
 *
 * Scope: Task 1.1 - Write 3-5 focused tests for composite unique constraint
 *
 * These are database integration tests that verify the constraint behavior
 */

import { PrismaClient, Prisma, DeviceType } from '@prisma/client';

const prisma = new PrismaClient();

describe('Pageview Composite Unique Constraint', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.pageview.deleteMany({
      where: {
        hostname: {
          in: ['test-constraint.com', 'test-null-session.com', 'test-different-session.com']
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pageview.deleteMany({
      where: {
        hostname: {
          in: ['test-constraint.com', 'test-null-session.com', 'test-different-session.com']
        }
      }
    });
    await prisma.$disconnect();
  });

  /**
   * Test 1: Verify that duplicate (added_iso, path, session_id, hostname) cannot be inserted
   * This is the core functionality of the composite unique constraint
   */
  it('should reject duplicate pageviews with same added_iso, path, session_id, and hostname', async () => {
    const testDate = new Date('2025-10-25T10:00:00.000Z');
    const basePageview = {
      added_iso: testDate,
      path: '/test-duplicate',
      session_id: 'session-duplicate-test',
      hostname: 'test-constraint.com',
      device_type: DeviceType.desktop,
      duration_seconds: 10,
      user_agent: 'Test Agent',
      is_unique: false,
      is_bot: false,
      is_internal_referrer: false,
      visibility_changes: 0
    };

    // First insertion should succeed
    const firstPageview = await prisma.pageview.create({
      data: basePageview
    });
    expect(firstPageview.id).toBeDefined();
    expect(firstPageview.path).toBe('/test-duplicate');

    // Second insertion with identical composite key fields should fail with P2002
    await expect(
      prisma.pageview.create({
        data: basePageview
      })
    ).rejects.toThrow(/Unique constraint failed/);

    // Verify error code is P2002
    try {
      await prisma.pageview.create({
        data: basePageview
      });
      fail('Should have thrown P2002 error');
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        expect(error.code).toBe('P2002');
        expect(error.meta?.target).toContain('added_iso');
      }
    }
  });

  /**
   * Test 2: Verify that NULL session_id values are allowed
   * Multiple rows with same added_iso/path/hostname but NULL session_id should be allowed
   * This is correct behavior since NULL != NULL in SQL unique constraints
   */
  it('should allow multiple pageviews with NULL session_id but same added_iso, path, and hostname', async () => {
    const testDate = new Date('2025-10-25T11:00:00.000Z');
    const basePageview = {
      added_iso: testDate,
      path: '/test-null-session',
      session_id: null,
      hostname: 'test-null-session.com',
      device_type: DeviceType.desktop,
      duration_seconds: 15,
      user_agent: 'Test Agent',
      is_unique: false,
      is_bot: false,
      is_internal_referrer: false,
      visibility_changes: 0
    };

    // First insertion with NULL session_id should succeed
    const firstPageview = await prisma.pageview.create({
      data: basePageview
    });
    expect(firstPageview.id).toBeDefined();
    expect(firstPageview.session_id).toBeNull();

    // Second insertion with NULL session_id and same other fields should also succeed
    const secondPageview = await prisma.pageview.create({
      data: basePageview
    });
    expect(secondPageview.id).toBeDefined();
    expect(secondPageview.session_id).toBeNull();

    // Verify both records exist
    expect(firstPageview.id).not.toBe(secondPageview.id);
  });

  /**
   * Test 3: Verify that different session_id values allow duplicate added_iso/path/hostname combinations
   * This tests that the constraint correctly includes session_id in the uniqueness check
   */
  it('should allow duplicate added_iso, path, hostname with different session_id values', async () => {
    const testDate = new Date('2025-10-25T12:00:00.000Z');
    const baseData = {
      added_iso: testDate,
      path: '/test-different-session',
      hostname: 'test-different-session.com',
      device_type: DeviceType.desktop,
      duration_seconds: 20,
      user_agent: 'Test Agent',
      is_unique: false,
      is_bot: false,
      is_internal_referrer: false,
      visibility_changes: 0
    };

    // First pageview with session_id = 'session-1'
    const firstPageview = await prisma.pageview.create({
      data: {
        ...baseData,
        session_id: 'session-1'
      }
    });
    expect(firstPageview.session_id).toBe('session-1');

    // Second pageview with session_id = 'session-2' (same date/path/hostname)
    const secondPageview = await prisma.pageview.create({
      data: {
        ...baseData,
        session_id: 'session-2'
      }
    });
    expect(secondPageview.session_id).toBe('session-2');

    // Third pageview with session_id = NULL (same date/path/hostname)
    const thirdPageview = await prisma.pageview.create({
      data: {
        ...baseData,
        session_id: null
      }
    });
    expect(thirdPageview.session_id).toBeNull();

    // Verify all three records exist and are distinct
    expect(firstPageview.id).not.toBe(secondPageview.id);
    expect(secondPageview.id).not.toBe(thirdPageview.id);
    expect(firstPageview.id).not.toBe(thirdPageview.id);
  });

  /**
   * Test 4: Verify that page_id unique constraint remains intact
   * Ensures the existing unique constraint on page_id is not affected by the new composite constraint
   */
  it('should maintain existing page_id unique constraint independently', async () => {
    const testDate = new Date('2025-10-25T13:00:00.000Z');

    // Create a pageview and capture its page_id
    const firstPageview = await prisma.pageview.create({
      data: {
        added_iso: testDate,
        path: '/test-page-id',
        session_id: 'session-page-id-test',
        hostname: 'test-constraint.com',
        device_type: DeviceType.mobile,
        duration_seconds: 5,
        user_agent: 'Test Agent',
        is_unique: false,
        is_bot: false,
        is_internal_referrer: false,
        visibility_changes: 0
      }
    });

    expect(firstPageview.page_id).toBeDefined();

    // Attempt to create another pageview with the same page_id but different composite key
    const duplicatePageIdData = {
      page_id: firstPageview.page_id,
      added_iso: new Date('2025-10-25T14:00:00.000Z'), // Different timestamp
      path: '/test-different-page', // Different path
      session_id: 'session-different-test', // Different session
      hostname: 'test-constraint.com',
      device_type: DeviceType.mobile,
      duration_seconds: 10,
      user_agent: 'Test Agent',
      is_unique: false,
      is_bot: false,
      is_internal_referrer: false,
      visibility_changes: 0
    };

    // Should fail with P2002 unique constraint violation on page_id
    await expect(
      prisma.pageview.create({
        data: duplicatePageIdData
      })
    ).rejects.toThrow(/Unique constraint failed/);

    try {
      await prisma.pageview.create({
        data: duplicatePageIdData
      });
      fail('Should have thrown P2002 error');
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        expect(error.code).toBe('P2002');
      }
    }
  });

  /**
   * Test 5: Verify that changing any field in the composite key allows insertion
   * Tests that ALL four fields (added_iso, path, session_id, hostname) must match for a duplicate
   */
  it('should allow insertion when any composite key field differs', async () => {
    const baseDate = new Date('2025-10-25T15:00:00.000Z');
    const basePath = '/test-composite-variance';
    const baseSessionId = 'session-variance-test';
    const baseHostname = 'test-constraint.com';

    // Insert base record
    await prisma.pageview.create({
      data: {
        added_iso: baseDate,
        path: basePath,
        session_id: baseSessionId,
        hostname: baseHostname,
        device_type: DeviceType.desktop,
        duration_seconds: 10,
        user_agent: 'Test Agent',
        is_unique: false,
        is_bot: false,
        is_internal_referrer: false,
        visibility_changes: 0
      }
    });

    // Different added_iso - should succeed
    const diffDate = await prisma.pageview.create({
      data: {
        added_iso: new Date('2025-10-25T15:01:00.000Z'), // Different
        path: basePath,
        session_id: baseSessionId,
        hostname: baseHostname,
        device_type: DeviceType.desktop,
        duration_seconds: 10,
        user_agent: 'Test Agent',
        is_unique: false,
        is_bot: false,
        is_internal_referrer: false,
        visibility_changes: 0
      }
    });
    expect(diffDate.id).toBeDefined();

    // Different path - should succeed
    const diffPath = await prisma.pageview.create({
      data: {
        added_iso: baseDate,
        path: '/test-composite-variance-different', // Different
        session_id: baseSessionId,
        hostname: baseHostname,
        device_type: DeviceType.desktop,
        duration_seconds: 10,
        user_agent: 'Test Agent',
        is_unique: false,
        is_bot: false,
        is_internal_referrer: false,
        visibility_changes: 0
      }
    });
    expect(diffPath.id).toBeDefined();

    // Different session_id - should succeed
    const diffSession = await prisma.pageview.create({
      data: {
        added_iso: baseDate,
        path: basePath,
        session_id: 'session-variance-test-different', // Different
        hostname: baseHostname,
        device_type: DeviceType.desktop,
        duration_seconds: 10,
        user_agent: 'Test Agent',
        is_unique: false,
        is_bot: false,
        is_internal_referrer: false,
        visibility_changes: 0
      }
    });
    expect(diffSession.id).toBeDefined();

    // Different hostname - should succeed
    const diffHostname = await prisma.pageview.create({
      data: {
        added_iso: baseDate,
        path: basePath,
        session_id: baseSessionId,
        hostname: 'test-constraint-different.com', // Different
        device_type: DeviceType.desktop,
        duration_seconds: 10,
        user_agent: 'Test Agent',
        is_unique: false,
        is_bot: false,
        is_internal_referrer: false,
        visibility_changes: 0
      }
    });
    expect(diffHostname.id).toBeDefined();

    // Verify all records exist
    expect(diffDate.id).not.toBe(diffPath.id);
    expect(diffPath.id).not.toBe(diffSession.id);
    expect(diffSession.id).not.toBe(diffHostname.id);
  });
});
