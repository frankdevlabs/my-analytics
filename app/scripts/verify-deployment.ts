/**
 * Deployment Verification Script
 * Verifies referrer sources feature is ready for deployment
 */

import { PrismaClient } from '@prisma/client';
import {
  getReferrersByCategory,
  getReferrersByDomain,
  getReferrerUrlsByDomain
} from '../lib/db/pageviews';

const prisma = new PrismaClient();

interface VerificationResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: unknown;
}

const results: VerificationResult[] = [];

/**
 * Verify database schema has referrer fields
 */
async function verifySchema(): Promise<void> {
  console.log('\n=== Step 1: Schema Verification ===');

  try {
    const result = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
    }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'pageviews'
        AND column_name IN ('referrer_domain', 'referrer_category')
      ORDER BY column_name
    `;

    if (result.length === 2) {
      results.push({
        step: 'Schema - Referrer Fields',
        status: 'PASS',
        message: 'Both referrer_domain and referrer_category fields exist',
        details: result
      });
      console.log('✓ Schema verification passed');
    } else {
      results.push({
        step: 'Schema - Referrer Fields',
        status: 'FAIL',
        message: `Expected 2 fields, found ${result.length}`,
        details: result
      });
      console.log('✗ Schema verification failed');
    }
  } catch (error: unknown) {
    results.push({
      step: 'Schema - Referrer Fields',
      status: 'FAIL',
      message: `Error checking schema: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('✗ Schema verification error');
  }
}

/**
 * Verify indexes exist
 */
async function verifyIndexes(): Promise<void> {
  console.log('\n=== Step 2: Index Verification ===');

  try {
    const result = await prisma.$queryRaw<Array<{
      indexname: string;
    }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'pageviews'
        AND indexname IN ('idx_pageviews_referrer_domain', 'idx_pageviews_referrer_category')
      ORDER BY indexname
    `;

    if (result.length === 2) {
      results.push({
        step: 'Indexes - Referrer Indexes',
        status: 'PASS',
        message: 'Both referrer indexes exist',
        details: result
      });
      console.log('✓ Index verification passed');
    } else {
      results.push({
        step: 'Indexes - Referrer Indexes',
        status: 'FAIL',
        message: `Expected 2 indexes, found ${result.length}`,
        details: result
      });
      console.log('✗ Index verification failed');
    }
  } catch (error: unknown) {
    results.push({
      step: 'Indexes - Referrer Indexes',
      status: 'FAIL',
      message: `Error checking indexes: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('✗ Index verification error');
  }
}

/**
 * Verify data has been backfilled
 */
