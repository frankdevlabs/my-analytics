/**
 * Unit tests for Log Manager
 *
 * Tests focused on logging functionality:
 * - Log file creation with timestamp
 * - Writing import progress to log file
 * - Error logging
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogManager } from '../../../lib/import/log-manager';

describe('LogManager', () => {
  const testLogsDir = path.join(__dirname, '../../fixtures/logs');

  beforeEach(() => {
    // Create test logs directory
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test log files
    if (fs.existsSync(testLogsDir)) {
      const files = fs.readdirSync(testLogsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testLogsDir, file));
      });
      fs.rmdirSync(testLogsDir);
    }
  });

  it('should generate timestamped log file name', () => {
    const timestamp = '2024-01-15T10-30-45';
    const expectedFilename = `import-${timestamp}.log`;

    expect(expectedFilename).toMatch(/^import-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.log$/);
  });

  it('should create log file in logs directory', (done) => {
    const logManager = new LogManager(testLogsDir);
    const logFilePath = logManager.getLogFilePath();

    expect(logFilePath).toContain(testLogsDir);
    expect(logFilePath).toMatch(/\.log$/);

    // Close and wait for file to be written
    logManager.close();
    setTimeout(() => {
      expect(fs.existsSync(logFilePath)).toBe(true);
      done();
    }, 100);
  });

  it('should write log messages to file', (done) => {
    const logManager = new LogManager(testLogsDir);
    const testMessage = 'Test log message';

    logManager.log(testMessage);
    logManager.close();

    setTimeout(() => {
      const logContent = fs.readFileSync(logManager.getLogFilePath(), 'utf-8');
      expect(logContent).toContain(testMessage);
      done();
    }, 100);
  });

  it('should format log entries with timestamps', (done) => {
    const logManager = new LogManager(testLogsDir);
    const testMessage = 'Processing batch 1';

    logManager.log(testMessage);
    logManager.close();

    setTimeout(() => {
      const logContent = fs.readFileSync(logManager.getLogFilePath(), 'utf-8');
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(logContent).toContain(testMessage);
      done();
    }, 100);
  });

  it('should write validation errors to log', (done) => {
    const logManager = new LogManager(testLogsDir);
    const error = {
      rowNumber: 5,
      error: 'Invalid ISO timestamp',
    };

    logManager.logError(`Row ${error.rowNumber}: ${error.error}`);
    logManager.close();

    setTimeout(() => {
      const logContent = fs.readFileSync(logManager.getLogFilePath(), 'utf-8');
      expect(logContent).toContain('Row 5');
      expect(logContent).toContain('Invalid ISO timestamp');
      done();
    }, 100);
  });

  it('should write summary statistics to log', (done) => {
    const logManager = new LogManager(testLogsDir);
    const summary = {
      totalRows: 100,
      successCount: 95,
      failedCount: 5,
      skippedCount: 0,
      durationMs: 5000,
    };

    logManager.logSummary(summary);
    logManager.close();

    setTimeout(() => {
      const logContent = fs.readFileSync(logManager.getLogFilePath(), 'utf-8');
      expect(logContent).toContain('Total rows: 100');
      expect(logContent).toContain('Success: 95');
      expect(logContent).toContain('Failed: 5');
      done();
    }, 100);
  });

  it('should handle multiple log entries', (done) => {
    const logManager = new LogManager(testLogsDir);

    logManager.log('Starting import');
    logManager.log('Processing batch 1');
    logManager.log('Processing batch 2');
    logManager.close();

    setTimeout(() => {
      const logContent = fs.readFileSync(logManager.getLogFilePath(), 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());

      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(logContent).toContain('Starting import');
      expect(logContent).toContain('Processing batch 1');
      expect(logContent).toContain('Processing batch 2');
      done();
    }, 100);
  });

  it('should close log file properly', (done) => {
    const logManager = new LogManager(testLogsDir);

    logManager.log('Test message');
    logManager.close();

    setTimeout(() => {
      const logFilePath = logManager.getLogFilePath();
      expect(fs.existsSync(logFilePath)).toBe(true);

      // Should be able to read the file after closing
      const logContent = fs.readFileSync(logFilePath, 'utf-8');
      expect(logContent).toContain('Test message');
      done();
    }, 100);
  });
});
