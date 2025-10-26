#!/usr/bin/env ts-node

/**
 * Manual Cleanup Script for Old Pageviews
 * Can be run manually or scheduled via cron
 *
 * Usage:
 *   npx ts-node scripts/cleanup-pageviews.ts
 *   OR
 *   node -r ts-node/register scripts/cleanup-pageviews.ts
 */

import { cleanupOldPageviews } from '../lib/jobs/cleanup-old-pageviews';
import { disconnectPrisma } from '../lib/db/prisma';

async function main() {
  console.log('='.repeat(60));
  console.log('Pageview Cleanup Script');
  console.log('='.repeat(60));
  console.log('');

  const scriptStartTime = new Date();
  console.log(`Start time: ${scriptStartTime.toISOString()}`);
  console.log('');

  try {
    // Execute cleanup job
    const result = await cleanupOldPageviews();

    console.log('');
    console.log('='.repeat(60));
    console.log('Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`Total records deleted: ${result.totalDeleted}`);
    console.log(`Batches processed: ${result.batchesProcessed}`);
    console.log(`Duration: ${result.durationMs}ms (${(result.durationMs / 1000).toFixed(2)}s)`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('Error Details:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('');
    const scriptEndTime = new Date();
    console.log(`End time: ${scriptEndTime.toISOString()}`);
    console.log('='.repeat(60));

    // Exit with success status
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('CLEANUP FAILED');
    console.error('='.repeat(60));
    console.error(error instanceof Error ? error.message : String(error));

    const scriptEndTime = new Date();
    console.error(`End time: ${scriptEndTime.toISOString()}`);
    console.error('='.repeat(60));

    // Exit with failure status
    process.exit(1);
  } finally {
    // Always disconnect from database
    await disconnectPrisma();
  }
}

// Run the script
main();
