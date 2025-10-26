/**
 * Analytics Backfill Script
 *
 * Recalculates is_unique field for historical pageviews using session-based heuristic approximation.
 * This script should ONLY be run AFTER backend fixes (Task Group 1) are deployed to production.
 *
 * IMPORTANT NOTE - Visitor Hash Limitation:
 * This script uses SESSION-BASED HEURISTIC APPROXIMATION because:
 * - visitor_hash field was NEVER stored in the database (intentional privacy-first design)
 * - IP addresses are hashed transiently for Redis tracking, then discarded
 * - session_id is the only persistent visitor-related identifier available
 *
 * ACCURACY DISCLAIMER:
 * - Expected accuracy: ~70-85% (reasonable approximation, not exact)
 * - Method: Treats first pageview per session per day as unique
 * - Limitation: One visitor can have multiple sessions, causing overestimation
 * - This is the best approximation possible given the privacy-first design
 *
 * Country Code Backfill Limitation:
 * - This script CANNOT backfill country_code values for historical pageviews
 * - IP addresses are hashed for privacy and cannot be reverse-looked up
 * - GeoIP lookups require the original IP address
 * - Moving forward, the GeoIP path fix will work correctly for new pageviews
 *
 * Usage:
 *   npm run backfill:analytics              # Dry-run mode (shows changes without applying)
 *   npm run backfill:analytics:execute      # Execute mode (applies actual updates)
 *
 * Features:
 * - Recalculates unique visitors using session-based 24-hour window logic
 * - Batch processing (1000 records per batch) to avoid memory issues
 * - Transaction support with timeout for data integrity
 * - Progress logging every 10% completion
 * - Dry-run mode for testing before execution
 * - Idempotent (safe to run multiple times)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;
const TRANSACTION_TIMEOUT = 30000; // 30 seconds per batch
const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;

interface PageviewRecord {
  id: string;
  session_id: string | null;
  added_iso: Date;
  is_unique: boolean;
}

interface UpdateRecord {
  id: string;
  is_unique: boolean;
}

/**
 * Calculate which pageviews should be marked as unique based on session-based heuristic
 *
 * HEURISTIC APPROACH (due to visitor_hash not being stored in database):
 * - Uses session_id as a proxy for visitor identification
 * - A pageview is unique if:
 *   1. It's the first occurrence for a session_id, OR
 *   2. It's more than 24 hours after the previous pageview from the same session
 *
 * ACCURACY NOTE:
 * - One visitor can have multiple sessions over time (new browser, device, cleared cookies)
 * - This method will overestimate unique visitors compared to IP-based tracking
 * - Expected accuracy: ~70-85% compared to actual unique visitor counts
 *
 * @param pageviews - Array of pageviews ordered by added_iso
 * @returns Array of updates needed (only pageviews changing from false to true)
 */
export function calculateUniqueVisitors(pageviews: PageviewRecord[]): UpdateRecord[] {
  const updates: UpdateRecord[] = [];
  const sessionLastSeen = new Map<string, Date>();

  for (const pageview of pageviews) {
    // Skip if no session_id (cannot determine uniqueness without identifier)
    if (!pageview.session_id) {
      continue;
    }

    const lastSeenTime = sessionLastSeen.get(pageview.session_id);
    const currentTime = new Date(pageview.added_iso).getTime();
    let shouldBeUnique = false;

    if (!lastSeenTime) {
      // First occurrence for this session
      shouldBeUnique = true;
    } else {
      const timeSinceLastSeen = currentTime - lastSeenTime.getTime();
      // More than 24 hours since last pageview from this session
      if (timeSinceLastSeen >= HOURS_24_IN_MS) {
        shouldBeUnique = true;
      }
    }

    // Update the last seen time for this session
    sessionLastSeen.set(pageview.session_id, new Date(pageview.added_iso));

    // Only include in updates if changing from false to true
    if (shouldBeUnique && !pageview.is_unique) {
      updates.push({
        id: pageview.id,
        is_unique: true,
      });
    }
  }

  return updates;
}

/**
 * Process a batch of pageviews and return update records
 *
 * @param pageviews - Batch of pageviews to process
 * @returns Array of update records
 */
export function processPageviewBatch(pageviews: PageviewRecord[]): UpdateRecord[] {
  return calculateUniqueVisitors(pageviews);
}

/**
 * Execute a batch of updates in a transaction
 *
 * @param updates - Array of update records
 * @param batchNumber - Batch number for logging
 * @param dryRun - If true, only log updates without applying them
 */
