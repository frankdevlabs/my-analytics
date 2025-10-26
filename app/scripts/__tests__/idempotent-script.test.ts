/**
 * Integration tests for idempotent script behavior
 * Tests the create-first-user script with mocked database functions
 *
 * @jest-environment node
 */

import {
  validateEnvironmentVariables,
  checkUserExists,
  createAndVerifyUser
} from '../create-first-user';
import * as usersModule from '../../lib/db/users';
import * as hashModule from '../../lib/auth/hash';

// Mock the database and auth modules
jest.mock('../../lib/db/users');
jest.mock('../../lib/auth/hash');

describe('Idempotent Script Behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Set up default environment variables for tests
    process.env.FIRST_USER_EMAIL = 'test@example.com';
    process.env.FIRST_USER_PASSWORD = 'testpassword123';
    process.env.FIRST_USER_NAME = 'Test User';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should succeed when no users exist', async () => {
    // Mock getUserCount to return 0 (no users)
    (usersModule.getUserCount as jest.Mock).mockResolvedValue(0);

    const userExists = await checkUserExists();
    expect(userExists).toBe(false);
  });

  test('should succeed when user already exists (idempotent)', async () => {
    // Mock getUserCount to return 1 (user exists)
    (usersModule.getUserCount as jest.Mock).mockResolvedValue(1);

    const userExists = await checkUserExists();
    expect(userExists).toBe(true);
  });

  test('should create user and verify password hash', async () => {
    // Mock dependencies
    const mockHashedPassword = '$2a$12$hashedpassword';
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      password: mockHashedPassword,
      name: 'Test User',
      createdAt: new Date()
    };

    (hashModule.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
    (usersModule.createUser as jest.Mock).mockResolvedValue(mockUser);
    (usersModule.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (hashModule.verifyPassword as jest.Mock).mockResolvedValue(true);

    // Mock console.log to suppress output during test
    const originalLog = console.log;
    console.log = jest.fn();

    await createAndVerifyUser('test@example.com', 'testpassword123', 'Test User');

    // Verify all steps were called
    expect(hashModule.hashPassword).toHaveBeenCalledWith('testpassword123');
    expect(usersModule.createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: mockHashedPassword,
      name: 'Test User'
    });
    expect(usersModule.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(hashModule.verifyPassword).toHaveBeenCalledWith('testpassword123', mockHashedPassword);

    // Restore console.log
    console.log = originalLog;
  });

  test('should use environment variables for user creation', () => {
    process.env.FIRST_USER_EMAIL = 'admin@example.com';
    process.env.FIRST_USER_PASSWORD = 'securepassword';
    process.env.FIRST_USER_NAME = 'Admin User';

    const validated = validateEnvironmentVariables();

    expect(validated).toEqual({
      email: 'admin@example.com',
      password: 'securepassword',
      name: 'Admin User'
    });
  });
});
