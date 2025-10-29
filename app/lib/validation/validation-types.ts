/**
 * Validation result types
 * Provides type-safe validation results using discriminated union pattern
 */

/**
 * Discriminated union for validation results
 *
 * This type uses TypeScript's discriminated union pattern to ensure type safety
 * when working with validation results. The `success` field acts as the discriminant,
 * allowing TypeScript to narrow the type and guarantee the existence of either
 * `data` (when success is true) or `error` (when success is false).
 *
 * @example
 * ```typescript
 * const result: ValidationResult<User> = validateUser(input);
 *
 * if (result.success) {
 *   // TypeScript knows result.data exists here
 *   console.log(result.data.name);
 * } else {
 *   // TypeScript knows result.error exists here
 *   console.error(result.error);
 * }
 * ```
 *
 * @template T - The type of data returned on successful validation
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
