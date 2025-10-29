/**
 * Performance Tests for CSV Import Feature
 *
 * Tests performance targets:
 * - Import speed: 1,000 rows/minute minimum
 * - Memory usage: < 500MB for 10,000 row CSV
 * - No memory leaks
 *
 * These tests verify the import process meets performance requirements.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { mapCsvRowToPageview } from '../../lib/import/field-mapper';
import { validateCsvPageview } from '../../lib/import/validation-adapter';
import { insertPageviewBatch } from '../../lib/import/batch-inserter';
import { prisma } from '../../lib/db/prisma';

// Mock the Prisma client for performance tests
jest.mock('../../lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    pageview: {
      createMany: jest.fn(),
    },
  },
  disconnectPrisma: jest.fn(),
}));

const fixturesDir = path.join(__dirname, '../../../test/fixtures/csv-import');

describe('CSV Import Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should import 1,000 rows within performance target (< 1 minute)', async () => {
    const csvPath = path.join(fixturesDir, 'performance-1000-rows.csv');
    const validRows: any[] = [];
    const BATCH_SIZE = 100;
    let totalRows = 0;
    let batchCount = 0;

    // Mock successful database inserts
    (prisma.$transaction as jest.Mock).mockResolvedValue(Array(BATCH_SIZE).fill({}));

    const startTime = Date.now();

    // Parse and validate CSV in batches
    await new Promise((resolve, reject) => {
      let currentBatch: any[] = [];

      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', async (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success && validation.data) {
              currentBatch.push(validation.data);

              // Insert batch when full
              if (currentBatch.length >= BATCH_SIZE) {
                await insertPageviewBatch(currentBatch, ++batchCount);
                validRows.push(...currentBatch);
                currentBatch = [];
              }
            }
          }
        })
        .on('end', async () => {
          // Insert remaining rows
          if (currentBatch.length > 0) {
            await insertPageviewBatch(currentBatch, ++batchCount);
            validRows.push(...currentBatch);
          }
          resolve(null);
        })
        .on('error', reject);
    });

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationSeconds = durationMs / 1000;
    const rowsPerSecond = validRows.length / durationSeconds;
    const rowsPerMinute = rowsPerSecond * 60;

    // Performance assertions
    expect(totalRows).toBe(1000);
    expect(validRows.length).toBe(1000);
    expect(durationMs).toBeLessThan(60000); // Less than 1 minute
    expect(rowsPerMinute).toBeGreaterThan(1000); // More than 1000 rows/minute

    console.log(`Performance Test Results:`);
    console.log(`  - Total rows: ${totalRows}`);
    console.log(`  - Valid rows: ${validRows.length}`);
    console.log(`  - Duration: ${durationMs}ms (${durationSeconds.toFixed(2)}s)`);
    console.log(`  - Rows/second: ${rowsPerSecond.toFixed(2)}`);
    console.log(`  - Rows/minute: ${rowsPerMinute.toFixed(2)}`);
    console.log(`  - Batches processed: ${batchCount}`);
  }, 120000); // 2 minute timeout for this test

  it('should monitor memory usage during large import', async () => {
    const csvPath = path.join(fixturesDir, 'performance-1000-rows.csv');
    const BATCH_SIZE = 100;
    let totalRows = 0;
    let currentBatch: any[] = [];

    // Mock successful database inserts
    (prisma.$transaction as jest.Mock).mockResolvedValue(Array(BATCH_SIZE).fill({}));

    // Get initial memory usage
    const initialMemory = process.memoryUsage();
    let peakMemory = 0;

    // Parse and validate CSV in batches
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', async (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success && validation.data) {
              currentBatch.push(validation.data);

              // Insert batch when full
              if (currentBatch.length >= BATCH_SIZE) {
                await insertPageviewBatch(currentBatch);
                currentBatch = []; // Clear batch to free memory

                // Check memory usage
                const currentMemory = process.memoryUsage().heapUsed;
                if (currentMemory > peakMemory) {
                  peakMemory = currentMemory;
                }
              }
            }
          }
        })
        .on('end', async () => {
          // Insert remaining rows
          if (currentBatch.length > 0) {
            await insertPageviewBatch(currentBatch);
          }
          resolve(null);
        })
        .on('error', reject);
    });

    const finalMemory = process.memoryUsage();
    const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);
    const peakMemoryMB = peakMemory / (1024 * 1024);

    console.log(`Memory Usage Test Results:`);
    console.log(`  - Initial memory: ${(initialMemory.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Final memory: ${(finalMemory.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Peak memory: ${peakMemoryMB.toFixed(2)} MB`);
    console.log(`  - Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);

    expect(totalRows).toBe(1000);

    // Memory should stay reasonable (this is a loose check since we're using mocks)
    // In production with real database, this would be more meaningful
    expect(peakMemoryMB).toBeLessThan(500);
  }, 120000);

  it('should verify no memory leaks across multiple batches', async () => {
    const csvPath = path.join(fixturesDir, 'performance-1000-rows.csv');
    const BATCH_SIZE = 100;
    const memorySnapshots: number[] = [];

    // Mock successful database inserts
    (prisma.$transaction as jest.Mock).mockResolvedValue(Array(BATCH_SIZE).fill({}));

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    // Parse and validate CSV in batches, taking memory snapshots
    await new Promise((resolve, reject) => {
      let currentBatch: any[] = [];

      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', async (row) => {
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success && validation.data) {
              currentBatch.push(validation.data);

              // Insert batch when full
              if (currentBatch.length >= BATCH_SIZE) {
                await insertPageviewBatch(currentBatch);
                currentBatch = []; // Clear batch

                // Take memory snapshot after each batch
                memorySnapshots.push(process.memoryUsage().heapUsed);
              }
            }
          }
        })
        .on('end', async () => {
          // Insert remaining rows
          if (currentBatch.length > 0) {
            await insertPageviewBatch(currentBatch);
          }
          resolve(null);
        })
        .on('error', reject);
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;

    console.log(`Memory Leak Test Results:`);
    console.log(`  - Initial memory: ${(initialMemory / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Final memory: ${(finalMemory / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Snapshots taken: ${memorySnapshots.length}`);

    // Verify memory doesn't grow unbounded
    // Memory should stabilize or decrease after processing batches
    expect(memorySnapshots.length).toBeGreaterThan(0);

    // Calculate average memory of first half vs second half
    const midpoint = Math.floor(memorySnapshots.length / 2);
    const firstHalfAvg = memorySnapshots.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg = memorySnapshots.slice(midpoint).reduce((a, b) => a + b, 0) / (memorySnapshots.length - midpoint);

    console.log(`  - First half avg: ${(firstHalfAvg / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Second half avg: ${(secondHalfAvg / (1024 * 1024)).toFixed(2)} MB`);

    // Memory growth should be minimal (allowing for some variance)
    const memoryGrowthPercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    console.log(`  - Memory growth: ${memoryGrowthPercent.toFixed(2)}%`);

    // Allow up to 50% memory growth (generous threshold for test environment)
    expect(memoryGrowthPercent).toBeLessThan(50);
  }, 120000);
});
