/**
 * Backfill Referrer Data Migration Script
 *
 * Populates referrer_domain and referrer_category fields for existing pageviews
 * by extracting domains from document_referrer and computing categories.
 *
 * Usage:
 *   npx ts-node prisma/scripts/backfill-referrer-data.ts
 *
 * Features:
 * - Batch processing (1000 records at a time) to avoid table locks
 * - Transaction support with timeout for each batch
 * - Progress logging and error handling
 * - Handles null/empty referrers gracefully
 */

import { PrismaClient } from '@prisma/client';
import { extractDomainFromUrl, getCategoryFromDomain } from '../../lib/config/referrer-categories';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;
const TRANSACTION_TIMEOUT = 30000; // 30 seconds per batch

interface PageviewBatch {
  id: string;
  document_referrer: string | null;
  hostname: string | null;
}

/**
 * Process a single batch of pageviews
 */
async function processBatch(batch: PageviewBatch[], batchNumber: number): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const pageview of batch) {
          const domain = extractDomainFromUrl(pageview.document_referrer);
          // Pass hostname to detect internal referrers (franksblog.nl → Direct)
          const category = getCategoryFromDomain(domain, pageview.hostname);

          await tx.pageview.update({
            where: { id: pageview.id },
            data: {
              referrer_domain: domain,
              referrer_category: category,
            },
          });
        }
      },
      {
        timeout: TRANSACTION_TIMEOUT,
      }
    );

    console.log(`✓ Batch ${batchNumber} completed: ${batch.length} pageviews updated`);
  } catch (error) {
    console.error(`✗ Error processing batch ${batchNumber}:`, error);
    throw error;
  }
}

/**
 * Main backfill function
 */
async function backfillReferrerData(): Promise<void> {
  console.log('Starting referrer data backfill...');
  console.log(`Batch size: ${BATCH_SIZE} records`);
  console.log(`Transaction timeout: ${TRANSACTION_TIMEOUT}ms\n`);

  try {
    // Count total pageviews that need backfilling
    const totalCount = await prisma.pageview.count({
      where: {
        referrer_domain: null,
      },
    });

    console.log(`Total pageviews to process: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('No pageviews need backfilling. Exiting.');
      return;
    }

    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
    let processedCount = 0;
    let batchNumber = 0;

    // Process in batches using cursor-based pagination
    let cursor: string | undefined = undefined;

    while (processedCount < totalCount) {
      batchNumber++;

      // Fetch next batch
      const batch: Array<{ id: string; document_referrer: string | null; hostname: string | null }> = await prisma.pageview.findMany({
        where: {
          referrer_domain: null,
        },
        select: {
          id: true,
          document_referrer: true,
          hostname: true,
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0, // Skip the cursor
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          id: 'asc',
        },
      });

      if (batch.length === 0) {
        break;
      }

      // Process the batch
      await processBatch(batch, batchNumber);

      // Update progress
      processedCount += batch.length;
      const progressPercent = ((processedCount / totalCount) * 100).toFixed(2);
      console.log(`Progress: ${processedCount}/${totalCount} (${progressPercent}%)`);

      // Set cursor for next iteration
      cursor = batch[batch.length - 1].id;

      // Small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n✓ Backfill completed successfully!');
    console.log(`Total batches processed: ${batchNumber}`);
    console.log(`Total pageviews updated: ${processedCount}`);
  } catch (error) {
    console.error('\n✗ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
if (require.main === module) {
  backfillReferrerData()
    .then(() => {
      console.log('\nBackfill script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nBackfill script failed:', error);
      process.exit(1);
    });
}

// Export for testing
export { backfillReferrerData, processBatch };
