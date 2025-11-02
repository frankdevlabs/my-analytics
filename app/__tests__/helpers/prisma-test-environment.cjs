/**
 * Custom Jest Environment for Prisma Transaction-Based Testing
 *
 * Extends @quramy/jest-prisma to provide:
 * - Automatic transaction wrapping for each test
 * - Automatic rollback after each test
 * - Isolated test execution
 *
 * Each test runs in its own transaction that gets rolled back,
 * ensuring tests don't affect each other and no manual cleanup is needed.
 */

const PrismaEnvironment = require('@quramy/jest-prisma/environment').default;

class CustomPrismaEnvironment extends PrismaEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();

    // Log environment setup (helpful for debugging)
    if (process.env.DEBUG_TESTS) {
      console.log('🧪 Prisma test environment initialized with transaction isolation');
    }
  }

  async teardown() {
    await super.teardown();

    if (process.env.DEBUG_TESTS) {
      console.log('✅ Prisma test environment cleaned up');
    }
  }
}

module.exports = CustomPrismaEnvironment;
