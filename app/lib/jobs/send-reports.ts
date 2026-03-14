/**
 * Report Sending Jobs
 * Handles scheduled email report generation and delivery
 */

import { EmailSchedule, EmailType, EmailStatus } from '@prisma/client';
import { getPreferencesWithReportsEnabled } from '../db/email-preferences';
import { generateReport, type TemplateConfig } from '../email/report-generator';
import { sendEmail } from '../email/send';
import { createDeliveryLog } from '../db/email-logs';

/**
 * Report job result summary
 */
export interface ReportJobResult {
  totalSites: number;
  totalSent: number;
  totalFailed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Send reports for a specific schedule
 *
 * @param schedule - Report schedule (DAILY, WEEKLY, MONTHLY)
 * @returns ReportJobResult summary
 */
async function sendReportsForSchedule(schedule: EmailSchedule): Promise<ReportJobResult> {
  const startTime = new Date();
  let totalSent = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  try {
    // Get all preferences with reports enabled for this schedule
    const preferences = await getPreferencesWithReportsEnabled(schedule);
    const totalSites = preferences.length;

    console.log(`Starting ${schedule} report job for ${totalSites} sites`);

    if (totalSites === 0) {
      console.log(`No sites with ${schedule} reports enabled`);
      const endTime = new Date();
      return {
        totalSites: 0,
        totalSent: 0,
        totalFailed: 0,
        errors: [],
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }

    // Process each site sequentially to avoid rate limits
    for (let i = 0; i < preferences.length; i++) {
      const preference = preferences[i];
      console.log(`Processing site ${i + 1} of ${totalSites}: ${preference.websiteId || 'global'}`);

      try {
        // Generate report
        // Note: We need to get the user's email address
        // For now, we'll skip if userId is not available
        // This will need to be updated once User model is accessible
        const recipientEmail = preference.userId; // TODO: Get actual email from User model

        const email = await generateReport(
          preference.websiteId,
          schedule,
          recipientEmail,
          preference.templateConfig as TemplateConfig
        );

        // Determine email type based on schedule
        let emailType: EmailType;
        switch (schedule) {
          case EmailSchedule.DAILY:
            emailType = EmailType.DAILY_REPORT;
            break;
          case EmailSchedule.WEEKLY:
            emailType = EmailType.WEEKLY_REPORT;
            break;
          case EmailSchedule.MONTHLY:
            emailType = EmailType.MONTHLY_REPORT;
            break;
          default:
            emailType = EmailType.DAILY_REPORT;
        }

        // Send email
        const sendResult = await sendEmail({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          userId: preference.userId,
          websiteId: preference.websiteId,
          emailType,
        });

        if (sendResult.success) {
          // Log success
          await createDeliveryLog({
            userId: preference.userId,
            websiteId: preference.websiteId,
            emailType,
            recipientEmail: email.to,
            status: EmailStatus.SENT,
          });

          totalSent++;
          console.log(`Report sent successfully to ${email.to}`);
        } else {
          // Log failure
          await createDeliveryLog({
            userId: preference.userId,
            websiteId: preference.websiteId,
            emailType,
            recipientEmail: email.to,
            status: EmailStatus.FAILED,
            errorMessage: sendResult.error || 'Unknown error',
          });

          totalFailed++;
          const errorMsg = `Failed to send report to ${email.to}: ${sendResult.error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      } catch (error) {
        // Log individual site error and continue
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMsg = `Error processing site ${preference.websiteId || 'global'}: ${errorMessage}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        totalFailed++;

        // Continue to next site
        continue;
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    console.log(`${schedule} report job complete: ${totalSent} sent, ${totalFailed} failed (${durationMs}ms)`);

    return {
      totalSites,
      totalSent,
      totalFailed,
      errors,
      startTime,
      endTime,
      durationMs,
    };
  } catch (error) {
    // Critical error - log and return
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`${schedule} report job failed critically: ${errorMessage}`);
    errors.push(`Critical error: ${errorMessage}`);

    return {
      totalSites: 0,
      totalSent,
      totalFailed,
      errors,
      startTime,
      endTime,
      durationMs,
    };
  }
}

/**
 * Send daily reports to all sites with daily reports enabled
 *
 * @returns ReportJobResult summary
 */
export async function sendDailyReports(): Promise<ReportJobResult> {
  return await sendReportsForSchedule(EmailSchedule.DAILY);
}

/**
 * Send weekly reports to all sites with weekly reports enabled
 *
 * @returns ReportJobResult summary
 */
export async function sendWeeklyReports(): Promise<ReportJobResult> {
  return await sendReportsForSchedule(EmailSchedule.WEEKLY);
}

/**
 * Send monthly reports to all sites with monthly reports enabled
 *
 * @returns ReportJobResult summary
 */
export async function sendMonthlyReports(): Promise<ReportJobResult> {
  return await sendReportsForSchedule(EmailSchedule.MONTHLY);
}
