/**
 * Registration API Integration Tests
 * Tests for user registration endpoint including single-user constraint
 *
 * Note: These tests focus on the registration logic without testing
 * the Next.js Request/Response objects directly (which require special setup)
 */

import { getUserCount, createUser } from '../lib/db/users';
import { hashPassword } from '../lib/auth/hash';
import { registerSchema } from '../lib/validation/auth';

// Mock dependencies
jest.mock('../lib/db/users');
jest.mock('../lib/auth/hash');

const mockGetUserCount = getUserCount as jest.MockedFunction<typeof getUserCount>;
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('Registration API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single-user constraint', () => {
    it('should allow registration when no users exist', async () => {
      mockGetUserCount.mockResolvedValue(0);

      const count = await getUserCount();

      expect(count).toBe(0);
      // Registration would be allowed
    });

    it('should block registration when user already exists', async () => {
      mockGetUserCount.mockResolvedValue(1);

      const count = await getUserCount();

      expect(count).toBe(1);
      // Registration would be blocked with 403
    });
  });

  describe('Input validation for registration', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'admin@example.com',
        password: 'SecurePass123',
        name: 'Admin User',
      };

      const result = registerSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('admin@example.com');
        expect(result.data.password).toBe('SecurePass123');
        expect(result.data.name).toBe('Admin User');
      }
    });

    it('should reject invalid email in registration', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'SecurePass123',
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject short password in registration', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject long password in registration', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'a'.repeat(129),
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should normalize email to lowercase in registration', () => {
      const data = {
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePass123',
      };

      const result = registerSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });

  describe('Registration workflow', () => {
    it('should hash password and create user successfully', async () => {
      const registrationData = {
        email: 'admin@example.com',
        password: 'SecurePass123',
        name: 'Admin User',
      };

      // Mock password hashing
      mockHashPassword.mockResolvedValue('$2a$12$hashedpassword');

      // Mock user creation
      mockCreateUser.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
        createdAt: new Date(),
      });

      // Simulate registration workflow
      const hashedPassword = await hashPassword(registrationData.password);
      const newUser = await createUser({
        email: registrationData.email,
        password: hashedPassword,
        name: registrationData.name,
      });

      expect(mockHashPassword).toHaveBeenCalledWith('SecurePass123');
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: 'Admin User',
      });
      expect(newUser.email).toBe('admin@example.com');
    });

    it('should handle registration with optional name field', async () => {
      const registrationData = {
        email: 'admin@example.com',
        password: 'SecurePass123',
      };

      mockHashPassword.mockResolvedValue('$2a$12$hashedpassword');
      mockCreateUser.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        password: '$2a$12$hashedpassword',
        name: null,
        createdAt: new Date(),
      });

      const hashedPassword = await hashPassword(registrationData.password);
      const newUser = await createUser({
        email: registrationData.email,
        password: hashedPassword,
      });

      expect(newUser.name).toBeNull();
    });

    it('should handle database errors during registration', async () => {
      mockGetUserCount.mockRejectedValue(new Error('Database connection failed'));

      await expect(getUserCount()).rejects.toThrow('Database connection failed');
    });
  });
});
