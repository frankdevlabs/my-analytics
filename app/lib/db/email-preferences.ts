/**
 * Email Preferences Data Access Layer (DAL)
 * Handles CRUD operations for email preference settings
 */

import { PrismaClient, EmailPreference, EmailSchedule, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from './prisma';
import { retryWithBackoff, DatabaseError } from './pageviews';

/**
 * Get email preference for a user and optional website
 * Falls back to global preference (websiteId = null) if site-specific not found
 *
 * @param userId - User ID
 * @param websiteId - Website ID (null for global)
 * @param prismaClient - Optional Prisma client for testing
 * @returns EmailPreference or null if not found
 *
 * @example
 * const pref = await getEmailPreference('user123', 'website456');
 * // Returns site-specific preference or falls back to global
 */
export async function getEmailPreference(
  userId: string,
  websiteId: string | null,
  prismaClient?: PrismaClient
): Promise<EmailPreference | null> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      // First try to get site-specific preference
      if (websiteId) {
        const sitePreference = await client.emailPreference.findFirst({
          where: {
            userId,
            websiteId,
          },
        });

        if (sitePreference) {
          return sitePreference;
        }
      }

      // Fall back to global preference
      const globalPreference = await client.emailPreference.findFirst({
        where: {
          userId,
          websiteId: null,
        },
      });

      return globalPreference;
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to get email preference',
      'getEmailPreference',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get all email preferences for a user (global + all site-specific)
 *
 * @param userId - User ID
 * @param prismaClient - Optional Prisma client for testing
 * @returns Array of EmailPreferences
 */
export async function getAllEmailPreferences(
  userId: string,
  prismaClient?: PrismaClient
): Promise<EmailPreference[]> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      return await client.emailPreference.findMany({
        where: {
          userId,
        },
        orderBy: [
          { websiteId: 'asc' }, // null (global) first, then site-specific
        ],
      });
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to get all email preferences',
      'getAllEmailPreferences',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Create or update email preference (upsert)
 *
 * @param data - Preference data
 * @param prismaClient - Optional Prisma client for testing
 * @returns Created/updated EmailPreference
 *
 * @example
 * const pref = await createOrUpdatePreference({
 *   userId: 'user123',
 *   websiteId: 'website456',
 *   reportEnabled: true,
 *   reportSchedule: EmailSchedule.DAILY,
 * });
 */
export async function createOrUpdatePreference(
  data: {
    userId: string;
    websiteId?: string | null;
    reportSchedule?: EmailSchedule | null;
    reportEnabled?: boolean;
    spikeAlertEnabled?: boolean;
    spikeThreshold?: number | null;
    downtimeAlertEnabled?: boolean;
    downtimeThresholdMinutes?: number | null;
    alertCooldownHours?: number;
    templateConfig?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  },
  prismaClient?: PrismaClient
): Promise<EmailPreference> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      // Find existing preference
      const existing = await client.emailPreference.findFirst({
        where: {
          userId: data.userId,
          websiteId: data.websiteId || null,
        },
      });

      if (existing) {
        // Update existing
        // Omit userId and websiteId from the update data as they shouldn't be changed
        const { userId: _userId, websiteId: _websiteId, ...updateData } = data;
        return await client.emailPreference.update({
          where: {
            id: existing.id,
          },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new
        return await client.emailPreference.create({
          data,
        });
      }
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to create or update email preference',
      'createOrUpdatePreference',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Update last triggered timestamp for alert
 *
 * @param userId - User ID
 * @param websiteId - Website ID (null for global)
 * @param alertType - 'spike' or 'downtime'
 * @param timestamp - Timestamp to set
 * @param prismaClient - Optional Prisma client for testing
 *
 * @example
 * await updateLastTriggered('user123', 'website456', 'spike', new Date());
 */
export async function updateLastTriggered(
  userId: string,
  websiteId: string | null,
  alertType: 'spike' | 'downtime',
  timestamp: Date,
  prismaClient?: PrismaClient
): Promise<void> {
  const client = prismaClient || defaultPrisma;

  try {
    await retryWithBackoff(async () => {
      const preference = await client.emailPreference.findFirst({
        where: {
          userId,
          websiteId,
        },
      });

      if (!preference) {
        throw new Error('Email preference not found');
      }

      const updateData =
        alertType === 'spike'
          ? { lastSpikeTriggeredAt: timestamp }
          : { lastDowntimeTriggeredAt: timestamp };

      await client.emailPreference.update({
        where: {
          id: preference.id,
        },
        data: updateData,
      });
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to update last triggered timestamp',
      'updateLastTriggered',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get all preferences with alerts enabled for a specific alert type
 *
 * @param alertType - 'spike' or 'downtime'
 * @param prismaClient - Optional Prisma client for testing
 * @returns Array of EmailPreferences with alerts enabled
 *
 * @example
 * const prefs = await getPreferencesWithAlertsEnabled('spike');
 * // Returns all preferences where spikeAlertEnabled = true
 */
export async function getPreferencesWithAlertsEnabled(
  alertType: 'spike' | 'downtime',
  prismaClient?: PrismaClient
): Promise<EmailPreference[]> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      const where =
        alertType === 'spike'
          ? { spikeAlertEnabled: true }
          : { downtimeAlertEnabled: true };

      return await client.emailPreference.findMany({
        where,
      });
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to get preferences with alerts enabled',
      'getPreferencesWithAlertsEnabled',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get all preferences with reports enabled for a specific schedule
 *
 * @param schedule - Report schedule (DAILY, WEEKLY, MONTHLY)
 * @param prismaClient - Optional Prisma client for testing
 * @returns Array of EmailPreferences with reports enabled
 *
 * @example
 * const prefs = await getPreferencesWithReportsEnabled(EmailSchedule.DAILY);
 * // Returns all preferences where reportEnabled = true AND reportSchedule = DAILY
 */
export async function getPreferencesWithReportsEnabled(
  schedule: EmailSchedule,
  prismaClient?: PrismaClient
): Promise<EmailPreference[]> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      return await client.emailPreference.findMany({
        where: {
          reportEnabled: true,
          reportSchedule: schedule,
        },
      });
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to get preferences with reports enabled',
      'getPreferencesWithReportsEnabled',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
