/**
 * Global teardown for Jest
 * Runs once after all test suites have completed
 * Used to clean up connections and resources
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  // Close Prisma connection if it exists
  try {
    const { prisma } = require('./lib/db/prisma');
    await prisma.$disconnect();
    console.log('✅ Prisma: Disconnected');
  } catch (error) {
    console.warn('⚠️  Prisma disconnect warning:', error.message);
  }

  // Close Redis connection if it was opened during tests
  try {
    const { closeRedisClient } = require('./lib/redis');
    await closeRedisClient();
    console.log('✅ Redis: Closed connection');
  } catch (error) {
    // Redis might not have been initialized in tests - that's OK
    if (error.message && !error.message.includes('Cannot find module')) {
      console.warn('⚠️  Redis cleanup warning:', error.message);
    }
  }

  // Give async operations more time to complete
  // Increased from 100ms to 500ms for better cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('✅ Test environment cleanup complete');
};
