/**
 * Authentication Validation Schemas
 * Zod schemas for validating authentication inputs
 */

import { z } from 'zod';

/**
 * Email validation schema
 * - Must be valid email format
 * - Maximum 255 characters
 * - Converted to lowercase for consistency
 * - Whitespace trimmed
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255, 'Email must be at most 255 characters');

/**
 * Password validation schema
 * - Minimum 8 characters for security
 * - Maximum 128 characters for user convenience
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

/**
 * Login schema for authentication
 * Validates email and password for sign-in
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Registration schema for new user creation
 * Validates email, password, and optional name
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .optional()
    .transform((val) => {
      // Transform empty string to undefined
      if (val === '') return undefined;
      return val;
    }),
});

/**
 * Type inference for login schema
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Type inference for registration schema
 */
export type RegisterInput = z.infer<typeof registerSchema>;
