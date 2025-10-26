/**
 * Tests for batch database inserter
 * Tests batch insertion with retry logic and error handling
 */

import { insertPageviewBatch } from '../batch-inserter';
import { prisma } from '../../db/prisma';
import { PageviewPayload } from '../../validation/pageview-schema';

// Mock the Prisma client
jest.mock('../../db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe('insertPageviewBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully insert a batch of valid pageview records', async () => {
    const validPageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk2',
        added_iso: '2024-10-24T10:01:00.000Z',
        path: '/page-2',
        user_agent: 'Mozilla/5.0',
        device_type: 'mobile',
        duration_seconds: 45,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock successful transaction
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const result = await insertPageviewBatch(validPageviews);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(result.error).toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('should return empty result for empty batch', async () => {
    const result = await insertPageviewBatch([]);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should retry on transient database failures', async () => {
    const validPageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock transient failure then success
    (prisma.$transaction as jest.Mock)
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockImplementationOnce(async (callback) => {
        return callback({
          pageview: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

    const result = await insertPageviewBatch(validPageviews);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('should fail after maximum retry attempts', async () => {
    const validPageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock persistent failure
    const dbError = new Error('Database connection lost');
    (prisma.$transaction as jest.Mock).mockRejectedValue(dbError);

    const result = await insertPageviewBatch(validPageviews);

    expect(result.success).toBe(false);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.error).toContain('Database connection lost');
    expect(prisma.$transaction).toHaveBeenCalledTimes(4); // Initial + 3 retries (MAX_RETRIES=3)
  });

  it('should not retry on constraint violation errors', async () => {
    const validPageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock constraint violation (permanent error)
    interface PrismaError extends Error {
      code: string;
    }
    const constraintError = new Error('Unique constraint violation') as PrismaError;
    constraintError.code = 'P2002';
    (prisma.$transaction as jest.Mock).mockRejectedValue(constraintError);

    const result = await insertPageviewBatch(validPageviews);

    expect(result.success).toBe(false);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1); // No retries
  });

  it('should handle batch of 100 records', async () => {
    const largePageviews: PageviewPayload[] = Array.from({ length: 100 }, (_, i) => ({
      page_id: `clh1234567890abcdefghij${String(i).padStart(2, '0')}`,
      added_iso: '2024-10-24T10:00:00.000Z',
      path: `/page-${i}`,
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop' as const,
      duration_seconds: 30,
      visibility_changes: 0,
      is_internal_referrer: false,
    }));

    // Mock successful batch insert
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const result = await insertPageviewBatch(largePageviews);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(100);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
  });

  it('should include batch number in result when provided', async () => {
    const validPageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const result = await insertPageviewBatch(validPageviews, 5);

    expect(result.success).toBe(true);
    expect(result.batchNumber).toBe(5);
  });

  // NEW TESTS FOR DUPLICATE DETECTION (Task 2.1)

  it('should catch P2002 errors and count as skipped', async () => {
    const pageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock P2002 error (duplicate)
    interface PrismaError extends Error {
      code: string;
    }
    const duplicateError = new Error('Unique constraint violation') as PrismaError;
    duplicateError.code = 'P2002';

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockRejectedValue(duplicateError),
        },
      });
    });

    const result = await insertPageviewBatch(pageviews);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('should count non-P2002 errors as failed', async () => {
    const pageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock validation error (not P2002)
    interface PrismaError extends Error {
      code: string;
    }
    const validationError = new Error('Foreign key constraint violation') as PrismaError;
    validationError.code = 'P2003';

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockRejectedValue(validationError),
        },
      });
    });

    const result = await insertPageviewBatch(pageviews);

    expect(result.success).toBe(false);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it('should increment skippedCount correctly on duplicates', async () => {
    const pageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk2',
        added_iso: '2024-10-24T10:01:00.000Z',
        path: '/page-2',
        user_agent: 'Mozilla/5.0',
        device_type: 'mobile',
        duration_seconds: 45,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk3',
        added_iso: '2024-10-24T10:02:00.000Z',
        path: '/page-3',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 60,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock all as duplicates
    interface PrismaError extends Error {
      code: string;
    }
    const duplicateError = new Error('Unique constraint violation') as PrismaError;
    duplicateError.code = 'P2002';

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockRejectedValue(duplicateError),
        },
      });
    });

    const result = await insertPageviewBatch(pageviews);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(3);
  });

  it('should handle mixed batch with some new and some duplicate records', async () => {
    const pageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk2',
        added_iso: '2024-10-24T10:01:00.000Z',
        path: '/page-2',
        user_agent: 'Mozilla/5.0',
        device_type: 'mobile',
        duration_seconds: 45,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk3',
        added_iso: '2024-10-24T10:02:00.000Z',
        path: '/page-3',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 60,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock mixed results: first succeeds, second is duplicate, third succeeds
    interface PrismaError extends Error {
      code: string;
    }
    const duplicateError = new Error('Unique constraint violation') as PrismaError;
    duplicateError.code = 'P2002';

    let callCount = 0;
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
              // Second record is duplicate
              return Promise.reject(duplicateError);
            }
            return Promise.resolve({});
          }),
        },
      });
    });

    const result = await insertPageviewBatch(pageviews);

    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('should handle mixed batch with inserts, duplicates, and failures', async () => {
    const pageviews: PageviewPayload[] = [
      {
        page_id: 'clh1234567890abcdefghijk1',
        added_iso: '2024-10-24T10:00:00.000Z',
        path: '/page-1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 30,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk2',
        added_iso: '2024-10-24T10:01:00.000Z',
        path: '/page-2',
        user_agent: 'Mozilla/5.0',
        device_type: 'mobile',
        duration_seconds: 45,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk3',
        added_iso: '2024-10-24T10:02:00.000Z',
        path: '/page-3',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        duration_seconds: 60,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
      {
        page_id: 'clh1234567890abcdefghijk4',
        added_iso: '2024-10-24T10:03:00.000Z',
        path: '/page-4',
        user_agent: 'Mozilla/5.0',
        device_type: 'tablet',
        duration_seconds: 15,
        visibility_changes: 0,
        is_internal_referrer: false,
      },
    ];

    // Mock mixed results: first succeeds, second is duplicate, third fails, fourth succeeds
    interface PrismaError extends Error {
      code: string;
    }
    const duplicateError = new Error('Unique constraint violation') as PrismaError;
    duplicateError.code = 'P2002';

    const validationError = new Error('Foreign key constraint violation') as PrismaError;
    validationError.code = 'P2003';

    let callCount = 0;
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        pageview: {
          create: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
              // Second record is duplicate
              return Promise.reject(duplicateError);
            } else if (callCount === 3) {
              // Third record fails validation
              return Promise.reject(validationError);
            }
            return Promise.resolve({});
          }),
        },
      });
    });

    const result = await insertPageviewBatch(pageviews);

    expect(result.success).toBe(false); // Contains failures
    expect(result.insertedCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });
});
