/**
 * Email Delivery Logs Data Access Layer (DAL)
 * Handles CRUD operations for email delivery audit trail
 */

import { PrismaClient, EmailDeliveryLog, EmailType, EmailStatus } from '@prisma/client';
import { prisma as defaultPrisma } from './prisma';
import { retryWithBackoff, DatabaseError } from './pageviews';

/**
 * Paginated logs result
 */
export interface PaginatedLogs {
  logs: EmailDeliveryLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create email delivery log entry
 *
 * @param data - Log entry data
 * @param prismaClient - Optional Prisma client for testing
 * @returns Created EmailDeliveryLog
 *
 * @example
 * await createDeliveryLog({
 *   userId: 'user123',
 *   websiteId: 'website456',
 *   emailType: EmailType.DAILY_REPORT,
 *   recipientEmail: 'user@example.com',
 *   status: EmailStatus.SENT,
 * });
 */
export async function createDeliveryLog(
  data: {
    userId: string;
    websiteId: string | null;
    emailType: EmailType;
    recipientEmail: string;
    status: EmailStatus;
    errorMessage?: string | null;
  },
  prismaClient?: PrismaClient
): Promise<EmailDeliveryLog> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      return await client.emailDeliveryLog.create({
        data: {
          userId: data.userId,
          websiteId: data.websiteId,
          emailType: data.emailType,
          recipientEmail: data.recipientEmail,
          status: data.status,
          errorMessage: data.errorMessage || null,
          sentAt: new Date(),
        },
      });
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to create email delivery log',
      'createDeliveryLog',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get recent email delivery logs for a user with pagination
 *
 * @param userId - User ID
 * @param page - Page number (1-indexed)
 * @param limit - Records per page (default 20, max 100)
 * @param prismaClient - Optional Prisma client for testing
 * @returns PaginatedLogs with logs and pagination info
 *
 * @example
 * const result = await getRecentLogs('user123', 1, 20);
 * // result.logs contains up to 20 most recent logs
 * // result.total contains total count for pagination
 */
export async function getRecentLogs(
  userId: string,
  page: number = 1,
  limit: number = 20,
  prismaClient?: PrismaClient
): Promise<PaginatedLogs> {
  const client = prismaClient || defaultPrisma;

  // Validate and clamp limits
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (safePage - 1) * safeLimit;

  try {
    return await retryWithBackoff(async () => {
      const [logs, total] = await Promise.all([
        client.emailDeliveryLog.findMany({
          where: {
            userId,
          },
          orderBy: {
            sentAt: 'desc',
          },
          skip: offset,
          take: safeLimit,
        }),
        client.emailDeliveryLog.count({
          where: {
            userId,
          },
        }),
      ]);

      return {
        logs,
        total,
        page: safePage,
        limit: safeLimit,
      };
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to get recent logs',
      'getRecentLogs',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Get email delivery logs filtered by status
 *
 * @param userId - User ID
 * @param status - Email status (SENT or FAILED)
 * @param prismaClient - Optional Prisma client for testing
 * @returns Array of EmailDeliveryLogs
 *
 * @example
 * const failedLogs = await getLogsByStatus('user123', EmailStatus.FAILED);
 */
export async function getLogsByStatus(
  userId: string,
  status: EmailStatus,
  prismaClient?: PrismaClient
): Promise<EmailDeliveryLog[]> {
  const client = prismaClient || defaultPrisma;

  try {
    return await retryWithBackoff(async () => {
      return await client.emailDeliveryLog.findMany({
        where: {
          userId,
          status,
        },
        orderBy: {
          sentAt: 'desc',
        },
      });
    });
  } catch (error) {
    throw new DatabaseError(
      'Failed to get logs by status',
      'getLogsByStatus',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
