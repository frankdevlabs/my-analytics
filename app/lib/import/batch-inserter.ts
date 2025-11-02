/**
 * Batch Database Inserter for CSV Import
 *
 * Inserts validated pageview records in batches with retry logic.
 * Follows existing database patterns from app/lib/db/pageviews.ts.
 *
 * Features:
 * - Batch insertion using Prisma transactions
 * - Pre-query filtering to detect existing records
 * - Duplicate detection via composite key checking
 * - Retry logic with exponential backoff for transient failures
 * - Distinguishes between permanent and transient errors
 * - Detailed error reporting for troubleshooting
 *
 * Architecture Note:
 * Uses pre-query filtering approach to avoid PostgreSQL transaction abort
 * issues. When a unique constraint violation occurs within a transaction,
 * PostgreSQL aborts the entire transaction. By querying for existing records
 * first, we can filter duplicates at the application level and use createMany()
 * for optimal performance with only new records.
 */

import { prisma } from '../db/prisma';
import { PageviewPayload } from '../validation/pageview-schema';

/**
 * Result structure for batch insert operations
 *
 * @property success - Whether the batch operation completed successfully
 * @property insertedCount - Number of records successfully inserted
 * @property failedCount - Number of records that failed to insert (non-duplicate errors)
 * @property skippedCount - Number of duplicate records that were skipped (P2002 errors)
 * @property batchNumber - Optional batch number for logging purposes
 * @property error - Optional error message if the operation failed
 */
export interface BatchInsertResult {
  success: boolean;
  insertedCount: number;
  failedCount: number;
  skippedCount: number;
  batchNumber?: number;
  error?: string;
}

/**
 * Maximum number of retry attempts for transient failures
 */
const MAX_RETRIES = 3;

/**
 * Initial delay for exponential backoff in milliseconds
 * Delays: 1000ms (1s), 2000ms (2s), 4000ms (4s)
 */
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Transaction timeout in milliseconds
 *
 * Increased from 30s to 60s to handle database recovery scenarios
 * after migrations or high-load operations.
 */
const TRANSACTION_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Prisma error codes that should not be retried (permanent errors)
 */
const PERMANENT_ERROR_CODES = [
  'P2002', // Unique constraint violation
  'P2003', // Foreign key constraint violation
  'P2025', // Record not found
];

/**
 * Inserts a batch of validated pageview records into the database
 *
 * Uses Prisma transactions with pre-query filtering to handle duplicates.
 * Implements retry logic with exponential backoff for transient failures.
 * Detects duplicates by querying for existing records with matching composite keys.
 *
 * @param pageviews - Array of validated pageview records (max 100 recommended)
 * @param batchNumber - Optional batch number for logging purposes
 * @returns BatchInsertResult with success status and counts
 */
export async function insertPageviewBatch(
  pageviews: PageviewPayload[],
  batchNumber?: number
): Promise<BatchInsertResult> {
  // Handle empty batch
  if (pageviews.length === 0) {
    return {
      success: true,
      insertedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      batchNumber,
    };
  }

  // Attempt insertion with retry logic
  try {
    const result = await retryWithExponentialBackoff(
      async () => {
        return await insertBatchWithPreQueryFiltering(pageviews);
      },
      MAX_RETRIES,
      INITIAL_RETRY_DELAY_MS,
      batchNumber
    );

    return {
      success: result.failedCount === 0,
      insertedCount: result.insertedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      batchNumber,
    };
  } catch (error: unknown) {
    // Log detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined;
    console.error('Batch insert failed after retries:', {
      batchNumber,
      recordCount: pageviews.length,
      error: errorMessage,
      code: errorCode,
    });

    return {
      success: false,
      insertedCount: 0,
      failedCount: pageviews.length,
      skippedCount: 0,
      batchNumber,
      error: formatDatabaseError(error),
    };
  }
}

/**
 * Result structure for batch insertion within a transaction
 */
