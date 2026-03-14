/**
 * Next.js Server Instrumentation
 *
 * This file is automatically detected and loaded by Next.js 13.2+
 * The register() function is called when the server starts.
 *
 * Purpose: Initialize background jobs and server-side services
 *
 * Execution Behavior:
 * - Production: Runs once when the server starts
 * - Development: Runs on first page load, may run again during hot reload
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run initialization in Node.js runtime (not Edge runtime)
  // Edge runtime doesn't support node-cron
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling issues with Edge runtime
    const { initializeEmailJobs } = await import('../lib/jobs/email-scheduler');

    // Initialize email-related cron jobs
    // The function has built-in singleton protection to prevent
    // duplicate job registration during development hot reloads
    initializeEmailJobs();

    console.log('[Server] Background jobs initialization complete');
  }
}
