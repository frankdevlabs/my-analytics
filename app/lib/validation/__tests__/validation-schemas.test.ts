/**
 * Tests for validation schemas (Pageview, Append, Event)
 * Focuses on validating 36-field expansion and schema constraints
 */

import { describe, it, expect } from '@jest/globals';
import { PageviewPayloadSchema, AppendPayloadSchema, EventPayloadSchema } from '../index';

describe('Validation Schemas', () => {
  describe('PageviewPayloadSchema', () => {
    it('should accept all 36 valid fields', () => {
      const validPayload = {
        // Identity & Timing (5 fields)
        page_id: 'clh1234567890abcdefghijk',
        added_iso: '2025-10-24T10:30:00.000Z',
        session_id: '550e8400-e29b-41d4-a716-446655440000',

        // Page Context (6 fields)
        hostname: 'example.com',
        path: '/blog/article',
        hash: '#section',
        query_string: '?utm_source=twitter',
        document_title: 'My Blog Post',
        document_referrer: 'https://twitter.com',

        // Visitor Classification (3 fields)
        is_internal_referrer: false,

        // Device & Browser (9 fields)
        device_type: 'desktop' as const,
        browser_name: 'Chrome',
        browser_version: '120.0.0',
        os_name: 'macOS',
        os_version: '14.1',
        viewport_width: 1920,
        viewport_height: 1080,
        screen_width: 2560,
        screen_height: 1440,

        // Locale & Environment (3 fields)
        language: 'en-US',
        timezone: 'America/New_York',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',

        // Marketing Attribution (5 fields)
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: 'launch',
        utm_content: 'button1',
        utm_term: 'analytics',

        // Engagement Metrics (4 fields)
        duration_seconds: 45,
        time_on_page_seconds: 42,
        scrolled_percentage: 75,
        visibility_changes: 2,
      };

      const result = PageviewPayloadSchema.safeParse(validPayload);
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(validPayload);
      }
    });

    it('should validate required vs optional fields correctly', () => {
      // Minimal valid payload with only required fields
      const minimalPayload = {
        path: '/home',
        device_type: 'desktop' as const,
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-24T10:30:00.000Z',
        duration_seconds: 0,
        page_id: 'clh1234567890abcdefghijk',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const result = PageviewPayloadSchema.safeParse(minimalPayload);
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should enforce field constraints (max lengths, formats, ranges)', () => {
      // Test hostname max length (255)
      const longHostname = {
        path: '/test',
        device_type: 'desktop' as const,
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-24T10:30:00.000Z',
        duration_seconds: 0,
        page_id: 'clh1234567890abcdefghijk',
        hostname: 'a'.repeat(256), // Exceeds 255
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const hostnameResult = PageviewPayloadSchema.safeParse(longHostname);
      expect(hostnameResult.success).toBe(false);

      // Test user_agent max length (1000)
      const longUserAgent = {
        path: '/test',
        device_type: 'desktop' as const,
        user_agent: 'a'.repeat(1001), // Exceeds 1000
        added_iso: '2025-10-24T10:30:00.000Z',
        duration_seconds: 0,
        page_id: 'clh1234567890abcdefghijk',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const uaResult = PageviewPayloadSchema.safeParse(longUserAgent);
      expect(uaResult.success).toBe(false);

      // Test scrolled_percentage range (0-100)
      const invalidScroll = {
        path: '/test',
        device_type: 'desktop' as const,
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-24T10:30:00.000Z',
        duration_seconds: 0,
        page_id: 'clh1234567890abcdefghijk',
        scrolled_percentage: 101, // Exceeds 100
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const scrollResult = PageviewPayloadSchema.safeParse(invalidScroll);
      expect(scrollResult.success).toBe(false);
    });

    it('should return clear custom error messages', () => {
      const invalidPayload = {
        path: 'invalid-path', // Missing leading slash
        device_type: 'smartphone', // Invalid device type
        user_agent: '', // Empty string
        added_iso: 'not-a-date',
        duration_seconds: -1, // Negative
        page_id: 'invalid',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      const result = PageviewPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        // Check that error messages are descriptive
        const pathError = result.error.issues.find(i => i.path.includes('path'));
        expect(pathError?.message).toBeDefined();
      }
    });

    it('should produce correct TypeScript types via type inference', () => {
      // This is a compile-time test - if this compiles, type inference works
      const payload: import('../index').PageviewPayload = {
        path: '/test',
        device_type: 'desktop',
        user_agent: 'Mozilla/5.0',
        added_iso: '2025-10-24T10:30:00.000Z',
        duration_seconds: 0,
        page_id: 'clh1234567890abcdefghijk',
        is_internal_referrer: false,
        visibility_changes: 0,
      };

      expect(payload).toBeDefined();
    });
  });

  describe('AppendPayloadSchema', () => {
    it('should validate append payload with all required fields', () => {
      const validPayload = {
        page_id: 'clh1234567890abcdefghijk',
        duration_seconds: 45,
        scrolled_percentage: 75,
      };

      const result = AppendPayloadSchema.safeParse(validPayload);
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should accept optional scrolled_percentage', () => {
      const payloadWithoutScroll = {
        page_id: 'clh1234567890abcdefghijk',
        duration_seconds: 30,
      };

      const result = AppendPayloadSchema.safeParse(payloadWithoutScroll);
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should enforce scrolled_percentage range (0-100)', () => {
      const invalidScroll = {
        page_id: 'clh1234567890abcdefghijk',
        duration_seconds: 45,
        scrolled_percentage: 150,
      };

      const result = AppendPayloadSchema.safeParse(invalidScroll);
      expect(result.success).toBe(false);
    });
  });

  describe('EventPayloadSchema', () => {
    it('should validate event payload with all fields', () => {
      const validPayload = {
        event_name: 'button_click',
        event_metadata: { button_id: 'signup', page_section: 'hero' },
        page_id: 'clh1234567890abcdefghijk',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/signup',
        timestamp: '2025-10-24T10:30:00.000Z',
      };

      const result = EventPayloadSchema.safeParse(validPayload);
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should accept optional event_metadata and page_id', () => {
      const minimalPayload = {
        event_name: 'page_view',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/home',
        timestamp: '2025-10-24T10:30:00.000Z',
      };

      const result = EventPayloadSchema.safeParse(minimalPayload);
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should enforce event_metadata size limit (5KB)', () => {
      // Create metadata > 5KB
      const largeMetadata: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = 'a'.repeat(10);
      }

      const payloadWithLargeMetadata = {
        event_name: 'test_event',
        event_metadata: largeMetadata,
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/test',
        timestamp: '2025-10-24T10:30:00.000Z',
      };

      const result = EventPayloadSchema.safeParse(payloadWithLargeMetadata);
      expect(result.success).toBe(false);
      if (!result.success) {
        const metadataError = result.error.issues.find(i =>
          i.path.includes('event_metadata')
        );
        expect(metadataError?.message).toContain('5KB');
      }
    });

    it('should enforce event_name max length (255)', () => {
      const longNamePayload = {
        event_name: 'a'.repeat(256),
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        path: '/test',
        timestamp: '2025-10-24T10:30:00.000Z',
      };

      const result = EventPayloadSchema.safeParse(longNamePayload);
      expect(result.success).toBe(false);
    });
  });
});