interface TransactionInsertResult {
  insertedCount: number;
  failedCount: number;
  skippedCount: number;
}

/**
 * Inserts pageviews using pre-query filtering to detect duplicates
 *
 * Strategy:
 * 1. Query database for existing records matching composite keys
 * 2. Filter out duplicates at application level
 * 3. Insert only new records using createMany() for performance
 *
 * This approach avoids PostgreSQL transaction abort issues that occur
 * when P2002 errors happen within a transaction. By filtering duplicates
 * before insertion, we can use the more performant createMany() operation
 * and maintain accurate counts of inserted vs skipped records.
 *
 * @param pageviews - Array of validated pageview records
 * @returns Result with counts of inserted, failed, and skipped records
 */
async function insertBatchWithPreQueryFiltering(
  pageviews: PageviewPayload[]
): Promise<TransactionInsertResult> {
  return await prisma.$transaction(
    async (tx) => {
      // Step 1: Build composite key queries to check for existing records
      // Composite key: (added_iso, path, session_id, hostname)
      const compositeKeys = pageviews.map((pv) => ({
        added_iso: new Date(pv.added_iso),
        path: pv.path,
        session_id: pv.session_id ?? null,
        hostname: pv.hostname ?? null,
      }));

      // Step 2: Query for existing records with matching composite keys
      // Use OR conditions to check all composite keys in a single query
      const existingRecords = await tx.pageview.findMany({
        where: {
          OR: compositeKeys.map((key) => ({
            added_iso: key.added_iso,
            path: key.path,
            session_id: key.session_id,
            hostname: key.hostname,
          })),
        },
        select: {
          added_iso: true,
          path: true,
          session_id: true,
          hostname: true,
        },
      });

      // Step 3: Create a Set of composite key strings for fast lookup
      const existingKeySet = new Set(
        existingRecords.map((record) =>
          createCompositeKeyString(
            record.added_iso,
            record.path,
            record.session_id,
            record.hostname
          )
        )
      );

      // Step 4: Separate new records from duplicates
      const newRecords: PageviewPayload[] = [];
      let skippedCount = 0;

      for (const pv of pageviews) {
        const keyString = createCompositeKeyString(
          new Date(pv.added_iso),
          pv.path,
          pv.session_id ?? null,
          pv.hostname ?? null
        );

        if (existingKeySet.has(keyString)) {
          // Record already exists - count as skipped
          skippedCount++;
        } else {
          // New record - prepare for insertion
          newRecords.push(pv);
        }
      }

      // Step 5: Insert only new records using createMany()
      let insertedCount = 0;
      let failedCount = 0;

      if (newRecords.length > 0) {
        try {
          // Convert PageviewPayload to Prisma create input format
          const recordsToInsert = newRecords.map((pv) => ({
            page_id: pv.page_id,
            added_iso: new Date(pv.added_iso),
            session_id: pv.session_id ?? null,
            hostname: pv.hostname ?? null,
            path: pv.path,
            hash: pv.hash ?? null,
            query_string: pv.query_string ?? null,
            document_title: pv.document_title ?? null,
            document_referrer: pv.document_referrer ?? null,
            referrer_domain: pv.referrer_domain ?? null,
            referrer_category: pv.referrer_category ?? null,
            is_internal_referrer: pv.is_internal_referrer,
            device_type: pv.device_type,
            browser_name: pv.browser_name ?? null,
            browser_version: pv.browser_version ?? null,
            os_name: pv.os_name ?? null,
            os_version: pv.os_version ?? null,
            viewport_width: pv.viewport_width ?? null,
            viewport_height: pv.viewport_height ?? null,
            screen_width: pv.screen_width ?? null,
            screen_height: pv.screen_height ?? null,
            language: pv.language ?? null,
            timezone: pv.timezone ?? null,
            user_agent: pv.user_agent,
            country_code: pv.country_code ?? null,
            utm_source: pv.utm_source ?? null,
            utm_medium: pv.utm_medium ?? null,
            utm_campaign: pv.utm_campaign ?? null,
            utm_content: pv.utm_content ?? null,
            utm_term: pv.utm_term ?? null,
            duration_seconds: pv.duration_seconds,
            time_on_page_seconds: pv.time_on_page_seconds ?? null,
            scrolled_percentage: pv.scrolled_percentage ?? null,
            visibility_changes: pv.visibility_changes,
            // Use values from CSV import (not defaults - CSV has correct values from source)
            is_unique: pv.is_unique,
            is_bot: pv.is_bot,
          }));

          const result = await tx.pageview.createMany({
            data: recordsToInsert,
            skipDuplicates: true, // Extra safety in case of race conditions
          });

          insertedCount = result.count;
        } catch (error: unknown) {
          // If createMany fails, all new records are considered failed
          failedCount = newRecords.length;
          console.error('Failed to insert batch of new pageviews:', {
            newRecordCount: newRecords.length,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return { insertedCount, failedCount, skippedCount };
    },
    {
      maxWait: TRANSACTION_TIMEOUT_MS,
      timeout: TRANSACTION_TIMEOUT_MS,
    }
  );
}

/**
 * Creates a composite key string for duplicate detection
 *
 * Combines the four fields of the composite unique constraint into a
 * single string for efficient Set lookups. Handles NULL values correctly.
 *
 * @param added_iso - Timestamp of the pageview
 * @param path - URL path
 * @param session_id - Session identifier (may be null)
 * @param hostname - Hostname (may be null)
 * @returns Composite key string
 */
function createCompositeKeyString(
  added_iso: Date,
  path: string,
  session_id: string | null,
  hostname: string | null
): string {
  // Use ISO string for date to ensure consistent comparison
  // Use special token for NULL to distinguish from empty string
  return `${added_iso.toISOString()}|${path}|${session_id ?? '__NULL__'}|${hostname ?? '__NULL__'}`;
}

/**
 * Retries an operation with exponential backoff
 *
 * Follows the retry pattern from app/lib/db/pageviews.ts.
 * Does not retry permanent errors like constraint violations.
 *
 * @param operation - Async operation to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param initialDelayMs - Initial delay in milliseconds
 * @param batchNumber - Optional batch number for logging
 */
async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  initialDelayMs: number,
  batchNumber?: number
): Promise<T> {
  let lastError: Error = new Error('Operation failed');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry permanent errors
      if (isPermanentError(error)) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delayMs = initialDelayMs * Math.pow(2, attempt);

      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms...`,
        {
          batchNumber,
          error: lastError.message,
          code: isPrismaError(lastError) ? lastError.code : undefined,
        }
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Type guard to check if error is a Prisma error with code
 */
interface PrismaError extends Error {
  code?: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Error && 'code' in error;
}

/**
 * Determines if a database error is permanent (should not be retried)
 *
 * Permanent errors include:
 * - Unique constraint violations
 * - Foreign key constraint violations
 * - Record not found errors
 *
 * @param error - Error object from Prisma
 * @returns True if error is permanent and should not be retried
 */
function isPermanentError(error: unknown): boolean {
  if (!isPrismaError(error) || !error.code) {
    return false;
  }
  return PERMANENT_ERROR_CODES.includes(error.code);
}

/**
 * Formats database error for user-friendly logging
 *
 * Extracts relevant error details while hiding sensitive information.
 *
 * @param error - Error object from Prisma
 * @returns Formatted error message
 */
function formatDatabaseError(error: unknown): string {
  if (!isPrismaError(error)) {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  if (error.code === 'P2002') {
    return 'Duplicate pageview skipped';
  }

  if (error.code === 'P2003') {
    return 'Foreign key constraint violation';
  }

  if (error.code === 'P2025') {
    return 'Record not found';
  }

  // Generic error message for unknown errors
  return error.message || 'Unknown database error';
}
