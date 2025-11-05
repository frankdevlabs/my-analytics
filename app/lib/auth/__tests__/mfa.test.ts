/**
 * MFA Utilities Tests
 * Unit tests for TOTP generation, verification, and encryption
 */

import {
  generateSecret,
  generateOtpauthUrl,
  verifyToken,
  encryptSecret,
  decryptSecret,
  generateEncryptionKey,
} from '../../../lib/auth/mfa';
import { authenticator } from '@otplib/preset-default';

describe('MFA Utilities', () => {
  // Set up test encryption key
  const TEST_ENCRYPTION_KEY = generateEncryptionKey();

  beforeAll(() => {
    process.env.MFA_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterAll(() => {
    delete process.env.MFA_ENCRYPTION_KEY;
  });

  describe('generateSecret', () => {
    it('should generate a valid base32 secret', () => {
      const secret = generateSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
      // Base32 characters only (A-Z and 2-7)
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();

      expect(secret1).not.toBe(secret2);
    });
  });

  describe('generateOtpauthUrl', () => {
    it('should generate a valid otpauth URL', () => {
      const email = 'test@example.com';
      const secret = 'JBSWY3DPEHPK3PXP';

      const url = generateOtpauthUrl(email, secret);

      expect(url).toContain('otpauth://totp/');
      expect(url).toContain(encodeURIComponent(email));
      expect(url).toContain(secret);
      // Issuer is URL encoded in the URL
      expect(url).toContain(encodeURIComponent('My Analytics'));
    });

    it('should use custom issuer', () => {
      const email = 'test@example.com';
      const secret = 'JBSWY3DPEHPK3PXP';
      const issuer = 'Custom App';

      const url = generateOtpauthUrl(email, secret, issuer);

      // Issuer is URL encoded in the URL
      expect(url).toContain(encodeURIComponent(issuer));
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid TOTP token', () => {
      const secret = generateSecret();
      const token = authenticator.generate(secret);

      const isValid = verifyToken(token, secret);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid token', () => {
      const secret = generateSecret();
      const invalidToken = '000000';

      const isValid = verifyToken(invalidToken, secret);

      expect(isValid).toBe(false);
    });

    it('should reject token with wrong length', () => {
      const secret = generateSecret();

      expect(verifyToken('12345', secret)).toBe(false);
      expect(verifyToken('1234567', secret)).toBe(false);
    });

    it('should reject non-numeric tokens', () => {
      const secret = generateSecret();

      expect(verifyToken('abcdef', secret)).toBe(false);
      expect(verifyToken('12345a', secret)).toBe(false);
    });

    it('should handle tokens with spaces', () => {
      const secret = generateSecret();
      const token = authenticator.generate(secret);
      const tokenWithSpaces = `${token.slice(0, 3)} ${token.slice(3)}`;

      const isValid = verifyToken(tokenWithSpaces, secret);

      expect(isValid).toBe(true);
    });
  });

  describe('encryptSecret and decryptSecret', () => {
    it('should encrypt and decrypt a secret', () => {
      const originalSecret = 'JBSWY3DPEHPK3PXP';

      const encrypted = encryptSecret(originalSecret);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(originalSecret);
    });

    it('should produce different encrypted values each time', () => {
      const secret = 'JBSWY3DPEHPK3PXP';

      const encrypted1 = encryptSecret(secret);
      const encrypted2 = encryptSecret(secret);

      // Different IVs mean different encrypted outputs
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decryptSecret(encrypted1)).toBe(secret);
      expect(decryptSecret(encrypted2)).toBe(secret);
    });

    it('should fail without encryption key', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const originalKey = process.env.MFA_ENCRYPTION_KEY;
      delete process.env.MFA_ENCRYPTION_KEY;

      expect(() => encryptSecret(secret)).toThrow('MFA_ENCRYPTION_KEY');

      process.env.MFA_ENCRYPTION_KEY = originalKey;
    });

    it('should fail with invalid encryption key length', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const originalKey = process.env.MFA_ENCRYPTION_KEY;
      process.env.MFA_ENCRYPTION_KEY = 'tooshort';

      expect(() => encryptSecret(secret)).toThrow('32-byte hex string');

      process.env.MFA_ENCRYPTION_KEY = originalKey;
    });

    it('should fail to decrypt with wrong key', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptSecret(secret);

      // Change the key
      process.env.MFA_ENCRYPTION_KEY = generateEncryptionKey();

      expect(() => decryptSecret(encrypted)).toThrow();

      // Restore original key
      process.env.MFA_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    });

    it('should fail to decrypt malformed encrypted string', () => {
      expect(() => decryptSecret('invalid')).toThrow('Invalid encrypted secret format');
      expect(() => decryptSecret('a:b')).toThrow('Invalid encrypted secret format');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});