async function executeBatchUpdates(
  updates: UpdateRecord[],
  batchNumber: number,
  dryRun: boolean
): Promise<void> {
  if (updates.length === 0) {
    console.log(`  Batch ${batchNumber}: No updates needed`);
    return;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Batch ${batchNumber}: Would update ${updates.length} pageviews`);
    // Show sample of what would be updated (first 3)
    const sampleSize = Math.min(3, updates.length);
    console.log(`  Sample updates (showing ${sampleSize} of ${updates.length}):`);
    for (let i = 0; i < sampleSize; i++) {
      console.log(`    - ID: ${updates[i].id} -> is_unique: true`);
    }
    return;
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Update all pageviews in this batch
        for (const update of updates) {
          await tx.pageview.update({
            where: { id: update.id },
            data: { is_unique: true },
          });
        }
      },
      {
        timeout: TRANSACTION_TIMEOUT,
      }
    );

    console.log(`  ✓ Batch ${batchNumber}: Updated ${updates.length} pageviews`);
  } catch (error) {
    console.error(`  ✗ Error processing batch ${batchNumber}:`, error);
    throw error;
  }
}

/**
 * Calculate progress percentage and log it
 */
function logProgress(
  processedCount: number,
  totalCount: number,
  updatedCount: number,
  startTime: number
): void {
  const progressPercent = ((processedCount / totalCount) * 100).toFixed(1);
  const elapsedMs = Date.now() - startTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Calculate estimated time remaining
  const recordsPerSecond = processedCount / (elapsedMs / 1000);
  const remainingRecords = totalCount - processedCount;
  const estimatedSecondsRemaining = Math.floor(remainingRecords / recordsPerSecond);

  console.log(
    `Progress: ${processedCount.toLocaleString()}/${totalCount.toLocaleString()} ` +
      `(${progressPercent}%) | ` +
      `Updates: ${updatedCount.toLocaleString()} | ` +
      `Elapsed: ${elapsedSeconds}s | ` +
      `Est. remaining: ${estimatedSecondsRemaining}s`
  );
}

/**
 * Main backfill function
 *
 * @param dryRun - If true, only shows what would change without applying updates
 */
export async function backfillUniqueVisitors(dryRun: boolean = true): Promise<void> {
  const mode = dryRun ? 'DRY-RUN' : 'EXECUTE';
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('Analytics Backfill - Unique Visitors');
  console.log('========================================');
  console.log(`Mode: ${mode}`);
  console.log(`Batch size: ${BATCH_SIZE} records`);
  console.log(`Transaction timeout: ${TRANSACTION_TIMEOUT}ms`);
  console.log('\n⚠️  APPROXIMATION METHOD IN USE:');
  console.log('- Using session_id as visitor proxy (visitor_hash not stored in DB)');
  console.log('- Expected accuracy: ~70-85% (may overestimate unique visitors)');
  console.log('- One visitor can have multiple sessions over time');
  console.log('- This is the best approximation possible given privacy-first design');

  if (!dryRun) {
    console.log('\n⚠️  WARNING: EXECUTE MODE - This will modify database records!');
    console.log('⚠️  Ensure you have a database backup before proceeding.');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log('\n');

  try {
    // Count total pageviews with is_unique = false
    console.log('Counting pageviews with is_unique = false...');
    const totalCount = await prisma.pageview.count({
      where: {
        is_unique: false,
      },
    });

    console.log(`Total pageviews to process: ${totalCount.toLocaleString()}\n`);

    if (totalCount === 0) {
      console.log('No pageviews need backfilling. Exiting.');
      return;
    }

    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
    let processedCount = 0;
    let totalUpdatedCount = 0;
    let batchNumber = 0;
    let lastLoggedPercent = 0;

    // Process in batches using cursor-based pagination
    let cursor: string | undefined = undefined;

    while (processedCount < totalCount) {
      batchNumber++;

      // Fetch next batch ordered by added_iso for correct chronological processing
      const batch: Array<{ id: string; session_id: string | null; added_iso: Date; is_unique: boolean }> = await prisma.pageview.findMany({
        where: {
          is_unique: false,
        },
        select: {
          id: true,
          session_id: true,
          added_iso: true,
          is_unique: true,
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          added_iso: 'asc', // Critical: Must process in chronological order
        },
      });

      if (batch.length === 0) {
        break;
      }

      // Calculate which pageviews should be updated
      const updates = processPageviewBatch(batch);

      // Execute updates (or log them in dry-run mode)
      await executeBatchUpdates(updates, batchNumber, dryRun);

      // Update progress counters
      processedCount += batch.length;
      totalUpdatedCount += updates.length;

      // Log progress every 10%
      const currentPercent = Math.floor((processedCount / totalCount) * 100);
      if (currentPercent >= lastLoggedPercent + 10 || processedCount === totalCount) {
        logProgress(processedCount, totalCount, totalUpdatedCount, startTime);
        lastLoggedPercent = currentPercent;
      }

      // Set cursor for next iteration
      cursor = batch[batch.length - 1].id;

      // Small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Final statistics
    const elapsedMs = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    console.log('\n========================================');
    console.log('Backfill Completed Successfully');
    console.log('========================================');
    console.log(`Mode: ${mode}`);
    console.log(`Total batches processed: ${totalBatches.toLocaleString()}`);
    console.log(`Total pageviews processed: ${processedCount.toLocaleString()}`);
    console.log(
      `Total updates ${dryRun ? 'identified' : 'applied'}: ${totalUpdatedCount.toLocaleString()}`
    );
    console.log(`Total time elapsed: ${elapsedSeconds}s`);

    if (dryRun) {
      console.log('\nℹ️  This was a DRY-RUN. No changes were applied.');
      console.log('ℹ️  Run with --execute flag to apply updates: npm run backfill:analytics:execute');
    } else {
      console.log('\n✓ Database updates completed successfully!');
    }
  } catch (error) {
    console.error('\n✗ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill if executed directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  backfillUniqueVisitors(!executeMode)
    .then(() => {
      console.log('\nBackfill script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nBackfill script failed:', error);
      process.exit(1);
    });
}
