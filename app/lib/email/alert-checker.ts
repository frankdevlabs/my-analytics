/**
 * Alert Checker
 * Detects traffic spikes and downtime conditions with cooldown enforcement
 */

import { prisma } from '../db/prisma';
import { renderTemplate } from './templates';
import { TrafficSpikeEmailData, DowntimeEmailData } from './templates';
import { EmailType } from '@prisma/client';

/**
 * Alert check result
 */
export interface AlertCheckResult {
  shouldAlert: boolean;
  reason?: string;
  currentValue?: number;
  lastTriggeredAt?: Date | null;
}

/**
 * Traffic spike check result
 */
export interface TrafficSpikeCheckResult extends AlertCheckResult {
  currentCount: number;
}

/**
 * Downtime check result
 */
export interface DowntimeCheckResult extends AlertCheckResult {
  lastPageviewTime?: Date | null;
}

/**
 * Email preference data (subset needed for alert checking)
 */
export interface AlertPreference {
  userId: string;
  websiteId: string | null;
  spikeAlertEnabled: boolean;
  spikeThreshold: number | null;
  lastSpikeTriggeredAt: Date | null;
  downtimeAlertEnabled: boolean;
  downtimeThresholdMinutes: number | null;
  lastDowntimeTriggeredAt: Date | null;
  alertCooldownHours: number;
}

/**
 * Check if cooldown period is active
 *
 * @param lastTriggered - Last time alert was triggered
 * @param cooldownHours - Cooldown period in hours
 * @returns true if cooldown is active (alert should be suppressed)
 *
 * @example
 * isCooldownActive(new Date('2025-11-21T10:00:00Z'), 1)
 * // returns true if current time is before 2025-11-21T11:00:00Z
 */
export function isCooldownActive(
  lastTriggered: Date | null,
  cooldownHours: number
): boolean {
  if (!lastTriggered) {
    return false;
  }

  const now = new Date();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();

  return timeSinceLastTrigger < cooldownMs;
}

/**
 * Get pageviews in last hour for a website
 */
async function getPageviewsInLastHour(websiteId: string | null): Promise<number> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const count = await prisma.pageview.count({
    where: {
      website_id: websiteId,
      added_iso: {
        gte: oneHourAgo,
      },
    },
  });

  return count;
}

/**
 * Get timestamp of last pageview for a website
 */
async function getLastPageviewTimestamp(websiteId: string | null): Promise<Date | null> {
  const result = await prisma.pageview.findFirst({
    where: {
      website_id: websiteId,
    },
    orderBy: {
      added_iso: 'desc',
    },
    select: {
      added_iso: true,
    },
  });

  return result?.added_iso || null;
}

/**
 * Check if traffic spike condition is met
 *
 * @param websiteId - Website ID (null for default site)
 * @param preference - Alert preference settings
 * @returns TrafficSpikeCheckResult with shouldAlert flag and reason
 *
 * @example
 * const result = await checkTrafficSpike('website123', preference);
 * if (result.shouldAlert) {
 *   // Send alert email
 * }
 */
export async function checkTrafficSpike(
  websiteId: string | null,
  preference: AlertPreference
): Promise<TrafficSpikeCheckResult> {
  // Check if spike alerts are enabled
  if (!preference.spikeAlertEnabled) {
    return {
      shouldAlert: false,
      reason: 'Traffic spike alerts disabled',
      currentCount: 0,
    };
  }

  // Check if threshold is configured
  if (!preference.spikeThreshold) {
    return {
      shouldAlert: false,
      reason: 'Spike threshold not configured',
      currentCount: 0,
    };
  }

  // Get current traffic count
  const currentCount = await getPageviewsInLastHour(websiteId);

  // Check if traffic exceeds threshold (strict > comparison)
  if (currentCount <= preference.spikeThreshold) {
    return {
      shouldAlert: false,
      reason: `Traffic (${currentCount}) below threshold (${preference.spikeThreshold})`,
      currentCount,
    };
  }

  // Check cooldown period
  if (isCooldownActive(preference.lastSpikeTriggeredAt, preference.alertCooldownHours)) {
    const minutesSinceLastTrigger = Math.floor(
      (new Date().getTime() - preference.lastSpikeTriggeredAt!.getTime()) / (1000 * 60)
    );
    return {
      shouldAlert: false,
      reason: `Cooldown active (last fired ${minutesSinceLastTrigger} minutes ago)`,
      currentCount,
      lastTriggeredAt: preference.lastSpikeTriggeredAt,
    };
  }

  // All conditions met - should alert
  return {
    shouldAlert: true,
    currentCount,
  };
}

