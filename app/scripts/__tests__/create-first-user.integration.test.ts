/**
 * Integration Tests for Create First User Script
 * Tests complete workflows including user creation, idempotency, and error handling
 */

import {
  createFirstUser
} from '../create-first-user';

// Mock all dependencies
jest.mock('../../lib/db/users');
jest.mock('../../lib/auth/hash');
jest.mock('../../lib/db/prisma');

import { getUserCount, createUser, getUserByEmail } from '../../lib/db/users';
import { hashPassword, verifyPassword } from '../../lib/auth/hash';
import { disconnectPrisma } from '../../lib/db/prisma';

// Suppress console output for all tests
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

describe('Create First User - Integration Tests', () => {
  const originalEnv = process.env;
  let mockExit: jest.SpyInstance;

  beforeAll(() => {
    // Mock process.exit once for all tests
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process.exit called with code ${code}`);
    });
  });

  beforeEach(() => {
    // Manually clear only the mocks we control, not all mocks
    (getUserCount as jest.Mock).mockClear();
    (hashPassword as jest.Mock).mockClear();
    (createUser as jest.Mock).mockClear();
    (getUserByEmail as jest.Mock).mockClear();
    (verifyPassword as jest.Mock).mockClear();
    (disconnectPrisma as jest.Mock).mockClear();
    mockExit.mockClear();

    // Reset environment
    process.env = { ...originalEnv };

    // Set up default environment variables
    process.env.FIRST_USER_EMAIL = 'admin@example.com';
    process.env.FIRST_USER_PASSWORD = 'securePassword123';
    process.env.FIRST_USER_NAME = 'Admin User';
  });

  afterAll(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('End-to-end user creation workflow', () => {
    it('should create user successfully when no users exist', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
        createdAt: new Date()
      };

      (getUserCount as jest.Mock).mockResolvedValue(0);
      (hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 0');

      expect(getUserCount).toHaveBeenCalled();
      expect(hashPassword).toHaveBeenCalledWith('securePassword123');
      expect(createUser).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User'
      });
      expect(verifyPassword).toHaveBeenCalledWith('securePassword123', '$2a$12$hashedpassword');
      expect(disconnectPrisma).toHaveBeenCalled();
    });

    it('should handle idempotent execution when user already exists', async () => {
      (getUserCount as jest.Mock).mockResolvedValue(1);
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 0');

      expect(getUserCount).toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
      expect(disconnectPrisma).toHaveBeenCalled();
    });

    it('should verify password hash after user creation', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
        createdAt: new Date()
      };

      (getUserCount as jest.Mock).mockResolvedValue(0);
      (hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 0');

      expect(verifyPassword).toHaveBeenCalledWith('securePassword123', '$2a$12$hashedpassword');
    });
  });

  describe('Error handling', () => {
    it('should handle database connection failures gracefully', async () => {
      (getUserCount as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 1');

      expect(disconnectPrisma).toHaveBeenCalled();
    });

    it('should handle user creation failures', async () => {
      (getUserCount as jest.Mock).mockResolvedValue(0);
      (hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
      (createUser as jest.Mock).mockRejectedValue(new Error('Failed to create user'));
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 1');

      expect(disconnectPrisma).toHaveBeenCalled();
    });

    it('should handle missing user after creation', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
        createdAt: new Date()
      };

      (getUserCount as jest.Mock).mockResolvedValue(0);
      (hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
      (createUser as jest.Mock).mockResolvedValue(mockUser);
      (getUserByEmail as jest.Mock).mockResolvedValue(null);
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 1');

      expect(disconnectPrisma).toHaveBeenCalled();
    });

    it('should handle invalid environment variables', async () => {
      delete process.env.FIRST_USER_EMAIL;
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 1');

      expect(disconnectPrisma).toHaveBeenCalled();
    });
  });

  describe('Resource cleanup', () => {
    it('should disconnect from database even on success', async () => {
      (getUserCount as jest.Mock).mockResolvedValue(1);
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 0');

      expect(disconnectPrisma).toHaveBeenCalled();
    });

    it('should disconnect from database even on failure', async () => {
      (getUserCount as jest.Mock).mockRejectedValue(new Error('Database error'));
      (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

      await expect(createFirstUser()).rejects.toThrow('Process.exit called with code 1');

      expect(disconnectPrisma).toHaveBeenCalled();
    });
  });
});
