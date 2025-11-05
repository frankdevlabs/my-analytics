/**
 * Backup Codes Utilities Tests
 * Unit tests for backup code generation and verification
 */

import {
  generateBackupCodes,
  verifyBackupCode,
  formatCodesForDisplay,
} from '../../../lib/auth/backup-codes';

describe('Backup Codes Utilities', () => {
  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', async () => {
      const codes = await generateBackupCodes();

      expect(codes).toHaveLength(10);
    });

    it('should generate specified number of codes', async () => {
      const codes = await generateBackupCodes(5);

      expect(codes).toHaveLength(5);
    });

    it('should generate codes with correct format', async () => {
      const codes = await generateBackupCodes(10);

      codes.forEach((codeObj) => {
        // Plain text code should be in XXXX-XXXX format
        expect(codeObj.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

        // Hashed code should be a bcrypt hash (starts with $2a$ or $2b$)
        expect(codeObj.hashedCode).toMatch(/^\$2[ab]\$/);
      });
    });

    it('should generate unique codes', async () => {
      const codes = await generateBackupCodes(10);
      const plainCodes = codes.map(c => c.code);
      const uniqueCodes = new Set(plainCodes);

      expect(uniqueCodes.size).toBe(plainCodes.length);
    });

    it('should generate different hashes for same code pattern', async () => {
      const codes1 = await generateBackupCodes(5);
      const codes2 = await generateBackupCodes(5);

      // All codes should be different
      const allCodes = [...codes1.map(c => c.code), ...codes2.map(c => c.code)];
      const uniqueCodes = new Set(allCodes);

      expect(uniqueCodes.size).toBe(10);
    });

    it('should not include ambiguous characters', async () => {
      const codes = await generateBackupCodes(20);

      codes.forEach((codeObj) => {
        // Should not contain 0, O, 1, I (ambiguous characters)
        expect(codeObj.code).not.toMatch(/[01OI]/);
      });
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify a valid backup code', async () => {
      const codes = await generateBackupCodes(1);
      const { code, hashedCode } = codes[0];

      const isValid = await verifyBackupCode(code, hashedCode);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid backup code', async () => {
      const codes = await generateBackupCodes(1);
      const { hashedCode } = codes[0];
      const wrongCode = '9999-9999';

      const isValid = await verifyBackupCode(wrongCode, hashedCode);

      expect(isValid).toBe(false);
    });

    it('should accept codes without hyphens', async () => {
      const codes = await generateBackupCodes(1);
      const { code, hashedCode } = codes[0];
      const codeWithoutHyphen = code.replace('-', '');

      const isValid = await verifyBackupCode(codeWithoutHyphen, hashedCode);

      expect(isValid).toBe(true);
    });

    it('should accept codes with spaces', async () => {
      const codes = await generateBackupCodes(1);
      const { code, hashedCode } = codes[0];
      const codeWithSpaces = code.replace('-', ' ');

      const isValid = await verifyBackupCode(codeWithSpaces, hashedCode);

      expect(isValid).toBe(true);
    });

    it('should accept lowercase codes', async () => {
      const codes = await generateBackupCodes(1);
      const { code, hashedCode } = codes[0];
      const lowercaseCode = code.toLowerCase();

      const isValid = await verifyBackupCode(lowercaseCode, hashedCode);

      expect(isValid).toBe(true);
    });

    it('should reject codes with wrong length', async () => {
      const codes = await generateBackupCodes(1);
      const { hashedCode } = codes[0];

      expect(await verifyBackupCode('123', hashedCode)).toBe(false);
      expect(await verifyBackupCode('123456789', hashedCode)).toBe(false);
    });

    it('should reject codes with invalid characters', async () => {
      const codes = await generateBackupCodes(1);
      const { hashedCode } = codes[0];

      expect(await verifyBackupCode('ABCD-EFG!', hashedCode)).toBe(false);
      expect(await verifyBackupCode('ABCD-EFG@', hashedCode)).toBe(false);
    });
  });

  describe('formatCodesForDisplay', () => {
    it('should format codes with numbering', async () => {
      const codes = await generateBackupCodes(3);
      const formatted = formatCodesForDisplay(codes);

      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toMatch(/^01\. [A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(formatted[1]).toMatch(/^02\. [A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(formatted[2]).toMatch(/^03\. [A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should handle 10+ codes with proper padding', async () => {
      const codes = await generateBackupCodes(12);
      const formatted = formatCodesForDisplay(codes);

      expect(formatted[8]).toMatch(/^09\./);
      expect(formatted[9]).toMatch(/^10\./);
      expect(formatted[10]).toMatch(/^11\./);
      expect(formatted[11]).toMatch(/^12\./);
    });

    it('should preserve the original code format', async () => {
      const codes = await generateBackupCodes(1);
      const formatted = formatCodesForDisplay(codes);

      expect(formatted[0]).toContain(codes[0].code);
    });
  });
});