/**
 * Check if downtime condition is met
 *
 * @param websiteId - Website ID (null for default site)
 * @param preference - Alert preference settings
 * @returns DowntimeCheckResult with shouldAlert flag and reason
 *
 * @example
 * const result = await checkDowntime('website123', preference);
 * if (result.shouldAlert) {
 *   // Send downtime alert
 * }
 */
export async function checkDowntime(
  websiteId: string | null,
  preference: AlertPreference
): Promise<DowntimeCheckResult> {
  // Check if downtime alerts are enabled
  if (!preference.downtimeAlertEnabled) {
    return {
      shouldAlert: false,
      reason: 'Downtime alerts disabled',
    };
  }

  // Check if threshold is configured
  if (!preference.downtimeThresholdMinutes) {
    return {
      shouldAlert: false,
      reason: 'Downtime threshold not configured',
    };
  }

  // Get last pageview timestamp
  const lastPageviewTime = await getLastPageviewTimestamp(websiteId);

  // Skip if site never received traffic
  if (!lastPageviewTime) {
    return {
      shouldAlert: false,
      reason: 'Site has never received pageviews',
      lastPageviewTime: null,
    };
  }

  // Calculate time since last pageview in minutes
  const now = new Date();
  const minutesSinceLastPageview = Math.floor(
    (now.getTime() - lastPageviewTime.getTime()) / (1000 * 60)
  );

  // Check if downtime exceeds threshold (strict > comparison)
  if (minutesSinceLastPageview <= preference.downtimeThresholdMinutes) {
    return {
      shouldAlert: false,
      reason: `Last pageview ${minutesSinceLastPageview} minutes ago (threshold: ${preference.downtimeThresholdMinutes})`,
      lastPageviewTime,
    };
  }

  // Check cooldown period
  if (isCooldownActive(preference.lastDowntimeTriggeredAt, preference.alertCooldownHours)) {
    const minutesSinceLastTrigger = Math.floor(
      (new Date().getTime() - preference.lastDowntimeTriggeredAt!.getTime()) / (1000 * 60)
    );
    return {
      shouldAlert: false,
      reason: `Cooldown active (last fired ${minutesSinceLastTrigger} minutes ago)`,
      lastPageviewTime,
      lastTriggeredAt: preference.lastDowntimeTriggeredAt,
    };
  }

  // All conditions met - should alert
  return {
    shouldAlert: true,
    lastPageviewTime,
  };
}

/**
 * Generate traffic spike alert email
 *
 * @param domain - Website domain
 * @param currentTraffic - Current pageviews in last hour
 * @param threshold - Configured threshold
 * @param cooldownHours - Cooldown period in hours
 * @param dashboardUrl - URL to dashboard
 * @returns Promise with rendered email (html, text, subject)
 */
export async function generateTrafficSpikeAlert(
  domain: string,
  currentTraffic: number,
  threshold: number,
  cooldownHours: number,
  dashboardUrl: string = 'https://myanalytics.com/dashboard'
) {
  const data: TrafficSpikeEmailData = {
    domain,
    currentTraffic,
    threshold,
    cooldownHours,
    dashboardUrl,
  };

  return await renderTemplate(EmailType.TRAFFIC_SPIKE, data);
}

/**
 * Generate downtime alert email
 *
 * @param domain - Website domain
 * @param lastPageviewTime - Timestamp of last pageview
 * @param thresholdMinutes - Configured threshold in minutes
 * @param cooldownHours - Cooldown period in hours
 * @param dashboardUrl - URL to dashboard
 * @returns Promise with rendered email (html, text, subject)
 */
export async function generateDowntimeAlert(
  domain: string,
  lastPageviewTime: Date,
  thresholdMinutes: number,
  cooldownHours: number,
  dashboardUrl: string = 'https://myanalytics.com/dashboard'
) {
  const data: DowntimeEmailData = {
    domain,
    lastPageviewTime,
    thresholdMinutes,
    cooldownHours,
    dashboardUrl,
  };

  return await renderTemplate(EmailType.DOWNTIME, data);
}
