/**
 * Log Manager for CSV Import
 *
 * Manages log file creation, writing import progress, and formatting output.
 * Creates timestamped log files for detailed import tracking.
 *
 * Features:
 * - Timestamped log file generation
 * - Detailed import progress logging
 * - Validation and database error logging
 * - Summary report generation with skipped duplicates tracking
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Summary statistics for import operation
 */
export interface ImportSummary {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
  batchesProcessed?: number;
  rowsPerSecond?: number;
}

/**
 * LogManager class for handling CSV import logging
 */
export class LogManager {
  private logFilePath: string;
  private logStream: fs.WriteStream;

  /**
   * Creates a new LogManager instance
   *
   * @param logsDir - Directory to store log files (default: 'logs')
   */
  constructor(logsDir: string = 'logs') {
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Generate timestamped filename
    const timestamp = this.generateTimestamp();
    const filename = `import-${timestamp}.log`;
    this.logFilePath = path.join(logsDir, filename);

    // Create write stream
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });

    // Write initial log header
    this.writeHeader();
  }

  /**
   * Generates timestamp for log filename
   * Format: YYYY-MM-DDTHH-MM-SS
   */
  private generateTimestamp(): string {
    const now = new Date();
    return now
      .toISOString()
      .replace(/\.\d{3}Z$/, '')
      .replace(/:/g, '-');
  }

  /**
   * Generates timestamp for log entries
   * Format: YYYY-MM-DDTHH:MM:SS
   */
  private generateLogTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/\.\d{3}Z$/, '');
  }

  /**
   * Writes log file header
   */
  private writeHeader(): void {
    this.logStream.write('='.repeat(80) + '\n');
    this.logStream.write('CSV Import Log\n');
    this.logStream.write(`Started: ${new Date().toISOString()}\n`);
    this.logStream.write('='.repeat(80) + '\n\n');
  }

  /**
   * Writes a log message with timestamp
   *
   * @param message - Message to log
   */
  log(message: string): void {
    const timestamp = this.generateLogTimestamp();
    this.logStream.write(`[${timestamp}] ${message}\n`);
  }

  /**
   * Writes an error message to the log
   *
   * @param message - Error message to log
   */
  logError(message: string): void {
    const timestamp = this.generateLogTimestamp();
    this.logStream.write(`[${timestamp}] ERROR: ${message}\n`);
  }

  /**
   * Writes a warning message to the log
   *
   * @param message - Warning message to log
   */
  logWarning(message: string): void {
    const timestamp = this.generateLogTimestamp();
    this.logStream.write(`[${timestamp}] WARNING: ${message}\n`);
  }

  /**
   * Writes import summary to log file
   *
   * Includes counts for total rows, successful insertions, failures,
   * and duplicate skips, along with performance metrics.
   *
   * @param summary - Import summary statistics
   */
  logSummary(summary: ImportSummary): void {
    const durationSeconds = (summary.durationMs / 1000).toFixed(2);
    const rowsPerSecond = summary.rowsPerSecond
      ? summary.rowsPerSecond.toFixed(2)
      : ((summary.successCount / summary.durationMs) * 1000).toFixed(2);

    this.logStream.write('\n');
    this.logStream.write('='.repeat(80) + '\n');
    this.logStream.write('Import Summary\n');
    this.logStream.write('='.repeat(80) + '\n');
    this.logStream.write(`Total rows: ${summary.totalRows}\n`);
    this.logStream.write(`Success: ${summary.successCount}\n`);
    this.logStream.write(`Skipped: ${summary.skippedCount} (duplicates)\n`);
    this.logStream.write(`Failed: ${summary.failedCount}\n`);

    if (summary.batchesProcessed !== undefined) {
      this.logStream.write(`Batches processed: ${summary.batchesProcessed}\n`);
    }

    this.logStream.write(`Duration: ${summary.durationMs}ms (${durationSeconds}s)\n`);
    this.logStream.write(`Performance: ${rowsPerSecond} rows/second\n`);
    this.logStream.write('='.repeat(80) + '\n');
  }

  /**
   * Writes validation errors to log file
   *
   * @param errors - Array of validation errors
   */
  logValidationErrors(
    errors: Array<{ rowNumber: number; error: string }>
  ): void {
    if (errors.length === 0) return;

    this.logStream.write('\n');
    this.logStream.write('Validation Errors:\n');
    this.logStream.write('-'.repeat(80) + '\n');

    errors.forEach(err => {
      this.logStream.write(`Row ${err.rowNumber}: ${err.error}\n`);
    });
  }

  /**
   * Writes database errors to log file
   *
   * @param errors - Array of database errors
   */
  logDatabaseErrors(
    errors: Array<{ batchNumber: number; error: string }>
  ): void {
    if (errors.length === 0) return;

    this.logStream.write('\n');
    this.logStream.write('Database Errors:\n');
    this.logStream.write('-'.repeat(80) + '\n');

    errors.forEach(err => {
      this.logStream.write(`Batch ${err.batchNumber}: ${err.error}\n`);
    });
  }

  /**
   * Flushes any buffered data to the log file
   */
  flush(): void {
    // For WriteStream, we don't need explicit flush as it auto-flushes
    // But we can force it by ending and recreating if needed
  }

  /**
   * Closes the log file
   */
  close(): void {
    this.logStream.write('\n');
    this.logStream.write(`Completed: ${new Date().toISOString()}\n`);
    this.logStream.write('='.repeat(80) + '\n');
    this.logStream.end();
  }

  /**
   * Gets the path to the current log file
   *
   * @returns Full path to log file
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}
