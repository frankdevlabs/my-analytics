#!/usr/bin/env ts-node

/**
 * CSV Import Script for Analytics Data
 *
 * Imports historical analytics data from CSV files into the Pageview database table.
 * Uses streaming parser for memory-efficient processing of large files.
 *
 * Features:
 * - Streaming CSV parser for handling large files (10,000+ rows)
 * - Batch database insertion (100 rows per transaction)
 * - Row-level validation with detailed error reporting
 * - Automatic retry logic with exponential backoff
 * - Dual output (console + timestamped log file)
 * - Graceful error handling (continues on row failures)
 * - Duplicate detection and reporting
 *
 * Usage:
 *   npm run import:csv -- ./path/to/file.csv
 *   OR
 *   npx ts-node app/scripts/import-csv.ts ./path/to/file.csv
 *
 * Exit Codes:
 *   0 - Success (at least one row imported or all rows skipped as duplicates)
 *   1 - Failure (no rows imported and none skipped)
 *
 * Performance:
 *   Target: 1,000 rows/minute minimum
 *   Memory: < 500MB for 10,000 row files
 *
 * @example
 * // Import a CSV file
 * npm run import:csv -- ./data/pageviews-2024-10.csv
 *
 * @example
 * // Import with increased memory (for very large files)
 * NODE_OPTIONS="--max-old-space-size=4096" npm run import:csv -- ./large-file.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { mapCsvRowToPageview } from '../lib/import/field-mapper';
import { validateCsvPageview } from '../lib/import/validation-adapter';
import { insertPageviewBatch } from '../lib/import/batch-inserter';
import { disconnectPrisma } from '../lib/db/prisma';
import { PageviewPayload } from '../lib/validation/pageview-schema';
import { LogManager } from '../lib/import/log-manager';

/**
 * Import statistics and error tracking
 *
 * Tracks all metrics for import summary reporting including
 * success/failure counts, duplicate skips, error details, and performance metrics.
 */
interface ImportStats {
  /** Total number of rows processed from CSV (excluding header) */
  totalRows: number;
  /** Number of rows successfully inserted into database */
  successCount: number;
  /** Number of rows that failed validation or database insertion */
  failedCount: number;
  /** Number of duplicate rows that were skipped (detected via unique constraint) */
  skippedCount: number;
  /** Number of page_id values that were replaced (UUID v4 → CUID2) */
  pageIdReplacedCount: number;
  /** Number of batches successfully inserted */
  batchesProcessed: number;
  /** Array of validation errors with row numbers */
  validationErrors: Array<{
    rowNumber: number;
    error: string;
  }>;
  /** Array of database errors with batch numbers */
  databaseErrors: Array<{
    batchNumber: number;
    error: string;
  }>;
  /** Import start timestamp */
  startTime: Date;
  /** Import end timestamp (set when processing completes) */
  endTime?: Date;
}

/**
 * Batch size for database inserts
 *
 * Tuned for optimal balance between:
 * - Memory usage (smaller = less memory)
 * - Performance (larger = fewer DB round-trips)
 * - Error isolation (smaller = less data lost on failure)
 * - Connection pool pressure (smaller = fewer concurrent connections)
 *
 * Reduced from 100 to 50 to prevent database connection pool exhaustion
 * during high-volume imports, especially after database resets.
 */
const BATCH_SIZE = 50;

/**
 * Maximum errors to display in console (full list goes to log file)
 *
 * Prevents console output from becoming overwhelming with large
 * numbers of validation errors. All errors are still logged to file.
 */
const MAX_CONSOLE_ERRORS = 20;

/**
 * Progress update throttling
 *
 * Only display progress updates every N batches to prevent console spam.
 * With BATCH_SIZE=50, progress updates will occur approximately every 250 rows.
 */
const PROGRESS_UPDATE_FREQUENCY = 5; // Update every 5 batches

/**
 * Main import function
 *
 * Orchestrates the entire CSV import process:
 * 1. Validates file exists and is readable
 * 2. Creates streaming CSV parser
 * 3. Processes rows in batches
 * 4. Validates each row (critical fields first, then full schema)
 * 5. Accumulates valid rows into batches
 * 6. Inserts batches into database with retry logic
 * 7. Collects validation and database errors
 * 8. Generates summary statistics
 *
 * The function uses streaming to handle large files efficiently without
 * loading the entire file into memory. Invalid rows are skipped and logged
 * but don't prevent processing of remaining rows.
 *
 * @param filePath - Absolute or relative path to CSV file to import
 * @param logManager - LogManager instance for writing detailed logs
 * @returns Promise resolving to import statistics with counts and errors
 * @throws Error if file not found or CSV parsing fails critically
 *
 * @example
 * const logManager = new LogManager('./logs');
 * const stats = await importCsv('./data/pageviews.csv', logManager);
 * console.log(`Imported ${stats.successCount} rows`);
 */
