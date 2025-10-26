/**
 * Backfill Script: Browser Major Version
 *
 * This script extracts the major version from existing browser_version values
 * and populates the browser_major_version field for all pageview records.
 *
 * Usage:
 *   tsx scripts/backfill-browser-major-version.ts
 *
 * Features:
 * - Batch processing (1000 records at a time) for performance
 * - Graceful handling of null and malformed version strings
 * - Progress logging with statistics
 * - Dry run mode for safety verification
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;
const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * Extract major version from browser version string
 * Handles common version formats and edge cases
 *
 * @param browserVersion - Full browser version string (e.g., "120.0.6099.109")
 * @returns Major version string (e.g., "120") or null if unable to parse
 *
 * @example
 * extractMajorVersion("120.0.6099.109") // "120"
 * extractMajorVersion("17.1") // "17"
 * extractMajorVersion("10") // "10"
 * extractMajorVersion("Safari") // null
 * extractMajorVersion(null) // null
 */
function extractMajorVersion(browserVersion: string | null): string | null {
  if (!browserVersion) {
    return null;
  }

  // Trim whitespace
  const trimmed = browserVersion.trim();

  if (!trimmed) {
    return null;
  }

  // Extract first numeric segment before dot or end of string
  // Matches: "120.0.6099.109" -> "120", "17.1" -> "17", "10" -> "10"
  const match = trimmed.match(/^(\d+)/);

  if (!match) {
    // Not a numeric version string
    return null;
  }

  return match[1];
}

/**
 * Process a batch of pageviews to extract and update major versions
 */
async function processBatch(offset: number): Promise<{
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
}> {
  // Fetch batch of records that need updating
  const pageviews = await prisma.pageview.findMany({
    where: {
      OR: [
        // Records with browser_version but no major_version
        {
          browser_version: { not: null },
          browser_major_version: null
        },
        // Or explicitly update all records (for initial backfill)
        {
          browser_version: { not: null }
        }
      ]
    },
    select: {
      id: true,
      browser_version: true,
      browser_major_version: true
    },
    skip: offset,
    take: BATCH_SIZE,
    orderBy: {
      added_iso: 'asc'
    }
  });

  if (pageviews.length === 0) {
    return { processed: 0, updated: 0, skipped: 0, failed: 0 };
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const pageview of pageviews) {
    try {
      const majorVersion = extractMajorVersion(pageview.browser_version);

      // Skip if major version cannot be extracted
      if (majorVersion === null) {
        skipped++;
        continue;
      }

      // Skip if already has the correct major version
      if (pageview.browser_major_version === majorVersion) {
        skipped++;
        continue;
      }

      // Update the record
      if (!DRY_RUN) {
        await prisma.pageview.update({
          where: { id: pageview.id },
          data: { browser_major_version: majorVersion }
        });
      }

      updated++;
    } catch (error) {
      console.error(`Failed to process pageview ${pageview.id}:`, error);
      failed++;
    }
  }

  return {
    processed: pageviews.length,
    updated,
    skipped,
    failed
  };
}

/**
 * Main backfill execution
 */
async function backfillBrowserMajorVersion() {
  console.log('Starting browser_major_version backfill...');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  // Get total count of records to process
  const totalRecords = await prisma.pageview.count({
    where: {
      browser_version: { not: null }
    }
  });

  console.log(`Total pageviews with browser_version: ${totalRecords}`);
  console.log('');

  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Process in batches
  while (offset < totalRecords) {
    const startTime = Date.now();

    const { processed, updated, skipped, failed } = await processBatch(offset);

    if (processed === 0) {
      break; // No more records to process
    }

    totalProcessed += processed;
    totalUpdated += updated;
    totalSkipped += skipped;
    totalFailed += failed;

    const duration = Date.now() - startTime;
    const progress = ((totalProcessed / totalRecords) * 100).toFixed(1);

    console.log(
      `Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ` +
      `Processed ${processed} | Updated ${updated} | Skipped ${skipped} | Failed ${failed} | ` +
      `Duration ${duration}ms | Progress ${progress}%`
    );

    offset += BATCH_SIZE;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Backfill Complete!');
  console.log('='.repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`Total failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('');
    console.log(`⚠️  Warning: ${totalFailed} records failed to process. Check logs above for details.`);
  }

  const successRate = totalProcessed > 0
    ? ((totalUpdated / totalProcessed) * 100).toFixed(1)
    : '0.0';

  console.log(`Success rate: ${successRate}%`);

  if (DRY_RUN) {
    console.log('');
    console.log('🔍 DRY RUN MODE - No changes were made to the database.');
    console.log('   Run without DRY_RUN=true to apply changes.');
  }
}

/**
 * Execute backfill with error handling
 */
async function main() {
  try {
    await backfillBrowserMajorVersion();
  } catch (error) {
    console.error('Backfill failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
