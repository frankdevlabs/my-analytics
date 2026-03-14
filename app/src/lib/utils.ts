/**
 * Utility Functions
 * Common helper functions used across the application
 */

/**
 * Merges class names, filtering out falsy values
 * @param classes - Class names to merge
 * @returns Merged class string
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
