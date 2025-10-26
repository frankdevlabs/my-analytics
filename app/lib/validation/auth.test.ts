/**
 * Authentication Validation Tests
 * Unit tests for authentication validation schemas
 */

import {
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
} from './auth';

describe('Authentication Validation', () => {
  describe('emailSchema', () => {
    it('should accept valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should trim whitespace from email', () => {
      const result = emailSchema.safeParse('  test@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should reject email longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // 262 characters
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should accept password with 8 characters', () => {
      const result = passwordSchema.safeParse('12345678');
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('1234567');
      expect(result.success).toBe(false);
    });

    it('should accept password with 128 characters', () => {
      const password = 'a'.repeat(128);
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(true);
    });

    it('should reject password longer than 128 characters', () => {
      const password = 'a'.repeat(129);
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
      }
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should accept valid email, password, and name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
        expect(result.data.name).toBe('Test User');
      }
    });

    it('should accept optional name field', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
      }
    });

    it('should transform empty string name to undefined', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
      }
    });

    it('should trim whitespace from name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: '  Test User  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test User');
      }
    });
  });
});
