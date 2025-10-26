/**
 * Cleanup Job for Old Pageviews
 * Implements batched deletion to avoid database lock contention
 */

import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/prisma';
import { getRetentionCutoffDate } from '../config/retention';

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  totalDeleted: number;
  batchesProcessed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Batch size for deletion operations
 * 10,000 records per batch to balance speed with lock contention
 */
const BATCH_SIZE = 10000;

/**
 * Clean up old pageviews based on retention policy
 * Deletes records in batches to prevent lock contention
 *
 * @param {PrismaClient} [prismaClient] - Optional Prisma client for testing
 * @returns {Promise<CleanupResult>} Summary of cleanup operation
 */
export async function cleanupOldPageviews(
  prismaClient?: PrismaClient
): Promise<CleanupResult> {
  const client = prismaClient || defaultPrisma;
  const startTime = new Date();
  let totalDeleted = 0;
  let batchesProcessed = 0;
  const errors: string[] = [];

  try {
    const cutoffDate = getRetentionCutoffDate();
    console.log(`Starting pageview cleanup for records older than ${cutoffDate.toISOString()}`);

    let hasMoreRecords = true;

    while (hasMoreRecords) {
      try {
        // Delete a batch of records
        const result = await client.pageview.deleteMany({
          where: {
            added_iso: {
              lt: cutoffDate,
            },
          },
        });

        const deletedCount = result.count;
        totalDeleted += deletedCount;
        batchesProcessed++;

        console.log(`Batch ${batchesProcessed}: Deleted ${deletedCount} records (total: ${totalDeleted})`);

        // If we deleted fewer records than batch size, we're done
        if (deletedCount < BATCH_SIZE) {
          hasMoreRecords = false;
        }

        // If no records were deleted, we're done
        if (deletedCount === 0) {
          hasMoreRecords = false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a connection error - stop immediately
        // Only stop for actual connection/network errors, not general database errors
        if (
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('Connection terminated') ||
          errorMessage.includes('Connection closed')
        ) {
          console.error(`Connection error in batch ${batchesProcessed + 1}: ${errorMessage}`);
          errors.push(`Connection error: ${errorMessage}`);
          // Stop processing on connection errors
          break;
        }

        // For other errors, log and continue with next batch
        console.error(`Error in batch ${batchesProcessed + 1}: ${errorMessage}`);
        errors.push(`Batch ${batchesProcessed + 1} error: ${errorMessage}`);
        batchesProcessed++;

        // Continue to next batch despite error
        // This prevents one bad batch from stopping the entire cleanup
        // Note: hasMoreRecords stays true, so the loop continues
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    console.log(`Cleanup completed: ${totalDeleted} records deleted in ${batchesProcessed} batches (${durationMs}ms)`);

    return {
      totalDeleted,
      batchesProcessed,
      errors,
      startTime,
      endTime,
      durationMs,
    };
  } catch (error) {
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`Cleanup job failed: ${errorMessage}`);
    errors.push(`Job failure: ${errorMessage}`);

    return {
      totalDeleted,
      batchesProcessed,
      errors,
      startTime,
      endTime,
      durationMs,
    };
  }
}
