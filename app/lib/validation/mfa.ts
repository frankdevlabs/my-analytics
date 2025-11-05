/**
 * MFA Validation Schemas
 * Zod schemas for validating MFA-related inputs
 */

import { z } from 'zod';

/**
 * TOTP token validation schema
 * - Must be exactly 6 digits
 * - No spaces or special characters
 */
export const totpTokenSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Invalid code format. Must be 6 digits')
  .length(6, 'Code must be exactly 6 digits');

/**
 * Backup code validation schema
 * - 8 alphanumeric characters (may include hyphen)
 * - Format: XXXX-XXXX or XXXXXXXX
 * - Case insensitive
 */
export const backupCodeSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s-]/g, '').toUpperCase())
  .refine(
    (val) => /^[A-Z0-9]{8}$/.test(val),
    'Invalid backup code format. Must be 8 alphanumeric characters'
  );

/**
 * MFA setup verification schema
 * Used when user confirms TOTP setup with first token
 */
export const mfaSetupSchema = z.object({
  token: totpTokenSchema,
  secret: z.string().min(1, 'Secret is required'),
});

/**
 * MFA verification schema for login
 * Accepts either TOTP token or backup code
 */
export const mfaVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Verification code is required'),
  isBackupCode: z.boolean().default(false).optional(),
});

/**
 * MFA disable schema
 * Requires password confirmation for security
 */
export const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

/**
 * Type inference for MFA setup schema
 */
export type MFASetupInput = z.infer<typeof mfaSetupSchema>;

/**
 * Type inference for MFA verification schema
 */
export type MFAVerifyInput = z.infer<typeof mfaVerifySchema>;

/**
 * Type inference for MFA disable schema
 */
export type MFADisableInput = z.infer<typeof mfaDisableSchema>;