async function verifyDataBackfill(): Promise<void> {
  console.log('\n=== Step 3: Data Backfill Verification ===');

  try {
    const result = await prisma.$queryRaw<Array<{
      total_pageviews: bigint;
      with_domain: bigint;
      with_category: bigint;
    }>>`
      SELECT
        COUNT(*) as total_pageviews,
        COUNT(referrer_domain) as with_domain,
        COUNT(referrer_category) as with_category
      FROM pageviews
    `;

    const stats = {
      total: Number(result[0].total_pageviews),
      withDomain: Number(result[0].with_domain),
      withCategory: Number(result[0].with_category)
    };

    // Category should always be set (defaults to 'Direct')
    if (stats.withCategory === stats.total) {
      results.push({
        step: 'Data Backfill - Categories',
        status: 'PASS',
        message: `All ${stats.total} pageviews have categories assigned`,
        details: stats
      });
      console.log(`✓ Data backfill complete: ${stats.total} pageviews with categories`);
    } else {
      results.push({
        step: 'Data Backfill - Categories',
        status: 'WARNING',
        message: `${stats.total - stats.withCategory} pageviews missing category`,
        details: stats
      });
      console.log(`⚠ Warning: Some pageviews missing category`);
    }

    // Domain can be null for direct traffic
    const domainPercentage = (stats.withDomain / stats.total * 100).toFixed(1);
    results.push({
      step: 'Data Backfill - Domains',
      status: 'PASS',
      message: `${stats.withDomain} pageviews have domains (${domainPercentage}% of total)`,
      details: stats
    });
    console.log(`✓ Domain data: ${stats.withDomain} pageviews with referrer domains`);

  } catch (error: unknown) {
    results.push({
      step: 'Data Backfill',
      status: 'FAIL',
      message: `Error checking data: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('✗ Data backfill verification error');
  }
}

/**
 * Verify query performance
 */
async function verifyQueryPerformance(): Promise<void> {
  console.log('\n=== Step 4: Query Performance Verification ===');

  const endDate = new Date();
  const startDate7Days = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate30Days = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Test getReferrersByCategory
  try {
    const start = Date.now();
    const categories = await getReferrersByCategory(startDate7Days, endDate);
    const duration = Date.now() - start;

    if (duration < 500) {
      results.push({
        step: 'Query Performance - getReferrersByCategory',
        status: 'PASS',
        message: `Query completed in ${duration}ms (< 500ms target)`,
        details: { duration, resultCount: categories.length }
      });
      console.log(`✓ getReferrersByCategory: ${duration}ms (${categories.length} categories)`);
    } else {
      results.push({
        step: 'Query Performance - getReferrersByCategory',
        status: 'WARNING',
        message: `Query took ${duration}ms (exceeds 500ms target)`,
        details: { duration, resultCount: categories.length }
      });
      console.log(`⚠ getReferrersByCategory: ${duration}ms (slow)`);
    }
  } catch (error: unknown) {
    results.push({
      step: 'Query Performance - getReferrersByCategory',
      status: 'FAIL',
      message: `Query failed: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('✗ getReferrersByCategory failed');
  }

  // Test getReferrersByDomain
  try {
    const start = Date.now();
    const domains = await getReferrersByDomain(startDate7Days, endDate, 50);
    const duration = Date.now() - start;

    if (duration < 500) {
      results.push({
        step: 'Query Performance - getReferrersByDomain',
        status: 'PASS',
        message: `Query completed in ${duration}ms (< 500ms target)`,
        details: { duration, resultCount: domains.length }
      });
      console.log(`✓ getReferrersByDomain: ${duration}ms (${domains.length} domains)`);
    } else {
      results.push({
        step: 'Query Performance - getReferrersByDomain',
        status: 'WARNING',
        message: `Query took ${duration}ms (exceeds 500ms target)`,
        details: { duration, resultCount: domains.length }
      });
      console.log(`⚠ getReferrersByDomain: ${duration}ms (slow)`);
    }

    // Test getReferrerUrlsByDomain if we have domains
    if (domains.length > 0) {
      const testDomain = domains[0].domain;
      const start2 = Date.now();
      const urls = await getReferrerUrlsByDomain(testDomain, startDate30Days, endDate, 100);
      const duration2 = Date.now() - start2;

      if (duration2 < 500) {
        results.push({
          step: 'Query Performance - getReferrerUrlsByDomain',
          status: 'PASS',
          message: `Query completed in ${duration2}ms (< 500ms target)`,
          details: { duration: duration2, domain: testDomain, resultCount: urls.length }
        });
        console.log(`✓ getReferrerUrlsByDomain: ${duration2}ms (${urls.length} URLs for ${testDomain})`);
      } else {
        results.push({
          step: 'Query Performance - getReferrerUrlsByDomain',
          status: 'WARNING',
          message: `Query took ${duration2}ms (exceeds 500ms target)`,
          details: { duration: duration2, domain: testDomain, resultCount: urls.length }
        });
        console.log(`⚠ getReferrerUrlsByDomain: ${duration2}ms (slow)`);
      }
    }
  } catch (error: unknown) {
    results.push({
      step: 'Query Performance - getReferrersByDomain',
      status: 'FAIL',
      message: `Query failed: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('✗ getReferrersByDomain failed');
  }
}

/**
 * Verify category distribution
 */
async function verifyCategoryDistribution(): Promise<void> {
  console.log('\n=== Step 5: Category Distribution Verification ===');

  try {
    const result = await prisma.$queryRaw<Array<{
      referrer_category: string | null;
      count: bigint;
    }>>`
      SELECT referrer_category, COUNT(*) as count
      FROM pageviews
      GROUP BY referrer_category
      ORDER BY count DESC
    `;

    const distribution = result.map(r => ({
      category: r.referrer_category || 'null',
      count: Number(r.count)
    }));

    results.push({
      step: 'Category Distribution',
      status: 'PASS',
      message: 'Category distribution retrieved successfully',
      details: distribution
    });

    console.log('✓ Category distribution:');
    distribution.forEach(d => {
      console.log(`  - ${d.category}: ${d.count} pageviews`);
    });
  } catch (error: unknown) {
    results.push({
      step: 'Category Distribution',
      status: 'FAIL',
      message: `Error getting distribution: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('✗ Category distribution verification error');
  }
}

/**
 * Main verification function
 */
async function runVerification(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Referrer Sources Deployment Verification                 ║');
  console.log('║  Date: ' + new Date().toISOString().split('T')[0] + '                                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await verifySchema();
    await verifyIndexes();
    await verifyDataBackfill();
    await verifyQueryPerformance();
    await verifyCategoryDistribution();
  } catch (error) {
    console.error('\nUnexpected error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Verification Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total Checks: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`⚠ Warnings: ${warnings}`);
  console.log(`✗ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('❌ DEPLOYMENT VERIFICATION FAILED\n');
    console.log('Failed checks:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.step}: ${r.message}`);
    });
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  DEPLOYMENT VERIFICATION PASSED WITH WARNINGS\n');
    console.log('Warning checks:');
    results.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`  - ${r.step}: ${r.message}`);
    });
    process.exit(0);
  } else {
    console.log('✅ ALL DEPLOYMENT VERIFICATION CHECKS PASSED\n');
    console.log('The referrer sources feature is ready for production deployment.');
    process.exit(0);
  }
}

// Run verification
runVerification().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
