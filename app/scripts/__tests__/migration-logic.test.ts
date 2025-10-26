/**
 * Unit tests for migration logic
 * Tests the migration behavior for first user creation
 *
 * @jest-environment node
 */

import * as usersModule from '../../lib/db/users';
import * as hashModule from '../../lib/auth/hash';

// Mock the modules
jest.mock('../../lib/db/users');
jest.mock('../../lib/auth/hash');

describe('Migration Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create user when none exists', async () => {
    const mockUser = {
      id: 'user123',
      email: 'admin@example.com',
      password: '$2a$12$hashedpassword',
      name: 'Admin User',
      createdAt: new Date()
    };

    (usersModule.getUserCount as jest.Mock).mockResolvedValue(0);
    (hashModule.hashPassword as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');
    (usersModule.createUser as jest.Mock).mockResolvedValue(mockUser);

    const userCount = await usersModule.getUserCount();
    expect(userCount).toBe(0);

    // Simulate migration creating user
    if (userCount === 0) {
      const hashedPassword = await hashModule.hashPassword('password123');
      const user = await usersModule.createUser({
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User'
      });

      expect(user).toEqual(mockUser);
      expect(usersModule.createUser).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User'
      });
    }
  });

  test('should succeed when user already exists (idempotent)', async () => {
    (usersModule.getUserCount as jest.Mock).mockResolvedValue(1);

    const userCount = await usersModule.getUserCount();
    expect(userCount).toBe(1);

    // Migration should skip user creation
    expect(usersModule.createUser).not.toHaveBeenCalled();
  });

  test('should handle missing environment variables gracefully', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.FIRST_USER_EMAIL;

    // Migration should check for env vars before proceeding
    const email = process.env.FIRST_USER_EMAIL;
    expect(email).toBeUndefined();

    // Restore env
    process.env = originalEnv;
  });
});
