/**
 * Websites Data Access Layer
 * Database operations for Website model
 */

import { prisma } from './prisma';
import { DatabaseError } from './errors';

/**
 * Get all websites for a user
 * @param userId - User ID
 * @returns Array of websites
 */
export async function getWebsitesByUserId(userId: string) {
  try {
    const websites = await prisma.website.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return websites;
  } catch (error) {
    console.error('Failed to get websites:', error);
    throw new DatabaseError('Failed to retrieve websites');
  }
}

/**
 * Get a website by ID
 * @param id - Website ID
 * @returns Website or null
 */
export async function getWebsiteById(id: string) {
  try {
    const website = await prisma.website.findUnique({
      where: {
        id,
      },
    });

    return website;
  } catch (error) {
    console.error('Failed to get website:', error);
    throw new DatabaseError('Failed to retrieve website');
  }
}
