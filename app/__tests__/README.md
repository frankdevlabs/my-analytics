# Testing Guide

This directory contains tests for the My Analytics application.

## Test Types

### Unit Tests
- Located in `__tests__/` directories alongside source code
- Test individual functions and components in isolation
- Run with: `npm test`

### Integration Tests
- Located in `__tests__/integration/`
- Test multiple components working together
- May use real database connections

### E2E (End-to-End) Tests
- Located in `__tests__/integration/*-e2e.test.ts`
- Test complete user flows from start to finish
- Use real database and services

## Running Tests

**Good news!** The test database is automatically set up when you run tests. No manual setup needed!

```bash
# Run ALL tests (unit + integration + E2E)
npm test

# Run specific test file
npm test -- device-browser-tracking-e2e.test.ts

# Run E2E tests only
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Prerequisites

**Only one requirement**: PostgreSQL must be running via Docker:

```bash
docker-compose up -d postgres
```

That's it! Jest will automatically:
- ✅ Create the test database if it doesn't exist
- ✅ Run all Prisma migrations
- ✅ Set up the correct environment variables

## How It Works

Jest uses a **global setup** hook (`jest.globalSetup.cjs`) that runs once before all tests:

1. Checks if PostgreSQL container is running
2. Creates `my_analytics_test` database if needed
3. Runs Prisma migrations to set up schema
4. Sets environment variables for test isolation

This means **`npm test` works for everything** - no special commands needed!

## Test Database

- **Database Name**: `my_analytics_test`
- **Connection**: Uses same PostgreSQL instance as development (port 5432)
- **Cleanup**: Tests automatically clean up their data in `afterAll` hooks

### Manual Database Operations

```bash
# Set up/reset test database
npm run test:db-setup

# Drop test database (if needed)
# Connect to PostgreSQL and run: DROP DATABASE my_analytics_test;
```

## Test Utilities

The `helpers/e2e-test-utils.ts` file provides utilities for E2E tests:

- **Factory Functions**: `createTestPageview()`, `generateTestUserAgent()`
- **Cleanup Helpers**: `cleanupTestPageviews()`, `disconnectTestDb()`
- **Custom Matchers**: `expectDeviceCount()`, `expectBrowserInResults()`, `expectTotalPercentage()`

### Example Usage

```typescript
import {
  createTestPageview,
  cleanupTestPageviews,
  expectDeviceCount,
} from '../helpers/e2e-test-utils';

// Create test data
const pageview = createTestPageview({
  path: '/test-page',
  device_type: 'mobile',
});
await prisma.pageview.create({ data: pageview });

// Use custom assertions
expectDeviceCount(breakdown, 'Mobile', 1);

// Cleanup
await cleanupTestPageviews(prisma, '/test-');
```

## Troubleshooting

### Tests fail with "database does not exist"
Run `npm run test:db-setup` to create the test database.

### Tests fail with "connection refused"
Ensure PostgreSQL is running: `docker-compose up -d postgres`

### Tests are slow
E2E tests interact with a real database and are slower than unit tests. This is expected.

### Port conflicts
If port 5432 is in use, update `POSTGRES_PORT` in your `.env` file.

## Coverage

Generate coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.
