import { cleanupOldPageviews } from '../cleanup-old-pageviews';
import { PrismaClient } from '@prisma/client';

// Mock the retention config
jest.mock('../../config/retention', () => ({
  getRetentionCutoffDate: jest.fn(() => {
    const date = new Date('2023-10-15T00:00:00Z');
    return date;
  }),
}));

// Type for the mock Prisma client
interface MockPrismaClient {
  pageview: {
    deleteMany: jest.Mock;
  };
}

describe('cleanupOldPageviews', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      pageview: {
        deleteMany: jest.fn(),
      },
    };

    // Clear console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should delete old pageviews in single batch when count less than batch size', async () => {
    mockPrisma.pageview.deleteMany.mockResolvedValue({ count: 5000 });

    const result = await cleanupOldPageviews(mockPrisma as unknown as PrismaClient);

    expect(result.totalDeleted).toBe(5000);
    expect(result.batchesProcessed).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockPrisma.pageview.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.pageview.deleteMany).toHaveBeenCalledWith({
      where: {
        added_iso: {
          lt: expect.any(Date),
        },
      },
      take: 10000,
    });
  });

  it('should delete old pageviews in multiple batches when count exceeds batch size', async () => {
    // Mock three batches: 10000, 10000, 3000
    mockPrisma.pageview.deleteMany
      .mockResolvedValueOnce({ count: 10000 })
      .mockResolvedValueOnce({ count: 10000 })
      .mockResolvedValueOnce({ count: 3000 });

    const result = await cleanupOldPageviews(mockPrisma as unknown as PrismaClient);

    expect(result.totalDeleted).toBe(23000);
    expect(result.batchesProcessed).toBe(3);
    expect(result.errors).toHaveLength(0);
    expect(mockPrisma.pageview.deleteMany).toHaveBeenCalledTimes(3);
  });

  it('should handle batch errors and continue processing', async () => {
    // First batch succeeds with 10000, second batch fails, third batch succeeds with 5000
    mockPrisma.pageview.deleteMany
      .mockResolvedValueOnce({ count: 10000 })
      .mockRejectedValueOnce(new Error('Temporary database error'))
      .mockResolvedValueOnce({ count: 5000 });

    const result = await cleanupOldPageviews(mockPrisma as unknown as PrismaClient);

    // After an error, the job continues and completes the next successful batch
    expect(result.totalDeleted).toBe(15000);
    expect(result.batchesProcessed).toBe(3); // 1 success + 1 error + 1 success
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Temporary database error');
    expect(mockPrisma.pageview.deleteMany).toHaveBeenCalledTimes(3);
  });

  it('should stop immediately on connection errors', async () => {
    mockPrisma.pageview.deleteMany
      .mockResolvedValueOnce({ count: 10000 })
      .mockRejectedValueOnce(new Error('ECONNREFUSED: Connection refused'));

    const result = await cleanupOldPageviews(mockPrisma as unknown as PrismaClient);

    expect(result.totalDeleted).toBe(10000);
    expect(result.batchesProcessed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Connection error');
    // Should not attempt more batches after connection error
    expect(mockPrisma.pageview.deleteMany).toHaveBeenCalledTimes(2);
  });

  it('should return timing information', async () => {
    mockPrisma.pageview.deleteMany.mockResolvedValue({ count: 1000 });

    const result = await cleanupOldPageviews(mockPrisma as unknown as PrismaClient);

    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
  });

  it('should stop when no records are deleted', async () => {
    mockPrisma.pageview.deleteMany.mockResolvedValue({ count: 0 });

    const result = await cleanupOldPageviews(mockPrisma as unknown as PrismaClient);

    expect(result.totalDeleted).toBe(0);
    expect(result.batchesProcessed).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockPrisma.pageview.deleteMany).toHaveBeenCalledTimes(1);
  });
});