async function importCsv(
  filePath: string,
  logManager: LogManager
): Promise<ImportStats> {
  // Initialize statistics
  const stats: ImportStats = {
    totalRows: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    pageIdReplacedCount: 0,
    batchesProcessed: 0,
    validationErrors: [],
    databaseErrors: [],
    startTime: new Date(),
  };

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  logManager.log(`Starting import from: ${filePath}`);

  // Accumulator for batch processing
  let currentBatch: PageviewPayload[] = [];
  let currentBatchNumber = 1;
  let currentRowNumber = 1; // Start at 1 (header is row 0)

  return new Promise((resolve, reject) => {
    const parser = fs
      .createReadStream(filePath)
      .pipe(
        parse({
          columns: true, // Use first row as column names
          skip_empty_lines: true, // Ignore blank lines
          trim: true, // Remove leading/trailing whitespace
          relax_quotes: true, // Handle malformed quotes gracefully
          relax_column_count: true, // Allow variable column counts
        })
      );

    /**
     * Process each CSV row as it's parsed
     *
     * Handles row-by-row processing with stream backpressure control:
     * - Pauses stream during batch insertion to prevent database hammering
     * - Filters for pageview records only (skips events)
     * - Maps CSV fields to database schema
     * - Validates mapped data
     * - Accumulates valid rows in batch
     * - Inserts batch when full (50 rows)
     * - Logs errors for invalid rows
     *
     * CRITICAL: Using pause()/resume() prevents concurrent batch insertions
     * that would exhaust the database connection pool and cause recovery mode errors.
     */
    parser.on('data', async (row: Record<string, string>) => {
      // CRITICAL: Pause stream to prevent concurrent processing
      // This ensures batches are inserted sequentially, not all at once
      parser.pause();

      try {
        currentRowNumber++;
        stats.totalRows++;

        // Filter for pageview records only (skip event records)
        if (row.datapoint !== 'pageview') {
          // Skip non-pageview records without counting as error
          logManager.log(`Row ${currentRowNumber}: Skipped (not a pageview record)`);
          return;
        }

        // Map CSV fields to database schema
        const mappedResult = mapCsvRowToPageview(row);

        // Track page_id replacements (UUID v4 → CUID2)
        if (mappedResult.pageIdReplaced) {
          stats.pageIdReplacedCount++;
          logManager.log(
            `Row ${currentRowNumber}: Replaced invalid page_id "${mappedResult.originalPageId}" with CUID2 "${mappedResult.data.page_id}"`
          );
        }

        // Validate the mapped data (critical fields first, then full schema)
        const validationResult = validateCsvPageview(mappedResult.data);

        if (!validationResult.success) {
          // Collect validation error
          stats.failedCount++;
          const errorMessage = validationResult.errors || 'Unknown validation error';
          stats.validationErrors.push({
            rowNumber: currentRowNumber,
            error: errorMessage,
          });
          logManager.logError(`Row ${currentRowNumber}: ${errorMessage}`);
          return;
        }

        // Add valid row to batch
        currentBatch.push(validationResult.data!);

        // Insert batch when full
        if (currentBatch.length >= BATCH_SIZE) {
          await insertBatch(currentBatch, currentBatchNumber, stats, logManager);
          currentBatch = [];
          currentBatchNumber++;

          // Progress update every N batches (throttled to prevent console spam)
          if (currentBatchNumber % PROGRESS_UPDATE_FREQUENCY === 0) {
            console.log(
              `Progress: ${stats.successCount} rows imported, ${stats.skippedCount} duplicates skipped, ${stats.failedCount} failed...`
            );
          }
        }
      } catch (error) {
        // Handle unexpected row processing errors
        stats.failedCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        stats.validationErrors.push({
          rowNumber: currentRowNumber,
          error: errorMessage,
        });
        logManager.logError(`Row ${currentRowNumber}: ${errorMessage}`);
      } finally {
        // CRITICAL: Always resume stream, even if error occurred
        // This ensures the stream continues processing remaining rows
        parser.resume();
      }
    });

    /**
     * Handle CSV parsing errors
     *
     * These are critical errors that indicate malformed CSV structure
     * (not row-level validation errors). Rejects the entire import.
     */
    parser.on('error', (error) => {
      const errorMessage = `CSV parsing error: ${error.message}`;
      logManager.logError(errorMessage);
      reject(new Error(errorMessage));
    });

    /**
     * Handle end of CSV stream
     *
     * Processes any remaining rows in the final partial batch
     * and completes the import operation.
     */
    parser.on('end', async () => {
      try {
        // Insert any remaining rows in final batch
        if (currentBatch.length > 0) {
          await insertBatch(currentBatch, currentBatchNumber, stats, logManager);
        }

        stats.endTime = new Date();
        logManager.log('Import completed');
        resolve(stats);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Insert a batch of pageviews into the database
 *
 * Coordinates database insertion with error handling:
 * 1. Logs batch insertion attempt
 * 2. Calls batch inserter with retry logic
 * 3. Updates statistics based on result (inserted, failed, and skipped counts)
 * 4. Logs success or failure details
 *
 * Errors at the batch level (database connection, constraint violations)
 * are logged but don't throw - they're captured in stats for reporting.
 *
 * @param batch - Array of validated pageview records to insert
 * @param batchNumber - Sequential batch number for logging/tracking
 * @param stats - Import statistics object to update with results
 * @param logManager - LogManager for writing detailed logs
 * @returns Promise that resolves when batch insert completes (success or failure)
 *
 * @example
 * const batch = [validPageview1, validPageview2, ...];
 * await insertBatch(batch, 1, stats, logManager);
 */
async function insertBatch(
  batch: PageviewPayload[],
  batchNumber: number,
  stats: ImportStats,
  logManager: LogManager
): Promise<void> {
  logManager.log(`Inserting batch ${batchNumber} (${batch.length} rows)...`);

  const result = await insertPageviewBatch(batch, batchNumber);

  if (result.success) {
    stats.successCount += result.insertedCount;
    stats.skippedCount += result.skippedCount;
    stats.batchesProcessed++;
    logManager.log(
      `Batch ${batchNumber} processed: ${result.insertedCount} inserted, ${result.skippedCount} duplicates skipped`
    );
  } else {
    stats.failedCount += result.failedCount;
    stats.skippedCount += result.skippedCount;
    const errorMessage = result.error || 'Unknown database error';
    stats.databaseErrors.push({
      batchNumber,
      error: errorMessage,
    });
    logManager.logError(`Batch ${batchNumber} failed: ${errorMessage}`);
  }
}

/**
 * Print summary report to console
 *
 * Generates human-readable summary of import operation including:
 * - Total counts (processed, inserted, skipped, failed)
 * - Performance metrics (duration, rows/second)
 * - Validation errors (first 20 with row numbers)
 * - Database errors (all batches that failed)
 * - Path to detailed log file
 * - Contextual success message based on import outcome
 *
 * Validation errors are limited to first 20 in console to prevent
 * overwhelming output. All errors are available in the log file.
 *
 * @param stats - Import statistics from completed import
 * @param logFilePath - Path to detailed log file for reference
 *
 * @example
 * printConsoleSummary(stats, '/path/to/logs/import-2024-10-24.log');
 */
function printConsoleSummary(stats: ImportStats, logFilePath: string): void {
  const durationMs = stats.endTime
    ? stats.endTime.getTime() - stats.startTime.getTime()
    : 0;
  const durationSeconds = (durationMs / 1000).toFixed(2);
  const rowsPerSecond =
    durationMs > 0 ? ((stats.successCount / durationMs) * 1000).toFixed(2) : '0';

  console.log('');
  console.log('='.repeat(60));
  console.log('CSV Import Complete');
  console.log('-'.repeat(60));
  console.log(`Rows Processed:     ${stats.totalRows}`);
  console.log(`Rows Inserted:      ${stats.successCount}`);
  console.log(`Rows Skipped:       ${stats.skippedCount} (duplicates)`);
  console.log(`Rows Failed:        ${stats.failedCount}`);
  console.log(`Page IDs Replaced:  ${stats.pageIdReplacedCount} (UUID v4 → CUID2)`);
  console.log('');
  console.log(`Duration: ${durationMs}ms (${durationSeconds}s)`);
  console.log(`Performance: ${rowsPerSecond} rows/second`);
  console.log('');

  // Determine success message based on import outcome
  if (stats.successCount > 0 && stats.skippedCount === 0) {
    console.log(`Import successful: ${stats.successCount} pageviews imported.`);
  } else if (stats.successCount > 0 && stats.skippedCount > 0) {
    console.log(
      `Import successful: Imported ${stats.successCount} new pageviews, skipped ${stats.skippedCount} duplicates.`
    );
  } else if (stats.successCount === 0 && stats.skippedCount > 0) {
    console.log(
      `Import successful: No new data to import (all rows already exist).`
    );
  }
  console.log('');

  // Print validation errors (limited to first 20)
  if (stats.validationErrors.length > 0) {
    console.log('Validation Errors (showing first 20):');
    const errorsToShow = stats.validationErrors.slice(0, MAX_CONSOLE_ERRORS);
    errorsToShow.forEach((err) => {
      console.log(`  Row ${err.rowNumber}: ${err.error}`);
    });
    if (stats.validationErrors.length > MAX_CONSOLE_ERRORS) {
      console.log(
        `  ... and ${stats.validationErrors.length - MAX_CONSOLE_ERRORS} more validation errors`
      );
    }
    console.log('');
  }

  // Print database errors (all of them - typically fewer than validation errors)
  if (stats.databaseErrors.length > 0) {
    console.log('Database Errors:');
    stats.databaseErrors.forEach((err) => {
      console.log(`  Batch ${err.batchNumber}: ${err.error}`);
    });
    console.log('');
  }

  console.log(`Full log: ${logFilePath}`);
  console.log('='.repeat(60));
}

/**
 * Main script execution
 *
 * Entry point for the CSV import script. Handles:
 * 1. Command-line argument parsing
 * 2. File path validation
 * 3. Log manager initialization
 * 4. Import execution
 * 5. Summary generation and output
 * 6. Exit code determination (success if rows imported OR all rows skipped as duplicates)
 * 7. Database cleanup (disconnect)
 *
 * Exit codes:
 * - 0: Import succeeded (at least one row imported OR all rows skipped as duplicates)
 * - 1: Import failed (no rows imported and none skipped as duplicates)
 *
 * @throws Never throws - all errors are caught and result in process.exit(1)
 *
 * @example
 * // Run via npm script
 * npm run import:csv -- ./data/pageviews.csv
 *
 * @example
 * // Run directly with ts-node
 * npx ts-node app/scripts/import-csv.ts ./data/pageviews.csv
 */
async function main() {
  console.log('='.repeat(60));
  console.log('CSV Import Script');
  console.log('='.repeat(60));
  console.log('');

  // Get file path from command-line arguments
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Error: File path is required');
    console.error('Usage: npm run import:csv -- ./path/to/file.csv');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  console.log(`File: ${resolvedPath}`);
  console.log(`Start time: ${new Date().toISOString()}`);
  console.log('');

  // Initialize log manager
  const logsDir = path.join(process.cwd(), 'logs');
  const logManager = new LogManager(logsDir);
  console.log(`Log file: ${logManager.getLogFilePath()}`);
  console.log('');

  try {
    // Execute import
    const stats = await importCsv(resolvedPath, logManager);

    // Write summary to log file
    const durationMs = stats.endTime
      ? stats.endTime.getTime() - stats.startTime.getTime()
      : 0;

    logManager.logSummary({
      totalRows: stats.totalRows,
      successCount: stats.successCount,
      failedCount: stats.failedCount,
      skippedCount: stats.skippedCount,
      durationMs,
      batchesProcessed: stats.batchesProcessed,
    });

    // Write all errors to log file
    if (stats.validationErrors.length > 0) {
      logManager.logValidationErrors(stats.validationErrors);
    }

    if (stats.databaseErrors.length > 0) {
      logManager.logDatabaseErrors(stats.databaseErrors);
    }

    // Close log file
    logManager.close();

    // Print summary to console
    printConsoleSummary(stats, logManager.getLogFilePath());

    // Exit with success if:
    // - At least some rows were imported, OR
    // - All rows were skipped as duplicates (valid re-import scenario)
    if (stats.successCount > 0 || (stats.successCount === 0 && stats.skippedCount > 0)) {
      process.exit(0);
    } else {
      console.error('Import failed: No rows were successfully imported');
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('IMPORT FAILED');
    console.error('='.repeat(60));
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`End time: ${new Date().toISOString()}`);
    console.error('='.repeat(60));

    // Log error and close log file
    logManager.logError(
      `Import failed: ${error instanceof Error ? error.message : String(error)}`
    );
    logManager.close();

    process.exit(1);
  } finally {
    // Always disconnect from database to prevent hanging process
    await disconnectPrisma();
  }
}

// Run the script
main();
