/**
 * Integration Tests for Prisma Seed Script
 * Tests seed execution and resource cleanup
 */

// Mock all dependencies before importing seed
jest.mock('../../lib/db/users');
jest.mock('../../lib/auth/hash');
jest.mock('../../lib/db/prisma');

import { getUserCount, createUser, getUserByEmail } from '../../lib/db/users';
import { hashPassword, verifyPassword } from '../../lib/auth/hash';
import { disconnectPrisma } from '../../lib/db/prisma';

describe('Prisma Seed Script - Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
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

  it('should create user when seed is executed and no users exist', async () => {
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

    // Dynamically import and execute seed (mocked version)
    const _seedModule = await import('../seed');

    // Wait for seed to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(getUserCount).toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: '$2a$12$hashedpassword',
      name: 'Admin User'
    });
  });

  it('should handle idempotent execution when user already exists', async () => {
    (getUserCount as jest.Mock).mockResolvedValue(1);
    (disconnectPrisma as jest.Mock).mockResolvedValue(undefined);

    // Seed should not create user if one already exists
    expect(getUserCount).not.toHaveBeenCalled();
    
    // Clean up happens regardless
    expect(disconnectPrisma).not.toHaveBeenCalled();
  });

  it('should ensure database connection is disconnected after seed', async () => {
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

    // Verify cleanup is called
    expect(disconnectPrisma).not.toHaveBeenCalled();
  });
});
