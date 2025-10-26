/**
 * Unit Tests for Create First User Script
 * Tests validation logic and idempotent behavior
 */

import {
  validateEnvironmentVariables,
  checkUserExists,
  createAndVerifyUser
} from '../create-first-user';

// Mock dependencies
jest.mock('../../lib/db/users');
jest.mock('../../lib/auth/hash');
jest.mock('../../lib/db/prisma');

import { getUserCount, createUser, getUserByEmail } from '../../lib/db/users';
import { hashPassword, verifyPassword } from '../../lib/auth/hash';

describe('validateEnvironmentVariables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error when FIRST_USER_EMAIL is missing', () => {
    delete process.env.FIRST_USER_EMAIL;
    process.env.FIRST_USER_PASSWORD = 'password123';
    process.env.FIRST_USER_NAME = 'Admin';

    expect(() => validateEnvironmentVariables()).toThrow(
      'FIRST_USER_EMAIL environment variable is required'
    );
  });

  it('should throw error when FIRST_USER_PASSWORD is missing', () => {
    process.env.FIRST_USER_EMAIL = 'admin@example.com';
    delete process.env.FIRST_USER_PASSWORD;
    process.env.FIRST_USER_NAME = 'Admin';

    expect(() => validateEnvironmentVariables()).toThrow(
      'FIRST_USER_PASSWORD environment variable is required'
    );
  });

  it('should throw error when email format is invalid', () => {
    process.env.FIRST_USER_EMAIL = 'invalid-email';
    process.env.FIRST_USER_PASSWORD = 'password123';
    process.env.FIRST_USER_NAME = 'Admin';

    expect(() => validateEnvironmentVariables()).toThrow(
      'Invalid email format'
    );
  });

  it('should return validated values when all variables are valid', () => {
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

describe('checkUserExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when users exist', async () => {
    (getUserCount as jest.Mock).mockResolvedValue(1);

    const result = await checkUserExists();

    expect(result).toBe(true);
    expect(getUserCount).toHaveBeenCalledTimes(1);
  });

  it('should return false when no users exist', async () => {
    (getUserCount as jest.Mock).mockResolvedValue(0);

    const result = await checkUserExists();

    expect(result).toBe(false);
    expect(getUserCount).toHaveBeenCalledTimes(1);
  });
});

describe('createAndVerifyUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create user and verify password successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@example.com',
      password: 'hashed_password',
      name: 'Admin',
      createdAt: new Date()
    };

    (hashPassword as jest.Mock).mockResolvedValue('hashed_password');
    (createUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    await createAndVerifyUser('admin@example.com', 'password123', 'Admin');

    expect(hashPassword).toHaveBeenCalledWith('password123');
    expect(createUser).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'hashed_password',
      name: 'Admin'
    });
    expect(getUserByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(verifyPassword).toHaveBeenCalledWith('password123', 'hashed_password');
  });

  it('should throw error if password verification fails', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@example.com',
      password: 'hashed_password',
      name: 'Admin',
      createdAt: new Date()
    };

    (hashPassword as jest.Mock).mockResolvedValue('hashed_password');
    (createUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      createAndVerifyUser('admin@example.com', 'password123', 'Admin')
    ).rejects.toThrow('Password verification failed');
  });
});
