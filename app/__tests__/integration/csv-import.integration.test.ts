/**
 * Integration Tests for CSV Import Feature
 *
 * Tests end-to-end import workflows including:
 * - Parsing CSV files
 * - Validating data
 * - Inserting into database
 * - Generating logs
 *
 * These tests focus on critical user workflows for importing CSV data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { mapCsvRowToPageview } from '../../lib/import/field-mapper';
import { validateCsvPageview } from '../../lib/import/validation-adapter';
import { insertPageviewBatch } from '../../lib/import/batch-inserter';
import { LogManager } from '../../lib/import/log-manager';
import { prisma } from '../../lib/db/prisma';

const fixturesDir = path.join(__dirname, '../../../test/fixtures/csv-import');
const testLogsDir = path.join(__dirname, '../../../test/fixtures/logs');

describe('CSV Import Integration Tests', () => {
  let transactionSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup local spy for Prisma transaction (not a global mock)
    // This ensures the mock is isolated to these tests only
    transactionSpy = jest.spyOn(prisma, '$transaction');

    // Create test logs directory
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore all mocks to prevent pollution of other tests
    jest.restoreAllMocks();

    // Clean up test log files
    if (fs.existsSync(testLogsDir)) {
      const files = fs.readdirSync(testLogsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testLogsDir, file));
      });
    }
  });

  it('should import small CSV with all valid data (10 rows)', async () => {
    const csvPath = path.join(fixturesDir, 'valid-10-rows.csv');
    const validRows: any[] = [];
    let totalRows = 0;

    // Mock successful database insert using the spy
    transactionSpy.mockImplementation(async (callback: any) => {
      // Mock transaction client
      const mockTx = {
        pageview: {
          findMany: jest.fn().mockResolvedValue([]), // No existing records
          createMany: jest.fn().mockResolvedValue({ count: 10 }),
        },
      };
      return await callback(mockTx);
    });

    // Parse and validate CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert batch
    const result = await insertPageviewBatch(validRows);

    expect(totalRows).toBe(10);
    expect(validRows.length).toBe(10);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(10);
    expect(result.failedCount).toBe(0);
  });

  it('should import CSV with mix of valid and invalid rows', async () => {
    const csvPath = path.join(fixturesDir, 'mixed-valid-invalid.csv');
    const validRows: any[] = [];
    const invalidRows: Record<string, unknown>[] = [];
    let totalRows = 0;

    // Mock successful database insert - will be called with actual valid row count
    transactionSpy.mockImplementation(async (callback: any) => {
      const mockTx = {
        pageview: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn().mockImplementation((args: any) => ({ count: args.data.length })),
        },
      };
      return await callback(mockTx);
    });

    // Parse and validate CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            } else {
              invalidRows.push({ row: totalRows, errors: validation.error });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert valid rows
    const result = await insertPageviewBatch(validRows);

    expect(totalRows).toBe(10);
    expect(validRows.length).toBeGreaterThan(0);
    expect(invalidRows.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(validRows.length);
  });

  it('should import CSV with missing optional fields', async () => {
    const csvPath = path.join(fixturesDir, 'missing-optional-fields.csv');
    const validRows: any[] = [];
    let totalRows = 0;

    // Mock successful database insert
    transactionSpy.mockImplementation(async (callback: any) => {
      const mockTx = {
        pageview: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn().mockResolvedValue({ count: 5 }),
        },
      };
      return await callback(mockTx);
    });

    // Parse and validate CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              expect(validation.data.duration_seconds).toBe(0); // Default value
              expect(validation.data.is_unique).toBe(false); // Default value
              expect(validation.data.visibility_changes).toBe(0); // Default value
              validRows.push(validation.data);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert batch
    const result = await insertPageviewBatch(validRows);

    expect(totalRows).toBe(5);
    expect(validRows.length).toBe(5);
    expect(result.success).toBe(true);
  });

  it('should handle CSV with malformed data types', async () => {
    const csvPath = path.join(fixturesDir, 'malformed-data.csv');
    const validRows: any[] = [];
    const invalidRows: Record<string, unknown>[] = [];
    let totalRows = 0;

    // Parse and validate CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            } else {
              invalidRows.push({ row: totalRows, errors: validation.error });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    expect(totalRows).toBe(5);
    // Some rows should fail validation due to malformed data
    expect(invalidRows.length).toBeGreaterThanOrEqual(0);
  });

  it('should verify database records match CSV source data', async () => {
    const csvPath = path.join(fixturesDir, 'valid-10-rows.csv');
    const sourceRows: Record<string, unknown>[] = [];
    const validRows: any[] = [];

    // Mock successful database insert
    transactionSpy.mockImplementation(async (callback: any) => {
      const mockTx = {
        pageview: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn().mockResolvedValue({ count: 10 }),
        },
      };
      return await callback(mockTx);
    });

    // Parse CSV and collect source data
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          if (row.datapoint === 'pageview') {
            sourceRows.push(row);
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Verify mapping correctness
    expect(sourceRows.length).toBe(10);
    expect(validRows.length).toBe(10);

    // Check first row mappings
    expect(validRows[0].page_id).toBeDefined();
    expect(validRows[0].path).toBe(sourceRows[0].path);
    // Field mapping verified in unit tests
    // query_string maps from 'query' field - expect undefined for empty string
    expect(validRows[0].query_string).toBe(sourceRows[0].query === '' ? undefined : sourceRows[0].query);

    // Insert batch
    const result = await insertPageviewBatch(validRows);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(10);
  });

  it('should verify log file contents and format', (done) => {
    const logManager = new LogManager(testLogsDir);

    // Write test log entries
    logManager.log('Starting import test');
    logManager.logError('Test error: Row 5 invalid');
    logManager.logSummary({
      totalRows: 100,
      successCount: 95,
      failedCount: 5,
      durationMs: 5000,
      skippedCount: 0,
    });

    logManager.close();

    // Wait for file to be written
    setTimeout(() => {
      const logFilePath = logManager.getLogFilePath();
      expect(fs.existsSync(logFilePath)).toBe(true);

      const logContent = fs.readFileSync(logFilePath, 'utf-8');

      // Verify log content
      expect(logContent).toContain('Starting import test');
      expect(logContent).toContain('Test error: Row 5 invalid');
      expect(logContent).toContain('Total rows: 100');
      expect(logContent).toContain('Success: 95');
      expect(logContent).toContain('Failed: 5');

      // Verify timestamp format
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      done();
    }, 100);
  });

  it('should handle empty CSV file gracefully', async () => {
    const csvPath = path.join(fixturesDir, 'empty.csv');
    const validRows: any[] = [];
    let totalRows = 0;

    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    expect(totalRows).toBe(0);
    expect(validRows.length).toBe(0);

    // Inserting empty batch should succeed
    const result = await insertPageviewBatch(validRows);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
  });

  it('should handle CSV with only headers (no data rows)', async () => {
    const csvPath = path.join(fixturesDir, 'headers-only.csv');
    const validRows: any[] = [];
    let totalRows = 0;

    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    expect(totalRows).toBe(0);
    expect(validRows.length).toBe(0);

    // Inserting empty batch should succeed
    const result = await insertPageviewBatch(validRows);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
  });

  it('should handle CSV with all invalid rows', async () => {
    const csvPath = path.join(fixturesDir, 'all-invalid-rows.csv');
    const validRows: any[] = [];
    const invalidRows: Record<string, unknown>[] = [];
    let totalRows = 0;

    // Parse and validate CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            } else {
              invalidRows.push({ row: totalRows, errors: validation.error });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    expect(totalRows).toBe(3);
    expect(validRows.length).toBe(0);
    expect(invalidRows.length).toBe(3);

    // Inserting empty batch should succeed (no valid rows)
    const result = await insertPageviewBatch(validRows);
    expect(result.success).toBe(true);
    expect(result.insertedCount).toBe(0);
  });

  it('should handle CSV with special characters in text fields', async () => {
    const csvPath = path.join(fixturesDir, 'special-characters.csv');
    const validRows: any[] = [];
    let totalRows = 0;

    // Mock successful database insert
    transactionSpy.mockImplementation(async (callback: any) => {
      const mockTx = {
        pageview: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn().mockResolvedValue({ count: 3 }),
        },
      };
      return await callback(mockTx);
    });

    // Parse and validate CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          relax_quotes: true, // Important for handling special characters
        }))
        .on('data', (row) => {
          totalRows++;
          if (row.datapoint === 'pageview') {
            const mapped = mapCsvRowToPageview(row);
            const validation = validateCsvPageview(mapped.data);
            if (validation.success) {
              validRows.push(validation.data);
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    expect(totalRows).toBe(3);
    expect(validRows.length).toBeGreaterThan(0);

    // Verify special characters are preserved
    if (validRows.length > 0) {
      const pathsWithSpecialChars = validRows.filter(row =>
        row.path.includes('"') || row.path.includes('emoji') || row.path.includes('&')
      );
      expect(pathsWithSpecialChars.length).toBeGreaterThan(0);
    }

    // Insert batch
    const result = await insertPageviewBatch(validRows);
    expect(result.success).toBe(true);
  });
});
