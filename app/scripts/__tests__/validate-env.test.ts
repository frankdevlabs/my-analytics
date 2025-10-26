/**
 * Unit tests for environment variable validation
 * Tests the validateEnvironmentVariables function for first user creation
 *
 * @jest-environment node
 */

import { validateEnvironmentVariables } from '../create-first-user';

describe('validateEnvironmentVariables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment after all tests
    process.env = originalEnv;
  });

  test('should throw error when FIRST_USER_EMAIL is missing', () => {
    delete process.env.FIRST_USER_EMAIL;
    process.env.FIRST_USER_PASSWORD = 'password123';
    process.env.FIRST_USER_NAME = 'Admin User';

    expect(() => validateEnvironmentVariables()).toThrow(
      'FIRST_USER_EMAIL environment variable is required'
    );
  });

  test('should throw error when FIRST_USER_PASSWORD is missing', () => {
    process.env.FIRST_USER_EMAIL = 'admin@example.com';
    delete process.env.FIRST_USER_PASSWORD;
    process.env.FIRST_USER_NAME = 'Admin User';

    expect(() => validateEnvironmentVariables()).toThrow(
      'FIRST_USER_PASSWORD environment variable is required'
    );
  });

  test('should throw error when email format is invalid', () => {
    process.env.FIRST_USER_EMAIL = 'invalid-email';
    process.env.FIRST_USER_PASSWORD = 'password123';
    process.env.FIRST_USER_NAME = 'Admin User';

    expect(() => validateEnvironmentVariables()).toThrow(
      'Invalid email format'
    );
  });

  test('should return validated values when all inputs are valid', () => {
    process.env.FIRST_USER_EMAIL = 'admin@example.com';
    process.env.FIRST_USER_PASSWORD = 'password123';
    process.env.FIRST_USER_NAME = 'Admin User';

    const result = validateEnvironmentVariables();

    expect(result).toEqual({
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User'
    });
  });
});
