#!/usr/bin/env ts-node

/**
 * Check Unique Visitors Statistics
 *
 * Queries database to verify unique visitor data is correctly set.
 * Useful for verifying imports and backfills.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUniqueVisitors(): Promise<void> {
  console.log('\n========================================');
  console.log('Unique Visitors Statistics');
  console.log('========================================\n');

  try {
    // Total counts
    const totalPageviews = await prisma.pageview.count();
    const uniqueVisitors = await prisma.pageview.count({
      where: { is_unique: true },
    });

    console.log('Overall Statistics:');
    console.log(`  Total Pageviews: ${totalPageviews.toLocaleString()}`);
    console.log(`  Unique Visitors: ${uniqueVisitors.toLocaleString()}`);
    console.log(`  Percentage: ${((uniqueVisitors / totalPageviews) * 100).toFixed(2)}%\n`);

    // By date range
    console.log('Historical Data (before 2024-11-30):');
    const historicalTotal = await prisma.pageview.count({
      where: {
        added_iso: { lt: new Date('2024-11-30T00:00:00.000Z') },
      },
    });
    const historicalUnique = await prisma.pageview.count({
      where: {
        added_iso: { lt: new Date('2024-11-30T00:00:00.000Z') },
        is_unique: true,
      },
    });

    console.log(`  Total Pageviews: ${historicalTotal.toLocaleString()}`);
    console.log(`  Unique Visitors: ${historicalUnique.toLocaleString()}`);
    console.log(`  Percentage: ${((historicalUnique / historicalTotal) * 100).toFixed(2)}%\n`);

    console.log('Recent Data (after 2024-11-30):');
    const recentTotal = await prisma.pageview.count({
      where: {
        added_iso: { gte: new Date('2024-11-30T00:00:00.000Z') },
      },
    });
    const recentUnique = await prisma.pageview.count({
      where: {
        added_iso: { gte: new Date('2024-11-30T00:00:00.000Z') },
        is_unique: true,
      },
    });

    console.log(`  Total Pageviews: ${recentTotal.toLocaleString()}`);
    console.log(`  Unique Visitors: ${recentUnique.toLocaleString()}`);
    console.log(`  Percentage: ${((recentUnique / recentTotal) * 100).toFixed(2)}%\n`);

    // Sample unique visitors by month
    console.log('Unique Visitors by Month (last 12 months):');
    const results = await prisma.$queryRaw<
      Array<{ month: string; unique_visitors: bigint }>
    >`
      SELECT
        TO_CHAR(added_iso, 'YYYY-MM') as month,
        COUNT(CASE WHEN is_unique = true THEN 1 END) as unique_visitors
      FROM pageviews
      WHERE added_iso >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `;

    results.forEach((row) => {
      console.log(`  ${row.month}: ${Number(row.unique_visitors).toLocaleString()}`);
    });

  } catch (error) {
    console.error('\n✗ Check failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run check if executed directly
if (require.main === module) {
  checkUniqueVisitors()
    .then(() => {
      console.log('\n✓ Check complete.\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nCheck failed:', error);
      process.exit(1);
    });
}

export { checkUniqueVisitors };
