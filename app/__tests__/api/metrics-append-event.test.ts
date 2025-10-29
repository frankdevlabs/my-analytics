/**
 * Tests for /api/metrics/append and /api/metrics/event endpoints
 * Task Group 3.1: 2-4 focused tests for append and event endpoints
 */

import { NextRequest } from 'next/server';
import { POST as AppendPOST, OPTIONS as AppendOPTIONS } from '@/app/api/metrics/append/route';
import { POST as EventPOST, OPTIONS as EventOPTIONS } from '@/app/api/metrics/event/route';
import { prisma } from 'lib/db/prisma';

// Mock dependencies
jest.mock('lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('lib/config/cors', () => ({
  getCorsHeaders: jest.fn(() => ({
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Security-Policy': "default-src 'self'",
  })),
}));

jest.mock('lib/geoip/maxmind-reader', () => ({
  lookupCountryCode: jest.fn(async () => 'US'),
}));

describe('/api/metrics/append endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept page_id, duration_seconds, and scrolled_percentage', async () => {
    const payload = {
      page_id: 'clh1234567890abcdefghijk1',
      duration_seconds: 30,
      scrolled_percentage: 75,
    };

    const request = new NextRequest('http://localhost:3000/api/metrics/append', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(payload),
    });

    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const response = await AppendPOST(request);

    expect(response.status).toBe(204);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should include CORS and CSP headers', async () => {
    const payload = {
      page_id: 'clh1234567890abcdefghijk1',
      duration_seconds: 30,
      scrolled_percentage: 75,
    };

    const request = new NextRequest('http://localhost:3000/api/metrics/append', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(payload),
    });

    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const response = await AppendPOST(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
  });

  it('should handle OPTIONS preflight request', async () => {
    const request = new NextRequest('http://localhost:3000/api/metrics/append', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    const response = await AppendOPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
  });
});

describe('/api/metrics/event endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept event_name, event_metadata, page_id, and session_id', async () => {
    const payload = {
      event_name: 'button_click',
      event_metadata: { button_id: 'submit-form' },
      page_id: 'clh1234567890abcdefghijk1',
      session_id: 'session-456',
      path: '/test',
      timestamp: '2025-10-29T12:00:00.000Z',
    };

    const request = new NextRequest('http://localhost:3000/api/metrics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(payload),
    });

    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const response = await EventPOST(request);

    expect(response.status).toBe(204);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should include CORS and CSP headers', async () => {
    const payload = {
      event_name: 'button_click',
      event_metadata: { button_id: 'submit-form' },
      page_id: 'clh1234567890abcdefghijk1',
      session_id: 'session-456',
      path: '/test',
      timestamp: '2025-10-29T12:00:00.000Z',
    };

    const request = new NextRequest('http://localhost:3000/api/metrics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(payload),
    });

    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);

    const response = await EventPOST(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
  });

  it('should handle validation errors consistently', async () => {
    const invalidPayload = {
      event_name: '', // Invalid: empty string
      session_id: 'session-456',
      path: '/test',
      timestamp: '2025-10-29T12:00:00.000Z',
    };

    const request = new NextRequest('http://localhost:3000/api/metrics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(invalidPayload),
    });

    const response = await EventPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  it('should handle OPTIONS preflight request', async () => {
    const request = new NextRequest('http://localhost:3000/api/metrics/event', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    const response = await EventOPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
  });
});
