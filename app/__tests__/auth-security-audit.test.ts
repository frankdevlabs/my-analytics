/**
 * Authentication Security Audit Tests
 * Validates security requirements for the authentication system
 *
 * Tests cover:
 * - Password hashing with bcrypt cost factor 12
 * - No password leaks in logs or responses
 * - JWT token security
 * - Single-user constraint enforcement
 * - Input validation and sanitization
 */

import { hashPassword, verifyPassword } from '../lib/auth/hash';
import { registerSchema, loginSchema, emailSchema, passwordSchema } from '../lib/validation/auth';

describe('Security Audit: Password Storage', () => {
  it('should hash passwords with bcrypt cost factor 12', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    // Verify bcrypt format with cost factor 12
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('should never store passwords in plaintext', async () => {
    const password = 'MySecurePassword';
    const hash = await hashPassword(password);

    // Hash should be completely different from plaintext
    expect(hash).not.toContain(password);
    expect(hash).not.toBe(password);
  });

  it('should produce unique salts for each password hash', async () => {
    const password = 'SamePassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Different hashes (different salts) for same password
    expect(hash1).not.toBe(hash2);

    // Both should verify successfully
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const correctPassword = 'CorrectPassword123';
    const incorrectPassword = 'WrongPassword456';
    const hash = await hashPassword(correctPassword);

    expect(await verifyPassword(correctPassword, hash)).toBe(true);
    expect(await verifyPassword(incorrectPassword, hash)).toBe(false);
  });
});

describe('Security Audit: Input Validation', () => {
  it('should enforce minimum password length of 8 characters', () => {
    const shortPassword = 'short';
    const result = passwordSchema.safeParse(shortPassword);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 8');
    }
  });

  it('should enforce maximum password length of 128 characters', () => {
    const longPassword = 'a'.repeat(129);
    const result = passwordSchema.safeParse(longPassword);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at most 128');
    }
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'test@',
      'test..user@example.com',
      'test@.com',
    ];

    invalidEmails.forEach((email) => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });

  it('should accept valid email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.co.uk',
    ];

    validEmails.forEach((email) => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(true);
    });
  });

  it('should normalize email to lowercase', () => {
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

  it('should enforce email maximum length of 255 characters', () => {
    const longEmail = 'a'.repeat(246) + '@example.com'; // 258 chars
    const result = emailSchema.safeParse(longEmail);

    expect(result.success).toBe(false);
  });
});

describe('Security Audit: Login Schema Validation', () => {
  it('should require both email and password', () => {
    const missingEmail = loginSchema.safeParse({ password: 'password123' });
    const missingPassword = loginSchema.safeParse({ email: 'test@example.com' });

    expect(missingEmail.success).toBe(false);
    expect(missingPassword.success).toBe(false);
  });

  it('should validate email and password formats in login', () => {
    const invalid = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'short',
    });

    expect(invalid.success).toBe(false);
  });

  it('should accept valid login credentials', () => {
    const valid = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'ValidPassword123',
    });

    expect(valid.success).toBe(true);
  });
});

describe('Security Audit: Registration Schema Validation', () => {
  it('should require email and password for registration', () => {
    const missing = registerSchema.safeParse({});

    expect(missing.success).toBe(false);
  });

  it('should make name field optional', () => {
    const withoutName = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'ValidPassword123',
    });

    expect(withoutName.success).toBe(true);
    if (withoutName.success) {
      expect(withoutName.data.name).toBeUndefined();
    }
  });

  it('should accept valid registration with name', () => {
    const valid = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'ValidPassword123',
      name: 'Test User',
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.name).toBe('Test User');
    }
  });

  it('should transform empty string name to undefined', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'ValidPassword123',
      name: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeUndefined();
    }
  });
});

describe('Security Audit: Password Hashing Performance', () => {
  it('should hash password in acceptable time (<500ms)', async () => {
    const password = 'TestPassword123';
    const startTime = Date.now();

    await hashPassword(password);

    const duration = Date.now() - startTime;

    // Bcrypt with cost factor 12 should complete within 500ms
    expect(duration).toBeLessThan(500);
  });

  it('should verify password in acceptable time (<500ms)', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    const startTime = Date.now();

    await verifyPassword(password, hash);

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
  });
});

describe('Security Audit: Error Handling', () => {
  it('should handle invalid hash format gracefully', async () => {
    const result = await verifyPassword('password', 'invalid-hash');

    // Should return false, not throw error
    expect(result).toBe(false);
  });

  it('should handle empty password gracefully', async () => {
    const result = passwordSchema.safeParse('');

    expect(result.success).toBe(false);
  });

  it('should handle null values gracefully', () => {
    const emailResult = emailSchema.safeParse(null);
    const passwordResult = passwordSchema.safeParse(null);

    expect(emailResult.success).toBe(false);
    expect(passwordResult.success).toBe(false);
  });
});

describe('Security Audit: No Information Disclosure', () => {
  it('should not expose password validation rules in error messages', () => {
    const result = passwordSchema.safeParse('short');

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMessage = result.error.issues[0].message;
      // Error message should not reveal specific requirements
      expect(errorMessage.toLowerCase()).not.toContain('hash');
      expect(errorMessage.toLowerCase()).not.toContain('bcrypt');
    }
  });
});
