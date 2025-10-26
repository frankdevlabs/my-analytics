/**
 * Performance Test Script for Referrer Sources Feature
 * Tests query performance and verifies index usage with EXPLAIN ANALYZE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryPlan {
  'QUERY PLAN': string;
}

/**
 * Run EXPLAIN ANALYZE on a query and return execution time
 */
async function analyzeQuery(queryName: string, sql: string): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Query: ${queryName}`);
  console.log('='.repeat(70));
  console.log('SQL:');
  console.log(sql);
  console.log('\nExecution Plan:');

  const explainSql = `EXPLAIN ANALYZE ${sql}`;

  try {
    const result = await prisma.$queryRawUnsafe<QueryPlan[]>(explainSql);

    let totalExecutionTime = 0;
    let planningTime = 0;
    let indexUsed = 'None';

    result.forEach((row) => {
      const line = row['QUERY PLAN'];
      console.log(line);

      // Extract execution time
      if (line.includes('Execution Time:')) {
        const match = line.match(/Execution Time: ([\d.]+) ms/);
        if (match) {
          totalExecutionTime = parseFloat(match[1]);
        }
      }

      // Extract planning time
      if (line.includes('Planning Time:')) {
        const match = line.match(/Planning Time: ([\d.]+) ms/);
        if (match) {
          planningTime = parseFloat(match[1]);
        }
      }

      // Check for index usage
      if (line.includes('Index')) {
        if (line.includes('idx_pageviews_referrer_domain')) {
          indexUsed = 'idx_pageviews_referrer_domain';
        } else if (line.includes('idx_pageviews_referrer_category')) {
          indexUsed = 'idx_pageviews_referrer_category';
        } else if (line.includes('idx_pageviews_timestamp')) {
          indexUsed = 'idx_pageviews_timestamp';
        }
      }
    });

    console.log('\n' + '─'.repeat(70));
    console.log(`Summary:`);
    console.log(`  Planning Time: ${planningTime.toFixed(2)}ms`);
    console.log(`  Execution Time: ${totalExecutionTime.toFixed(2)}ms`);
    console.log(`  Total Time: ${(planningTime + totalExecutionTime).toFixed(2)}ms`);
    console.log(`  Index Used: ${indexUsed}`);
    console.log(`  Status: ${(planningTime + totalExecutionTime) < 500 ? '✓ PASS' : '✗ FAIL'} (< 500ms target)`);

  } catch (error: unknown) {
    console.error('Error analyzing query:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Test getReferrersByCategory query
 */
async function testCategoryQuery(): Promise<void> {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const sql = `
    SELECT
      referrer_category,
      COUNT(*) as pageviews
    FROM pageviews
    WHERE added_iso >= '${startDate}'
      AND added_iso <= '${endDate}'
      AND is_bot = false
    GROUP BY referrer_category
    ORDER BY pageviews DESC
  `.trim();

  await analyzeQuery('getReferrersByCategory (7 days)', sql);
}

/**
 * Test getReferrersByDomain query
 */
async function testDomainQuery(): Promise<void> {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const sql = `
    SELECT
      referrer_domain,
      referrer_category,
      COUNT(*) as pageviews
    FROM pageviews
    WHERE referrer_domain IS NOT NULL
      AND added_iso >= '${startDate}'
      AND added_iso <= '${endDate}'
      AND is_bot = false
    GROUP BY referrer_domain, referrer_category
    ORDER BY pageviews DESC
    LIMIT 50
  `.trim();

  await analyzeQuery('getReferrersByDomain (30 days, limit 50)', sql);
}

/**
 * Test getReferrerUrlsByDomain query
 */
async function testUrlsQuery(): Promise<void> {
  // First, get a domain to test with
  const domains = await prisma.$queryRaw<Array<{ referrer_domain: string }>>`
    SELECT referrer_domain
    FROM pageviews
    WHERE referrer_domain IS NOT NULL
    LIMIT 1
  `;

  if (domains.length === 0) {
    console.log('\nNo domains found to test getReferrerUrlsByDomain');
    return;
  }

  const testDomain = domains[0].referrer_domain;
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const sql = `
    SELECT
      document_referrer as url,
      COUNT(*) as pageviews
    FROM pageviews
    WHERE referrer_domain = '${testDomain}'
      AND added_iso >= '${startDate}'
      AND added_iso <= '${endDate}'
      AND is_bot = false
    GROUP BY document_referrer
    ORDER BY pageviews DESC
    LIMIT 100
  `.trim();

  await analyzeQuery(`getReferrerUrlsByDomain (90 days, domain="${testDomain}")`, sql);
}

/**
 * Test with different date ranges
 */
async function testDateRanges(): Promise<void> {
  console.log('\n\n' + '═'.repeat(70));
  console.log('DATE RANGE PERFORMANCE TESTS');
  console.log('═'.repeat(70));

  const testRanges = [
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' }
  ];

  for (const range of testRanges) {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString();

    const sql = `
      SELECT
        referrer_category,
        COUNT(*) as pageviews
      FROM pageviews
      WHERE added_iso >= '${startDate}'
        AND added_iso <= '${endDate}'
        AND is_bot = false
      GROUP BY referrer_category
      ORDER BY pageviews DESC
    `.trim();

    await analyzeQuery(`Category Query (${range.label})`, sql);
  }
}

/**
 * Main test function
 */
async function runPerformanceTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  Referrer Sources Performance Test Suite                         ║');
  console.log('║  Date: ' + new Date().toISOString().split('T')[0] + '                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  try {
    // Get database size info
    const sizeInfo = await prisma.$queryRaw<Array<{
      total_pageviews: bigint;
      with_referrer: bigint;
    }>>`
      SELECT
        COUNT(*) as total_pageviews,
        COUNT(referrer_domain) as with_referrer
      FROM pageviews
    `;

    console.log('\nDatabase Statistics:');
    console.log(`  Total Pageviews: ${Number(sizeInfo[0].total_pageviews)}`);
    console.log(`  With Referrer Domain: ${Number(sizeInfo[0].with_referrer)}`);
    console.log(`  Direct Traffic: ${Number(sizeInfo[0].total_pageviews) - Number(sizeInfo[0].with_referrer)}`);

    // Run tests
    await testCategoryQuery();
    await testDomainQuery();
    await testUrlsQuery();
    await testDateRanges();

    console.log('\n\n' + '═'.repeat(70));
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log('\n✅ All performance tests completed');
    console.log('\nNotes:');
    console.log('  - Small datasets may not use referrer-specific indexes');
    console.log('  - PostgreSQL query planner chooses optimal index automatically');
    console.log('  - With larger datasets (1M+ rows), referrer indexes will be preferred');
    console.log('  - All queries should complete in < 500ms for production readiness');

  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runPerformanceTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
