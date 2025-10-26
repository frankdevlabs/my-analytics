/**
 * Focused tests for CUID2 format validation in schemas
 * Tests the updated CUID_REGEX pattern across all three schemas
 */

import { describe, it, expect } from '@jest/globals';
import { PageviewPayloadSchema, AppendPayloadSchema, EventPayloadSchema } from '../index';

describe('CUID2 Format Validation', () => {
  // Valid CUID2: exactly 25 characters, starts with 'c', followed by 24 lowercase alphanumeric
  const VALID_CUID = 'clh1234567890abcdefghijk1';

  describe('PageviewPayloadSchema - page_id validation', () => {
    const createMinimalPageview = (page_id: string) => ({
      page_id,
      path: '/test',
      device_type: 'desktop' as const,
      user_agent: 'Mozilla/5.0',
      added_iso: '2025-10-24T10:30:00.000Z',
      duration_seconds: 0,
      is_internal_referrer: false,
      visibility_changes: 0,
    });

    it('should accept valid CUID2 format (25 chars, starts with c)', () => {
      const payload = createMinimalPageview(VALID_CUID);
      const result = PageviewPayloadSchema.safeParse(payload);

      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should reject CUID with 24 characters (too short)', () => {
      const tooShortCuid = 'clh1234567890abcdefghij'; // 24 chars total
      const payload = createMinimalPageview(tooShortCuid);
      const result = PageviewPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        const pageIdError = result.error.issues.find(i => i.path.includes('page_id'));
        expect(pageIdError?.message).toContain('CUID format');
      }
    });

    it('should reject CUID with 26 characters (too long)', () => {
      const tooLongCuid = 'clh1234567890abcdefghijk12'; // 26 chars total
      const payload = createMinimalPageview(tooLongCuid);
      const result = PageviewPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        const pageIdError = result.error.issues.find(i => i.path.includes('page_id'));
        expect(pageIdError?.message).toContain('CUID format');
      }
    });

    it('should reject CUID with wrong prefix', () => {
      const wrongPrefix = 'xlh1234567890abcdefghijk1'; // Starts with 'x' not 'c'
      const payload = createMinimalPageview(wrongPrefix);
      const result = PageviewPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
    });

    it('should reject old UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const payload = createMinimalPageview(uuid);
      const result = PageviewPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        const pageIdError = result.error.issues.find(i => i.path.includes('page_id'));
        expect(pageIdError?.message).toContain('CUID format');
      }
    });
  });

  describe('AppendPayloadSchema - page_id validation', () => {
    const createMinimalAppend = (page_id: string) => ({
      page_id,
      duration_seconds: 30,
    });

    it('should accept valid CUID2 format', () => {
      const payload = createMinimalAppend(VALID_CUID);
      const result = AppendPayloadSchema.safeParse(payload);

      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should reject old UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const payload = createMinimalAppend(uuid);
      const result = AppendPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
    });
  });

  describe('EventPayloadSchema - page_id validation', () => {
    const createMinimalEvent = (page_id?: string) => ({
      event_name: 'test_event',
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      path: '/test',
      timestamp: '2025-10-24T10:30:00.000Z',
      ...(page_id && { page_id }),
    });

    it('should accept valid CUID2 format for page_id', () => {
      const payload = createMinimalEvent(VALID_CUID);
      const result = EventPayloadSchema.safeParse(payload);

      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should accept missing page_id (optional field)', () => {
      const payload = createMinimalEvent();
      const result = EventPayloadSchema.safeParse(payload);

      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should reject old UUID format for page_id', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const payload = createMinimalEvent(uuid);
      const result = EventPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
    });
  });
});
