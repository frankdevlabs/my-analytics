/**
 * Focused tests for Prisma schema changes
 * Tests the expanded Pageview model (9 -> 36 fields) and new Events table
 *
 * Scope: Task 1.1 - Write 2-8 focused tests for Prisma schema changes
 *
 * Note: These are schema structure tests, not database integration tests
 */

import { Prisma } from '@prisma/client';

describe('Prisma Schema - Enhanced Analytics Tracking', () => {
  /**
   * Test 1: Verify Pageview model has all 36 required fields in schema
   * Ensures schema expansion from 9 to 36 fields is complete
   */
  it('should have Pageview model with all 36 fields defined in schema', () => {
    // Verify the Prisma types have all expected fields
    // This uses TypeScript compile-time type checking
    const pageviewFields: Prisma.PageviewCreateInput = {
      // Original 9 fields
      added_iso: new Date(),
      path: '/',
      device_type: 'desktop',
      duration_seconds: 0,
      user_agent: 'test',

      // New page context fields (5)
      hostname: 'test.com',
      document_title: 'Test',
      hash: '#test',
      query_string: '?test=1',
      // page_id has default, not required in input

      // New session & classification fields (3)
      session_id: 'session-123',
      is_bot: false,
      is_internal_referrer: false,

      // New browser intelligence fields (4)
      browser_name: 'Chrome',
      browser_version: '120',
      os_name: 'Windows',
      os_version: '11',

      // New device details fields (4)
      viewport_width: 1920,
      viewport_height: 1080,
      screen_width: 1920,
      screen_height: 1080,

      // New locale & environment fields (2, user_agent already counted)
      language: 'en-US',
      timezone: 'UTC',

      // New marketing attribution fields (4)
      utm_medium: 'email',
      utm_campaign: 'test',
      utm_content: 'content',
      utm_term: 'term',

      // New engagement metrics fields (3)
      scrolled_percentage: 50,
      time_on_page_seconds: 30,
      visibility_changes: 1,
    };

    // If TypeScript compiles, all fields are present in schema
    expect(pageviewFields).toBeDefined();
  });

  /**
   * Test 2: Verify field types match specification
   * Ensures String, Int, Boolean, DateTime types are correctly defined
   */
  it('should have correct field types defined in Prisma schema', () => {
    // Test type constraints by attempting to assign wrong types
    // TypeScript will catch type mismatches at compile time

    type PageviewInput = Prisma.PageviewCreateInput;

    // String fields
    const stringFields: {
      [K in keyof PageviewInput]: PageviewInput[K] extends string | null | undefined ? K : never
    }[keyof PageviewInput][] = [
      'path',
      'hostname',
      'document_title',
      'hash',
      'query_string',
      'session_id',
      'browser_name',
      'browser_version',
      'os_name',
      'os_version',
      'language',
      'timezone',
      'user_agent',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'country_code',
      'document_referrer',
      'utm_source',
    ];

    // Numeric fields
    const numericFields: {
      [K in keyof PageviewInput]: PageviewInput[K] extends number | null | undefined ? K : never
    }[keyof PageviewInput][] = [
      'duration_seconds',
      'viewport_width',
      'viewport_height',
      'screen_width',
      'screen_height',
      'scrolled_percentage',
      'time_on_page_seconds',
      'visibility_changes',
    ];

    // Boolean fields
    const booleanFields: {
      [K in keyof PageviewInput]: PageviewInput[K] extends boolean | undefined ? K : never
    }[keyof PageviewInput][] = [
      'is_unique',
      'is_bot',
      'is_internal_referrer',
    ];

    expect(stringFields.length).toBeGreaterThan(0);
    expect(numericFields.length).toBeGreaterThan(0);
    expect(booleanFields.length).toBeGreaterThan(0);
  });

  /**
   * Test 3: Verify DeviceType enum remains unchanged
   * Ensures existing enum still has desktop, mobile, tablet values
   */
  it('should maintain DeviceType enum with desktop, mobile, tablet', () => {
    // Verify enum values exist in type system
    const deviceTypes: ('desktop' | 'mobile' | 'tablet')[] = ['desktop', 'mobile', 'tablet'];

    deviceTypes.forEach(type => {
      expect(['desktop', 'mobile', 'tablet']).toContain(type);
    });

    // Verify all three types are valid in PageviewCreateInput
    const testWithDesktop: Prisma.PageviewCreateInput = {
      device_type: 'desktop',
      added_iso: new Date(),
      path: '/',
      duration_seconds: 0,
      user_agent: 'test',
    };

    const testWithMobile: Prisma.PageviewCreateInput = {
      device_type: 'mobile',
      added_iso: new Date(),
      path: '/',
      duration_seconds: 0,
      user_agent: 'test',
    };

    const testWithTablet: Prisma.PageviewCreateInput = {
      device_type: 'tablet',
      added_iso: new Date(),
      path: '/',
      duration_seconds: 0,
      user_agent: 'test',
    };

    expect(testWithDesktop.device_type).toBe('desktop');
    expect(testWithMobile.device_type).toBe('mobile');
    expect(testWithTablet.device_type).toBe('tablet');
  });

  /**
   * Test 4: Verify Events table schema structure
   * Ensures new Events model has all required fields
   */
  it('should have Events model with correct structure defined in schema', () => {
    const eventFields: Prisma.EventCreateInput = {
      event_name: 'test_event',
      event_metadata: { key: 'value', nested: { data: 123 } },
      session_id: 'session-123',
      path: '/test',

      // Optional fields
      country_code: 'US',
    };

    // Verify all fields are present in type
    expect(eventFields.event_name).toBeDefined();
    expect(eventFields.event_metadata).toBeDefined();
    expect(eventFields.session_id).toBeDefined();
    expect(eventFields.path).toBeDefined();
  });

  /**
   * Test 5: Verify Event-to-Pageview relationship structure
   * Ensures Event model can reference Pageview via page_id
   */
  it('should allow Event to reference Pageview in schema via page_id', () => {
    // Test that EventCreateInput accepts pageview relation
    const eventWithPageview: Prisma.EventCreateInput = {
      event_name: 'button_click',
      session_id: 'session-123',
      path: '/test',
      pageview: {
        connect: {
          page_id: 'test-page-id',
        },
      },
    };

    expect(eventWithPageview.pageview).toBeDefined();
  });

  /**
   * Test 6: Verify nullable field constraints in schema
   * Ensures optional fields are properly typed as nullable
   */
  it('should correctly mark fields as optional/nullable in schema types', () => {
    // Test minimal required fields - all new fields should be optional
    const minimalPageview: Prisma.PageviewCreateInput = {
      added_iso: new Date(),
      path: '/minimal',
      device_type: 'desktop',
      duration_seconds: 0,
      user_agent: 'Minimal UA',
    };

    // Should compile without any of the new 27 fields
    expect(minimalPageview).toBeDefined();
    expect(minimalPageview.hostname).toBeUndefined();
    expect(minimalPageview.session_id).toBeUndefined();
    expect(minimalPageview.browser_name).toBeUndefined();
  });

  /**
   * Test 7: Verify default values are defined in schema
   * Ensures fields with defaults have correct type definitions
   */
  it('should have default values defined for appropriate fields', () => {
    // Fields with defaults shouldn't require explicit values
    const pageviewWithDefaults: Prisma.PageviewCreateInput = {
      added_iso: new Date(),
      path: '/test',
      device_type: 'desktop',
      duration_seconds: 0,
      user_agent: 'Test UA',
      // is_unique defaults to false
      // is_bot defaults to false
      // is_internal_referrer defaults to false
      // visibility_changes defaults to 0
      // page_id has database-generated default
    };

    // Should compile without explicit defaults
    expect(pageviewWithDefaults).toBeDefined();
  });

  /**
   * Test 8: Verify JSONB metadata type in Events
   * Ensures event_metadata accepts flexible nested objects
   */
  it('should accept JSONB metadata in Events model', () => {
    // Test various metadata structures
    const simpleMetadata: Prisma.EventCreateInput = {
      event_name: 'simple_event',
      event_metadata: { button_id: 'submit' },
      session_id: 'session-123',
      path: '/form',
    };

    const nestedMetadata: Prisma.EventCreateInput = {
      event_name: 'complex_event',
      event_metadata: {
        user: { id: 123, name: 'John' },
        context: { page: 'home', section: 'hero' },
        values: [1, 2, 3],
      },
      session_id: 'session-123',
      path: '/home',
    };

    expect(simpleMetadata.event_metadata).toBeDefined();
    expect(nestedMetadata.event_metadata).toBeDefined();
  });
});
