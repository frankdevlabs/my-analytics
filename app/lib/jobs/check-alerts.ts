/**
 * Alert Checking Job
 * Checks for traffic spikes and downtime conditions across all sites
 */

import { EmailType, EmailStatus } from '@prisma/client';
import { getPreferencesWithAlertsEnabled, updateLastTriggered } from '../db/email-preferences';
import {
  checkTrafficSpike,
  checkDowntime,
  generateTrafficSpikeAlert,
  generateDowntimeAlert,
} from '../email/alert-checker';
import { sendEmail } from '../email/send';
import { createDeliveryLog } from '../db/email-logs';

/**
 * Alert job result summary
 */
export interface AlertJobResult {
  totalSites: number;
  totalAlerts: number;
  totalSuppressed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Check all sites for alert conditions and send alerts
 *
 * @returns AlertJobResult summary
 */
export async function checkAlerts(): Promise<AlertJobResult> {
  const startTime = new Date();
  let totalAlerts = 0;
  let totalSuppressed = 0;
  const errors: string[] = [];

  try {
    // Get all preferences with either spike or downtime alerts enabled
    const spikePreferences = await getPreferencesWithAlertsEnabled('spike');
    const downtimePreferences = await getPreferencesWithAlertsEnabled('downtime');

    // Combine and deduplicate by userId + websiteId
    const preferenceMap = new Map<string, typeof spikePreferences[0]>();

    for (const pref of spikePreferences) {
      const key = `${pref.userId}-${pref.websiteId || 'global'}`;
      preferenceMap.set(key, pref);
    }

    for (const pref of downtimePreferences) {
      const key = `${pref.userId}-${pref.websiteId || 'global'}`;
      if (!preferenceMap.has(key)) {
        preferenceMap.set(key, pref);
      }
    }

    const preferences = Array.from(preferenceMap.values());
    const totalSites = preferences.length;

    console.log(`Starting alert check job for ${totalSites} sites`);

    if (totalSites === 0) {
      console.log('No sites with alerts enabled');
      const endTime = new Date();
      return {
        totalSites: 0,
        totalAlerts: 0,
        totalSuppressed: 0,
        errors: [],
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }

    // Process each site
    for (let i = 0; i < preferences.length; i++) {
      const preference = preferences[i];
      console.log(`Checking site ${i + 1} of ${totalSites}: ${preference.websiteId || 'global'}`);

      try {
        // Check traffic spike
        if (preference.spikeAlertEnabled) {
          const spikeResult = await checkTrafficSpike(preference.websiteId, {
            userId: preference.userId,
            websiteId: preference.websiteId,
            spikeAlertEnabled: preference.spikeAlertEnabled,
            spikeThreshold: preference.spikeThreshold,
            lastSpikeTriggeredAt: preference.lastSpikeTriggeredAt,
            downtimeAlertEnabled: preference.downtimeAlertEnabled,
            downtimeThresholdMinutes: preference.downtimeThresholdMinutes,
            lastDowntimeTriggeredAt: preference.lastDowntimeTriggeredAt,
            alertCooldownHours: preference.alertCooldownHours,
          });

          if (spikeResult.shouldAlert) {
            // Generate and send alert
            const domain = preference.websiteId || 'default-site'; // TODO: Get actual domain from Website model
            const alert = await generateTrafficSpikeAlert(
              domain,
              spikeResult.currentCount,
              preference.spikeThreshold!,
              preference.alertCooldownHours
            );

            const recipientEmail = preference.userId; // TODO: Get actual email from User model

            const sendResult = await sendEmail({
              to: recipientEmail,
              subject: alert.subject,
              html: alert.html,
              text: alert.text,
              userId: preference.userId,
              websiteId: preference.websiteId,
              emailType: alert.subject.includes('Traffic') ? EmailType.TRAFFIC_SPIKE : EmailType.DOWNTIME,
            });

            if (sendResult.success) {
              // Log success
              await createDeliveryLog({
                userId: preference.userId,
                websiteId: preference.websiteId,
                emailType: EmailType.TRAFFIC_SPIKE,
                recipientEmail,
                status: EmailStatus.SENT,
              });

              // Update last triggered timestamp
              await updateLastTriggered(
                preference.userId,
                preference.websiteId,
                'spike',
                new Date()
              );

              totalAlerts++;
              console.log(`Traffic spike alert sent for ${domain}`);
            } else {
              // Log failure
              await createDeliveryLog({
                userId: preference.userId,
                websiteId: preference.websiteId,
                emailType: EmailType.TRAFFIC_SPIKE,
                recipientEmail,
                status: EmailStatus.FAILED,
                errorMessage: sendResult.error || 'Unknown error',
              });

              const errorMsg = `Failed to send traffic spike alert: ${sendResult.error}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          } else if (spikeResult.reason) {
            console.log(`Traffic spike suppressed: ${spikeResult.reason}`);
            if (spikeResult.reason.includes('Cooldown active')) {
              totalSuppressed++;
            }
          }
        }

        // Check downtime
        if (preference.downtimeAlertEnabled) {
          const downtimeResult = await checkDowntime(preference.websiteId, {
            userId: preference.userId,
            websiteId: preference.websiteId,
            spikeAlertEnabled: preference.spikeAlertEnabled,
            spikeThreshold: preference.spikeThreshold,
            lastSpikeTriggeredAt: preference.lastSpikeTriggeredAt,
            downtimeAlertEnabled: preference.downtimeAlertEnabled,
            downtimeThresholdMinutes: preference.downtimeThresholdMinutes,
            lastDowntimeTriggeredAt: preference.lastDowntimeTriggeredAt,
            alertCooldownHours: preference.alertCooldownHours,
          });

          if (downtimeResult.shouldAlert && downtimeResult.lastPageviewTime) {
            // Generate and send alert
            const domain = preference.websiteId || 'default-site'; // TODO: Get actual domain from Website model
            const alert = await generateDowntimeAlert(
              domain,
              downtimeResult.lastPageviewTime,
              preference.downtimeThresholdMinutes!,
              preference.alertCooldownHours
            );

            const recipientEmail = preference.userId; // TODO: Get actual email from User model

            const sendResult = await sendEmail({
              to: recipientEmail,
              subject: alert.subject,
              html: alert.html,
              text: alert.text,
              userId: preference.userId,
              websiteId: preference.websiteId,
              emailType: alert.subject.includes('Traffic') ? EmailType.TRAFFIC_SPIKE : EmailType.DOWNTIME,
            });

            if (sendResult.success) {
              // Log success
              await createDeliveryLog({
                userId: preference.userId,
                websiteId: preference.websiteId,
                emailType: EmailType.DOWNTIME,
                recipientEmail,
                status: EmailStatus.SENT,
              });

              // Update last triggered timestamp
              await updateLastTriggered(
                preference.userId,
                preference.websiteId,
                'downtime',
                new Date()
              );

              totalAlerts++;
              console.log(`Downtime alert sent for ${domain}`);
            } else {
              // Log failure
              await createDeliveryLog({
                userId: preference.userId,
                websiteId: preference.websiteId,
                emailType: EmailType.DOWNTIME,
                recipientEmail,
                status: EmailStatus.FAILED,
                errorMessage: sendResult.error || 'Unknown error',
              });

              const errorMsg = `Failed to send downtime alert: ${sendResult.error}`;
              console.error(errorMsg);
              errors.push(errorMsg);
            }
          } else if (downtimeResult.reason) {
            console.log(`Downtime check result: ${downtimeResult.reason}`);
            if (downtimeResult.reason.includes('Cooldown active')) {
              totalSuppressed++;
            }
          }
        }
      } catch (error) {
        // Log individual site error and continue
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMsg = `Error checking site ${preference.websiteId || 'global'}: ${errorMessage}`;
        console.error(errorMsg);
        errors.push(errorMsg);

        // Continue to next site
        continue;
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    console.log(
      `Alert check job complete: ${totalAlerts} alerts sent, ${totalSuppressed} suppressed (${durationMs}ms)`
    );

    return {
      totalSites,
      totalAlerts,
      totalSuppressed,
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

    console.error(`Alert check job failed critically: ${errorMessage}`);
    errors.push(`Critical error: ${errorMessage}`);

    return {
      totalSites: 0,
      totalAlerts,
      totalSuppressed,
      errors,
      startTime,
      endTime,
      durationMs,
    };
  }
}
