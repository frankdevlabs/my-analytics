/**
 * Zod validation schema for custom event tracking payload
 * Validates event data with metadata size limits
 */

import { z } from 'zod';

/**
 * CUID validation regex
 * CUIDs start with 'c' and are 25 characters total (c + 24 alphanumeric)
 * Example: clh1234567890abcdefghijk1
 */
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Maximum metadata size in bytes (5KB)
 */
const MAX_METADATA_SIZE = 5 * 1024;

/**
 * Custom refinement to validate event metadata size
 * Ensures stringified JSON doesn't exceed 5KB
 */
const validateMetadataSize = (metadata: unknown): boolean => {
  if (metadata === null || metadata === undefined) {
    return true;
  }

  try {
    const jsonString = JSON.stringify(metadata);
    const sizeInBytes = new Blob([jsonString]).size;
    return sizeInBytes <= MAX_METADATA_SIZE;
  } catch {
    return false;
  }
};

/**
 * Event tracking payload schema
 * Used by the /api/track/event endpoint for custom event tracking
 */
export const EventPayloadSchema = z.object({
  // Event name: identifies the type of event (e.g., "button_click", "scroll_25")
  event_name: z
    .string()
    .min(1, 'Event name is required')
    .max(255, 'Event name must be at most 255 characters'),

  // Event metadata: flexible JSONB storage for event properties
  event_metadata: z
    .record(z.unknown())
    .optional()
    .refine(
      validateMetadataSize,
      'Event metadata must be less than 5KB when stringified'
    ),

  // Page ID: optional link to parent pageview
  page_id: z
    .string()
    .regex(CUID_REGEX, 'Page ID must be a valid CUID format')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Session ID: links event to session
  session_id: z
    .string()
    .min(1, 'Session ID is required')
    .max(255, 'Session ID must be at most 255 characters'),

  // Path: URL path where event occurred
  path: z
    .string()
    .min(1, 'Path is required')
    .max(2000, 'Path must be at most 2000 characters'),

  // Timestamp: when the event occurred
  timestamp: z
    .string()
    .datetime({ message: 'Timestamp must be a valid ISO 8601 timestamp' }),
});

/**
 * Inferred TypeScript type from the schema
 */
export type EventPayload = z.infer<typeof EventPayloadSchema>;
