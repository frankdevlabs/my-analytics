/**
 * Verify Schema Script
 *
 * This script verifies that the database schema has been updated correctly
 * with the browser_major_version field and analytics indexes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  console.log('Verifying database schema...');
  console.log('');

  try {
    // Check if browser_major_version column exists by querying the table
    const result = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
    }>>`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'pageviews'
        AND column_name = 'browser_major_version';
    `;

    if (result.length > 0) {
      console.log('✓ browser_major_version column exists');
      console.log(`  Type: ${result[0].data_type}`);
      console.log(`  Max length: ${result[0].character_maximum_length}`);
    } else {
      console.log('✗ browser_major_version column NOT found');
    }

    console.log('');

    // Check indexes
    const indexes = await prisma.$queryRaw<Array<{
      indexname: string;
      indexdef: string;
    }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'pageviews'
        AND (indexname = 'idx_pageviews_device_timestamp'
         OR indexname = 'idx_pageviews_browser_timestamp');
    `;

    console.log(`Found ${indexes.length} analytics indexes:`);
    for (const index of indexes) {
      console.log(`✓ ${index.indexname}`);
      console.log(`  ${index.indexdef}`);
    }

    if (indexes.length === 0) {
      console.log('✗ No analytics indexes found');
    }

    console.log('');

    // Check sample data
    const sampleCount = await prisma.pageview.count({
      where: {
        browser_version: { not: null }
      }
    });

    console.log(`Total pageviews with browser_version: ${sampleCount}`);

    if (sampleCount > 0) {
      const withMajorVersion = await prisma.pageview.count({
        where: {
          browser_major_version: { not: null }
        }
      });

      console.log(`Pageviews with browser_major_version: ${withMajorVersion}`);

      if (withMajorVersion === 0) {
        console.log('');
        console.log('⚠️  No records have browser_major_version populated yet.');
        console.log('   Run the backfill script: tsx scripts/backfill-browser-major-version.ts');
      } else {
        const percentage = ((withMajorVersion / sampleCount) * 100).toFixed(1);
        console.log(`Backfill progress: ${percentage}%`);

        // Show a few sample records
        const samples = await prisma.pageview.findMany({
          where: {
            browser_major_version: { not: null }
          },
          select: {
            browser_name: true,
            browser_version: true,
            browser_major_version: true
          },
          take: 5
        });

        if (samples.length > 0) {
          console.log('');
          console.log('Sample records:');
          for (const sample of samples) {
            console.log(`  ${sample.browser_name || 'Unknown'}: ${sample.browser_version} → ${sample.browser_major_version}`);
          }
        }
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Schema verification complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await verifySchema();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
