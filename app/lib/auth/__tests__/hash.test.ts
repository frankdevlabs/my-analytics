/**
 * Password Hashing Tests
 * Unit tests for password hashing and verification
 */

import { hashPassword, verifyPassword } from '../hash';

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should produce bcrypt hash format', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBeGreaterThanOrEqual(60);
    });

    it('should produce different hashes for same password (salt randomization)', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format (graceful failure)', async () => {
      const password = 'testPassword123';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      const isValid = await verifyPassword(password, invalidHash);

      expect(isValid).toBe(false);
    });
  });
});
