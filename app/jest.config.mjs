const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed to jsdom for React component tests
  roots: ['<rootDir>/src', '<rootDir>/lib', '<rootDir>/__tests__', '<rootDir>/scripts', '<rootDir>/prisma'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
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
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth|next-themes)/)',
  ],
  moduleNameMapper: {
    // CSS and style mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Path aliases (order matters - more specific first)
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lib/(.*)$': '<rootDir>/lib/$1',
  },
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

export default config;
