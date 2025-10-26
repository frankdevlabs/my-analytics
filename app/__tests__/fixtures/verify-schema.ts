/**
 * Quick script to verify database schema
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  try {
    // Try to query with hostname filter
    const result = await prisma.pageview.findFirst({
      where: {
        hostname: 'test.com'
      }
    });

    console.log('Schema verified - hostname column exists');
    console.log('Result:', result);
  } catch (error) {
    console.error('Schema verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema();
