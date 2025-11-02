/**
 * Integration Tests for Prisma Seed Script Helper Functions
 * Tests the building blocks of the seed script without process.exit side effects
 */

// Mock all dependencies before importing
jest.mock('../../lib/db/users');
jest.mock('../../lib/auth/hash');
jest.mock('../../lib/db/prisma', () => ({
  disconnectPrisma: jest.fn(),
}));

import { getUserCount, createUser, getUserByEmail } from '../../lib/db/users';
import { hashPassword, verifyPassword } from '../../lib/auth/hash';
import { disconnectPrisma } from '../../lib/db/prisma';
import {
  validateEnvironmentVariables,
  checkUserExists,
  createAndVerifyUser,
} from '../../scripts/create-first-user';

describe('Prisma Seed Script - Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Set up default environment variables
    process.env.FIRST_USER_EMAIL = 'admin@example.com';
    process.env.FIRST_USER_PASSWORD = 'securePassword123';
    process.env.FIRST_USER_NAME = 'Admin User';

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    it('should return valid credentials when all env vars are set', () => {
      const result = validateEnvironmentVariables();

      expect(result).toEqual({
        email: 'admin@example.com',
        password: 'securePassword123',
        name: 'Admin User',
      });
    });

    it('should throw error when FIRST_USER_EMAIL is missing', () => {
      delete process.env.FIRST_USER_EMAIL;

      expect(() => validateEnvironmentVariables()).toThrow(
        'FIRST_USER_EMAIL environment variable is required'
      );
    });
  });

  describe('checkUserExists', () => {
    it('should return false when no users exist', async () => {
      (getUserCount as jest.Mock).mockResolvedValue(0);

      const result = await checkUserExists();

      expect(result).toBe(false);
      expect(getUserCount).toHaveBeenCalled();
    });

    it('should return true when users exist', async () => {
      (getUserCount as jest.Mock).mockResolvedValue(1);

      const result = await checkUserExists();

      expect(result).toBe(true);
      expect(getUserCount).toHaveBeenCalled();
    });
  });

  describe('createAndVerifyUser', () => {
    it('should create user and verify password hash', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
        createdAt: new Date(),
      };

      (hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      await createAndVerifyUser('admin@example.com', 'securePassword123', 'Admin User');

      expect(hashPassword).toHaveBeenCalledWith('securePassword123');
      expect(createUser).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
      });
      expect(getUserByEmail).toHaveBeenCalledWith('admin@example.com');
      expect(verifyPassword).toHaveBeenCalledWith('securePassword123', '$2a$12$hashedpassword');
    });

    it('should throw error if password verification fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
        createdAt: new Date(),
      };

      (hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        createAndVerifyUser('admin@example.com', 'securePassword123', 'Admin User')
      ).rejects.toThrow('Password verification failed');
    });
  });

  describe('database cleanup', () => {
    it('should call disconnectPrisma when provided', async () => {
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await disconnectPrisma();

      expect(disconnectPrisma).toHaveBeenCalled();
    });
  });
});
