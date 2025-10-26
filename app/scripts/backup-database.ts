#!/usr/bin/env ts-node

/**
 * Database Backup Script
 *
 * Exports all pageviews to a timestamped JSON backup file for safety.
 * Run this before any destructive database operations.
 *
 * Usage:
 *   npm run backup:database
 *   OR
 *   npx ts-node scripts/backup-database.ts
 *
 * Output:
 *   Creates backups/pageviews-backup-YYYY-MM-DD-HHmmss.json
 *
 * Features:
 * - Exports all pageview records as JSON
 * - Timestamped filenames for multiple backups
 * - Progress reporting
 * - File size reporting
 * - Automatic backup directory creation
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Format date for filename: YYYY-MM-DD-HHmmss
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Main backup function
 */
async function backupDatabase(): Promise<void> {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('Database Backup Utility');
  console.log('========================================\n');

  try {
    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      console.log(`✓ Created backups directory: ${backupsDir}`);
    }

    // Generate timestamped filename
    const timestamp = formatTimestamp(new Date());
    const filename = `pageviews-backup-${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    console.log(`Backup file: ${filename}\n`);

    // Count total records
    console.log('Counting pageviews...');
    const totalCount = await prisma.pageview.count();
    console.log(`Total pageviews to backup: ${totalCount.toLocaleString()}\n`);

    if (totalCount === 0) {
      console.log('⚠️  Warning: No pageviews found in database. Nothing to backup.');
      return;
    }

    // Fetch all pageviews
    console.log('Fetching pageviews from database...');
    const pageviews = await prisma.pageview.findMany({
      orderBy: {
        added_iso: 'asc',
      },
    });

    console.log(`✓ Fetched ${pageviews.length.toLocaleString()} records`);

    // Convert BigInt values to strings for JSON serialization
    const serializable = pageviews.map(pv => ({
      ...pv,
      added_iso: pv.added_iso.toISOString(),
      created_at: pv.created_at.toISOString(),
    }));

    // Write to file
    console.log('Writing to backup file...');
    const jsonContent = JSON.stringify(serializable, null, 2);
    fs.writeFileSync(filepath, jsonContent, 'utf-8');

    // Get file stats
    const stats = fs.statSync(filepath);
    const fileSize = formatFileSize(stats.size);

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

    console.log('\n========================================');
    console.log('Backup Completed Successfully');
    console.log('========================================');
    console.log(`File: ${filepath}`);
    console.log(`Records: ${totalCount.toLocaleString()}`);
    console.log(`File size: ${fileSize}`);
    console.log(`Time elapsed: ${elapsedSeconds}s`);
    console.log('\n✓ Backup saved successfully!\n');

  } catch (error) {
    console.error('\n✗ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup if executed directly
if (require.main === module) {
  backupDatabase()
    .then(() => {
      console.log('Backup script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nBackup script failed:', error);
      process.exit(1);
    });
}

export { backupDatabase };
