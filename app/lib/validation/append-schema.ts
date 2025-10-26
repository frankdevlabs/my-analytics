/**
 * Zod validation schema for pageview append payload
 * Used to update duration and scroll data for existing pageviews
 */

import { z } from 'zod';

/**
 * CUID validation regex
 * CUIDs start with 'c' and are 25 characters total (c + 24 alphanumeric)
 * Example: clh1234567890abcdefghijk1
 */
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Append payload schema for updating pageview engagement metrics
 * Used by the /api/track/append endpoint
 */
export const AppendPayloadSchema = z.object({
  // Page ID: identifies the pageview record to update
  page_id: z
    .string()
    .min(1, 'Page ID is required')
    .regex(CUID_REGEX, 'Page ID must be a valid CUID format'),

  // Duration seconds: total time on page
  duration_seconds: z
    .number()
    .int('Duration seconds must be an integer')
    .nonnegative('Duration seconds must be greater than or equal to 0')
    .finite('Duration seconds must be a finite number'),

  // Scrolled percentage: max scroll depth (0-100)
  scrolled_percentage: z
    .number()
    .int('Scrolled percentage must be an integer')
    .min(0, 'Scrolled percentage must be at least 0')
    .max(100, 'Scrolled percentage must be at most 100')
    .optional(),
});

/**
 * Inferred TypeScript type from the schema
 */
export type AppendPayload = z.infer<typeof AppendPayloadSchema>;
