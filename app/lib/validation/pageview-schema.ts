/**
 * Zod validation schema for pageview tracking payload
 * Validates all 36 fields for comprehensive analytics tracking
 */

import { z } from 'zod';

/**
 * Device type enum schema matching Prisma DeviceType enum
 */
export const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet']);

/**
 * CUID validation regex
 * CUIDs start with 'c' and are 25 characters total (c + 24 alphanumeric)
 * Example: clh1234567890abcdefghijk1
 */
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Pageview tracking payload schema
 * Validates all 39 required and optional fields for pageview tracking and CSV imports
 */
export const PageviewPayloadSchema = z.object({
  // ============================================
  // Identity & Timing (5 fields)
  // ============================================

  // Page ID: client-generated CUID for linking append/event requests
  page_id: z
    .string()
    .min(1, 'Page ID is required')
    .regex(CUID_REGEX, 'Page ID must be a valid CUID format'),

  // Added ISO timestamp: client-reported timestamp
  added_iso: z
    .string()
    .datetime({ message: 'Added ISO must be a valid ISO 8601 timestamp' }),

  // Session ID: client-generated UUID from sessionStorage
  session_id: z
    .string()
    .max(255, 'Session ID must be at most 255 characters')
    .optional(),

  // ============================================
  // Page Context (6 fields)
  // ============================================

  // Hostname: domain name (e.g., "example.com")
  hostname: z
    .string()
    .max(255, 'Hostname must be at most 255 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Path: URL path (e.g., "/blog/article")
  path: z
    .string()
    .min(1, 'Path is required')
    .max(2000, 'Path must be at most 2000 characters')
    .startsWith('/', 'Path must start with "/"'),

  // Hash: URL fragment (e.g., "#section")
  hash: z
    .string()
    .max(1000, 'Hash must be at most 1000 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Query string: URL query params (e.g., "?key=value")
  query_string: z
    .string()
    .max(2000, 'Query string must be at most 2000 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Document title: page title from document.title
  document_title: z
    .string()
    .max(500, 'Document title must be at most 500 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Document referrer: HTTP referrer
  document_referrer: z
    .string()
    .max(2000, 'Document referrer must be at most 2000 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // ============================================
  // Device & Browser (9 fields)
  // ============================================

  // Device type: desktop, mobile, tablet
  device_type: DeviceTypeSchema,

  // Browser name: parsed from User-Agent (server-side)
  browser_name: z
    .string()
    .max(100, 'Browser name must be at most 100 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Browser version: parsed from User-Agent (server-side)
  browser_version: z
    .string()
    .max(50, 'Browser version must be at most 50 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // OS name: parsed from User-Agent (server-side)
  os_name: z
    .string()
    .max(100, 'OS name must be at most 100 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // OS version: parsed from User-Agent (server-side)
  os_version: z
    .string()
    .max(50, 'OS version must be at most 50 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Viewport width: window.innerWidth
  viewport_width: z
    .number()
    .int('Viewport width must be an integer')
    .positive('Viewport width must be positive')
    .optional(),

  // Viewport height: window.innerHeight
  viewport_height: z
    .number()
    .int('Viewport height must be an integer')
    .positive('Viewport height must be positive')
    .optional(),

  // Screen width: screen.width
  screen_width: z
    .number()
    .int('Screen width must be an integer')
    .positive('Screen width must be positive')
    .optional(),

  // Screen height: screen.height
  screen_height: z
    .number()
    .int('Screen height must be an integer')
    .positive('Screen height must be positive')
    .optional(),

  // ============================================
  // Locale & Environment (3 fields)
  // ============================================

  // Language: navigator.language
  language: z
    .string()
    .max(10, 'Language must be at most 10 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  timezone: z
    .string()
    .max(100, 'Timezone must be at most 100 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // User agent: full UA string (used for parsing)
  // Note: Empty string allowed for historical CSV imports
  user_agent: z
    .string()
    .max(1000, 'User agent must be at most 1000 characters'),

  // Country code: 2-letter ISO country code (from GeoIP lookup or CSV import)
  country_code: z
    .string()
    .length(2, 'Country code must be exactly 2 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // ============================================
  // Visitor Classification (3 fields)
  // ============================================

  // is_internal_referrer: SPA navigation vs external link
  is_internal_referrer: z.boolean(),

  // is_unique: whether this is the visitor's first pageview
  // Note: Computed server-side for tracking API, optional for CSV imports
  is_unique: z.boolean().optional(),

  // is_bot: whether the visitor is identified as a bot/crawler
  // Note: Computed server-side for tracking API, optional for CSV imports
  is_bot: z.boolean().optional(),

  // ============================================
  // Marketing Attribution (5 fields)
  // ============================================

  // UTM source: campaign source
  utm_source: z
    .string()
    .max(255, 'UTM source must be at most 255 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // UTM medium: campaign medium
  utm_medium: z
    .string()
    .max(255, 'UTM medium must be at most 255 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // UTM campaign: campaign name
  utm_campaign: z
    .string()
    .max(255, 'UTM campaign must be at most 255 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // UTM content: ad content
  utm_content: z
    .string()
    .max(255, 'UTM content must be at most 255 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // UTM term: search term
  utm_term: z
    .string()
    .max(255, 'UTM term must be at most 255 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),

  // ============================================
  // Engagement Metrics (4 fields)
  // ============================================

  // Duration seconds: time from load to unload/nav
  duration_seconds: z
    .number()
    .int('Duration seconds must be an integer')
    .nonnegative('Duration seconds must be greater than or equal to 0')
    .finite('Duration seconds must be a finite number'),

  // Time on page seconds: calculated engagement time
  time_on_page_seconds: z
    .number()
    .int('Time on page seconds must be an integer')
    .nonnegative('Time on page seconds must be greater than or equal to 0')
    .optional(),

  // Scrolled percentage: 0-100, max scroll depth
  scrolled_percentage: z
    .number()
    .int('Scrolled percentage must be an integer')
    .min(0, 'Scrolled percentage must be at least 0')
    .max(100, 'Scrolled percentage must be at most 100')
    .optional(),

  // Visibility changes: Page Visibility API event count
  visibility_changes: z
    .number()
    .int('Visibility changes must be an integer')
    .nonnegative('Visibility changes must be greater than or equal to 0'),
});

/**
 * Inferred TypeScript type from the schema
 */
export type PageviewPayload = z.infer<typeof PageviewPayloadSchema>;

/**
 * Type for device type values
 */
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
