/**
 * Email Job Scheduler
 * Initializes cron jobs for email reports and alerts
 */

import cron from 'node-cron';
import { sendDailyReports, sendWeeklyReports, sendMonthlyReports } from './send-reports';
import { checkAlerts } from './check-alerts';

/**
 * Job initialization state
 * Prevents duplicate initialization
 */
let jobsInitialized = false;

/**
 * Initialize all email-related cron jobs
 * Should be called once on server startup
 *
 * Schedules:
 * - Daily reports: 9am every day
 * - Weekly reports: Monday at 9am
 * - Monthly reports: 1st of month at 9am
 * - Alert checks: Every 15 minutes
 *
 * @example
 * import { initializeEmailJobs } from '@/lib/jobs/email-scheduler';
 * initializeEmailJobs();
 */
export function initializeEmailJobs(): void {
  // Prevent duplicate initialization
  if (jobsInitialized) {
    console.log('Email jobs already initialized, skipping');
    return;
  }

  console.log('Initializing email jobs...');

  // Daily reports: 9am every day
  // Cron format: minute hour day-of-month month day-of-week
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Starting daily report job at', new Date().toISOString());
    try {
      await sendDailyReports();
    } catch (error) {
      console.error('[Cron] Daily report job failed:', error);
    }
  });

  // Weekly reports: Monday at 9am
  // Day of week: 1 = Monday
  cron.schedule('0 9 * * 1', async () => {
    console.log('[Cron] Starting weekly report job at', new Date().toISOString());
    try {
      await sendWeeklyReports();
    } catch (error) {
      console.error('[Cron] Weekly report job failed:', error);
    }
  });

  // Monthly reports: 1st of month at 9am
  cron.schedule('0 9 1 * *', async () => {
    console.log('[Cron] Starting monthly report job at', new Date().toISOString());
    try {
      await sendMonthlyReports();
    } catch (error) {
      console.error('[Cron] Monthly report job failed:', error);
    }
  });

  // Alert checks: Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Starting alert check job at', new Date().toISOString());
    try {
      await checkAlerts();
    } catch (error) {
      console.error('[Cron] Alert check job failed:', error);
    }
  });

  jobsInitialized = true;
  console.log('Email jobs initialized successfully');
  console.log('- Daily reports: 9am every day');
  console.log('- Weekly reports: Monday at 9am');
  console.log('- Monthly reports: 1st of month at 9am');
  console.log('- Alert checks: Every 15 minutes');
}

/**
 * Reset initialization state (for testing only)
 * DO NOT use in production code
 */
export function _resetJobInitialization(): void {
  jobsInitialized = false;
}
