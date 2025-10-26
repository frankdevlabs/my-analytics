/**
 * Prisma Client Singleton
 * Ensures single database connection instance across application lifecycle
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure logging based on environment
const prismaClientOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? (['query', 'error', 'warn'] as const)
      : (['error'] as const),
  // Configure datasource with optimized connection pool settings
  // These settings help prevent connection pool exhaustion during bulk operations
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

// Create singleton instance
export const prisma =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions as any);

// In development, prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect from database
 * Used for testing and application shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
