/**
 * Jest Configuration with Separate Projects for Different Test Types
 *
 * Project Structure:
 * - Unit Tests: Use jsdom environment for React components
 * - Integration Tests: Use Prisma transaction environment for database isolation
 * - API Tests: Use Prisma transaction environment for API route testing
 */

// Shared configuration for all projects
const sharedConfig = {
  preset: 'ts-jest',
  roots: ['<rootDir>/src', '<rootDir>/lib', '<rootDir>/__tests__', '<rootDir>/scripts', '<rootDir>/prisma'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: ['<rootDir>'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'scripts/**/*.{ts,tsx}',
    'prisma/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!lib/**/*.d.ts',
    '!scripts/**/*.d.ts',
    '!prisma/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  globalSetup: '<rootDir>/jest.globalSetup.cjs',
  globalTeardown: '<rootDir>/jest.globalTeardown.cjs',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth|next-themes)/)',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lib/(.*)$': '<rootDir>/lib/$1',
  },
};

const config = {
  projects: [
    // Unit Tests Project (Components, Hooks, Utils)
    {
      ...sharedConfig,
      displayName: 'unit',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/src/**/?(*.)+(spec|test).{ts,tsx}',
      ],
      testEnvironmentOptions: {
        customExportConditions: [''],
      },
    },
    // Integration Tests Project (Database operations)
    {
      ...sharedConfig,
      displayName: 'integration',
      testEnvironment: '<rootDir>/__tests__/helpers/prisma-test-environment.cjs',
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.test.{ts,tsx}',
      ],
      // Run UI integration tests sequentially to prevent Redis key collisions
      // Tests with long polling intervals need sequential execution
      maxWorkers: process.env.CI ? 2 : 1,
    },
    // API Tests Project (API routes)
    {
      ...sharedConfig,
      displayName: 'api',
      testEnvironment: '<rootDir>/__tests__/helpers/prisma-test-environment.cjs',
      testMatch: [
        '<rootDir>/__tests__/api/**/*.test.{ts,tsx}',
      ],
    },
    // Other Tests (lib, scripts, prisma)
    {
      ...sharedConfig,
      displayName: 'other',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/lib/**/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/scripts/**/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/prisma/**/__tests__/**/*.test.{ts,tsx}',
      ],
    },
  ],
};

export default config;
