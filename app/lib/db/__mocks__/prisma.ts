/**
 * Prisma Client Mock Singleton
 * Following official Prisma testing pattern with jest-mock-extended
 * @see https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing
 */

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.mock('../prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));
