/**
 * Enhanced Tracker Script Tests
 *
 * Focused tests for Task Group 3: CUID2 page_id format
 * Tests the CUID2 generation and core functionality
 * Updated for CUID2 page_id format
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Enhanced Tracker Script - CUID2 Implementation', () => {
  let trackerCode: string;

  beforeEach(() => {
    // Load tracker code
    trackerCode = fs.readFileSync(
      path.join(__dirname, '../../../public/tracker.js'),
      'utf8'
    );
  });

  test('tracker code contains generateCuid function', () => {
    expect(trackerCode).toContain('var generateCuid = function()');
    expect(trackerCode).toContain("return 'c' + t + r;");
  });

  test('tracker code uses generateCuid() for page_id', () => {
    expect(trackerCode).toContain('var currentPageId = generateCuid();');
  });

  test('tracker code still uses generateUUID() for session_id', () => {
    expect(trackerCode).toContain('var generateUUID = function()');
    expect(trackerCode).toContain('sessionId = generateUUID();');
  });

  test('CUID2 generator produces valid format', () => {
    // Extract and test the generateCuid function directly
    const generateCuidCode = `
      var generateCuid = function() {
        var t = Date.now().toString(36);
        var r = '';
        var c = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var l = 24 - t.length;
        try {
          var b = new Uint8Array(l);
          crypto.getRandomValues(b);
          for (var i = 0; i < l; i++) r += c[b[i] % 36];
        } catch (e) {
          for (var i = 0; i < l; i++) r += c[Math.floor(Math.random() * 36)];
        }
        return 'c' + t + r;
      };
      return generateCuid();
    `;

    const mockCrypto = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    };

    const generateCuid = new Function('crypto', 'Uint8Array', 'Date', 'Math', generateCuidCode);
    const cuid = generateCuid(mockCrypto, global.Uint8Array, global.Date, global.Math);

    // Verify CUID2 format: c[a-z0-9]{24} (25 chars total)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    expect(cuid).toMatch(cuidRegex);
    expect(cuid.length).toBe(25);
    expect(cuid[0]).toBe('c');
  });

  test('UUID generator returns valid UUIDs', () => {
    // Extract and test the generateUUID function directly
    const generateUUIDCode = `
      var generateUUID = function() {
        try {
          return crypto.randomUUID();
        } catch (e) {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
      };
      return generateUUID();
    `;

    const mockCrypto = {
      randomUUID: () => '550e8400-e29b-41d4-a716-446655440000'
    };

    const generateUUID = new Function('crypto', 'Math', generateUUIDCode);
    const uuid = generateUUID(mockCrypto, global.Math);

    // Verify UUID format - allows any version, not just v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
    expect(uuid.length).toBe(36);
  });

  test('tracker uses CUID2 for SPA navigation', () => {
    expect(trackerCode).toContain('currentPageId = generateCuid();');
  });

  test('tracker has updated header comment', () => {
    expect(trackerCode).toContain('Uses CUID2 format for page_id generation');
  });

  test('generateCuid fallback to Math.random works', () => {
    // Test fallback when crypto.getRandomValues fails
    const generateCuidFallbackCode = `
      var generateCuid = function() {
        var t = Date.now().toString(36);
        var r = '';
        var c = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var l = 24 - t.length;
        try {
          var b = new Uint8Array(l);
          crypto.getRandomValues(b);
          for (var i = 0; i < l; i++) r += c[b[i] % 36];
        } catch (e) {
          for (var i = 0; i < l; i++) r += c[Math.floor(Math.random() * 36)];
        }
        return 'c' + t + r;
      };
      return generateCuid();
    `;

    const mockCryptoError = {
      getRandomValues: () => { throw new Error('Not available'); }
    };

    const generateCuid = new Function('crypto', 'Uint8Array', 'Date', 'Math', generateCuidFallbackCode);
    const cuid = generateCuid(mockCryptoError, global.Uint8Array, global.Date, global.Math);

    // Verify CUID2 format still works with fallback
    const cuidRegex = /^c[a-z0-9]{24}$/;
    expect(cuid).toMatch(cuidRegex);
    expect(cuid.length).toBe(25);
    expect(cuid[0]).toBe('c');
  });

  test('generateUUID fallback to custom implementation works', () => {
    // Test fallback when crypto.randomUUID is not available
    const generateUUIDFallbackCode = `
      var generateUUID = function() {
        try {
          return crypto.randomUUID();
        } catch (e) {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
      };
      return generateUUID();
    `;

    const mockCryptoError = {
      randomUUID: () => { throw new Error('Not available'); }
    };

    const generateUUID = new Function('crypto', 'Math', generateUUIDFallbackCode);
    const uuid = generateUUID(mockCryptoError, global.Math);

    // Verify UUID v4 format from fallback
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidV4Regex);
    expect(uuid.length).toBe(36);
  });
});
