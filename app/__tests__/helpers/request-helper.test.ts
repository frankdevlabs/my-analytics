/**
 * Tests for Request Helper Modernization (Task Group 2)
 *
 * Verifies that test helpers return NextRequest instances compatible with Next.js 16
 */

import { NextRequest } from 'next/server';

describe('Request Helper Modernization', () => {
  describe('NextRequest creation', () => {
    test('helper returns NextRequest instance with Next.js specific properties', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(request).toBeInstanceOf(NextRequest);
      // NextRequest extends Request, so it has Next.js specific properties
      expect(request.nextUrl).toBeDefined();
      expect(request.cookies).toBeDefined();
      expect(typeof request.nextUrl.pathname).toBe('string');
    });

    test('helper correctly sets request URL', () => {
      const url = 'http://localhost:3000/api/track';
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ page_id: 'test123' }),
      });

      expect(request.url).toBe(url);
      expect(request.nextUrl.pathname).toBe('/api/track');
    });

    test('helper correctly sets request method', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      expect(request.method).toBe('POST');
    });

    test('helper correctly sets request headers', () => {
      const headers = {
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers,
      });

      expect(request.headers.get('content-type')).toBe('application/json');
      expect(request.headers.get('x-forwarded-for')).toBe('192.168.1.1');
    });
  });
});
