#!/usr/bin/env ts-node

/**
 * Delete Historical Pageviews Script
 *
 * Deletes pageviews before a specified cutoff date.
 * Used to remove historical data that needs to be re-imported with corrections.
 *
 * Usage:
 *   npm run delete:historical              # Dry-run mode (shows what would be deleted)
 *   npm run delete:historical:execute      # Execute mode (actually deletes)
 *
 * Safety Features:
 * - Dry-run mode by default
 * - Shows count of records to be deleted
 * - 5-second warning countdown in execute mode
 * - Transaction support for atomic deletion
 * - Progress reporting
 *
 * IMPORTANT: Always run backup script first!
 *   npm run backup:database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cutoff date - pageviews before this date will be deleted
 * Set to November 30, 2024 00:00:00 UTC
 */
const CUTOFF_DATE = new Date('2024-11-30T00:00:00.000Z');

/**
 * Delete pageviews before the cutoff date
 *
 * @param dryRun - If true, only shows what would be deleted without actually deleting
 */
async function deleteHistoricalPageviews(dryRun: boolean = true): Promise<void> {
  const mode = dryRun ? 'DRY-RUN' : 'EXECUTE';
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('Delete Historical Pageviews');
  console.log('========================================');
  console.log(`Mode: ${mode}`);
  console.log(`Cutoff date: ${CUTOFF_DATE.toISOString()}`);
  console.log(`Action: Delete all pageviews BEFORE ${CUTOFF_DATE.toISOString()}`);

  if (!dryRun) {
    console.log('\n⚠️  WARNING: EXECUTE MODE - This will PERMANENTLY delete database records!');
    console.log('⚠️  Ensure you have created a backup before proceeding.');
    console.log('⚠️  Run: npm run backup:database');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log('\n');

  try {
    // Count records that will be deleted
    console.log('Counting pageviews to delete...');
    const countToDelete = await prisma.pageview.count({
      where: {
        added_iso: {
          lt: CUTOFF_DATE,
        },
      },
    });

    console.log(`Total pageviews to delete: ${countToDelete.toLocaleString()}`);

    if (countToDelete === 0) {
      console.log('\n✓ No pageviews found before cutoff date. Nothing to delete.');
      return;
    }

    // Get date range statistics
    const oldestRecord = await prisma.pageview.findFirst({
      where: {
        added_iso: {
          lt: CUTOFF_DATE,
        },
      },
      orderBy: {
        added_iso: 'asc',
      },
      select: {
        added_iso: true,
      },
    });

    if (oldestRecord) {
      console.log(`Oldest record: ${oldestRecord.added_iso.toISOString()}`);
    }

    // Show sample of records to be deleted
    console.log('\nSample records (first 5):');
    const sampleRecords = await prisma.pageview.findMany({
      where: {
        added_iso: {
          lt: CUTOFF_DATE,
        },
      },
      orderBy: {
        added_iso: 'asc',
      },
      take: 5,
      select: {
        id: true,
        added_iso: true,
        path: true,
        is_unique: true,
      },
    });

    sampleRecords.forEach((record, idx) => {
      console.log(
        `  ${idx + 1}. ${record.added_iso.toISOString()} | ${record.path} | is_unique: ${record.is_unique}`
      );
    });

    if (dryRun) {
      console.log('\n========================================');
      console.log('Dry-Run Complete');
      console.log('========================================');
      console.log(`Would delete: ${countToDelete.toLocaleString()} pageviews`);
      console.log('\nℹ️  This was a DRY-RUN. No changes were applied.');
      console.log('ℹ️  Run with --execute flag to actually delete: npm run delete:historical:execute');
      return;
    }

    // Execute deletion in transaction
    console.log('\nDeleting pageviews...');
    const result = await prisma.$transaction(async (tx) => {
      return await tx.pageview.deleteMany({
        where: {
          added_iso: {
            lt: CUTOFF_DATE,
          },
        },
      });
    });

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

    console.log('\n========================================');
    console.log('Deletion Completed Successfully');
    console.log('========================================');
    console.log(`Deleted: ${result.count.toLocaleString()} pageviews`);
    console.log(`Time elapsed: ${elapsedSeconds}s`);
    console.log('\n✓ Historical data deleted successfully!');
    console.log('\nNext steps:');
    console.log('  1. Re-import CSV: npm run import:csv -- data/2025-10-16_franksblog_nl_datapoints.csv');
    console.log('  2. Verify dashboard displays unique visitors correctly');

  } catch (error) {
    console.error('\n✗ Deletion failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run deletion if executed directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  deleteHistoricalPageviews(!executeMode)
    .then(() => {
      console.log('\nScript finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nScript failed:', error);
      process.exit(1);
    });
}

export { deleteHistoricalPageviews };
