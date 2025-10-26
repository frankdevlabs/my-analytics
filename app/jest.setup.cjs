// Jest setup file for global test configuration
// This file runs before each test file

// Import testing library matchers
require('@testing-library/jest-dom');

// Set test timeout
jest.setTimeout(30000);

// Polyfill TextEncoder and TextDecoder for @paralleldrive/cuid2 library
// Required for CUID2 generation in tests
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill Web APIs for Next.js server-side testing (only if not already defined)
// These are required for testing Next.js proxy (formerly middleware) and API routes
// Note: Next.js may provide its own implementations, so we only polyfill if undefined

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.map = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    get(name) {
      return this.map.get(name.toLowerCase()) || null;
    }
    set(name, value) {
      this.map.set(name.toLowerCase(), String(value));
    }
    has(name) {
      return this.map.has(name.toLowerCase());
    }
    delete(name) {
      this.map.delete(name.toLowerCase());
    }
    append(name, value) {
      const existing = this.get(name);
      if (existing) {
        this.set(name, `${existing}, ${value}`);
      } else {
        this.set(name, value);
      }
    }
    forEach(callback, thisArg) {
      this.map.forEach((value, key) => {
        callback.call(thisArg, value, key, this);
      });
    }
  };
}

if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      // Store URL internally
      const urlValue = typeof input === 'string' ? input : input.url;

      // Define url as a getter to match spec
      Object.defineProperty(this, 'url', {
        value: urlValue,
        writable: false,
        enumerable: true,
        configurable: false
      });

      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers || {});
      this.body = init.body || null;
      this.redirect = init.redirect || 'follow';
      this.referrer = init.referrer || 'about:client';
    }

    // Add json() method for parsing request body
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }

    // Add text() method for parsing request body
    text() {
      return Promise.resolve(String(this.body));
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this.headers = new Headers(init.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
    }
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    text() {
      return Promise.resolve(String(this.body));
    }
    // Add static json method for NextResponse.json() compatibility
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });
    }
  };
}

if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    append(key, value) {
      if (this.data.has(key)) {
        const existing = this.data.get(key);
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          this.data.set(key, [existing, value]);
        }
      } else {
        this.data.set(key, value);
      }
    }
    get(key) {
      const value = this.data.get(key);
      return Array.isArray(value) ? value[0] : value;
    }
    getAll(key) {
      const value = this.data.get(key);
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    }
    has(key) {
      return this.data.has(key);
    }
    delete(key) {
      this.data.delete(key);
    }
  };
}

// Polyfill setImmediate for Prisma in Jest
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
}

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/my_analytics_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-for-jwt-signing-in-tests';
process.env.AUTH_URL = process.env.AUTH_URL || 'http://localhost:3000';

// Mock browser APIs only in jsdom environment (skip for node environment)
if (typeof window !== 'undefined') {
  // Mock localStorage for theme persistence tests
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  global.localStorage = localStorageMock;

  // Mock matchMedia for system preference detection
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock ResizeObserver for Recharts components
  // Recharts uses ResponsiveContainer which depends on ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// Inject CSS variables for design token tests (only in jsdom)
if (typeof document !== 'undefined') {
  // Light mode colors
  document.documentElement.style.setProperty('--background', '#FEFBF4');
  document.documentElement.style.setProperty('--foreground', '#09192B');
  document.documentElement.style.setProperty('--primary', '#09192B');
  document.documentElement.style.setProperty('--accent', '#D9BF65');
  document.documentElement.style.setProperty('--surface', '#F5F2EB');
  document.documentElement.style.setProperty('--border', 'rgba(9, 25, 43, 0.1)');
  document.documentElement.style.setProperty('--text', '#09192B');
  document.documentElement.style.setProperty('--text-secondary', 'rgba(9, 25, 43, 0.7)');
  document.documentElement.style.setProperty('--button-bg', '#09192B');
  document.documentElement.style.setProperty('--button-text', '#FEFBF4');

  // Typography
  document.documentElement.style.setProperty('--font-heading', 'Ubuntu, sans-serif');
  document.documentElement.style.setProperty('--font-body', 'Raleway, sans-serif');
  document.documentElement.style.setProperty('--font-mono', 'Courier New, monospace');

  // Font sizes
  document.documentElement.style.setProperty('--font-size-xs', '0.75rem');
  document.documentElement.style.setProperty('--font-size-sm', '0.875rem');
  document.documentElement.style.setProperty('--font-size-base', '1rem');
  document.documentElement.style.setProperty('--font-size-lg', '1.125rem');
  document.documentElement.style.setProperty('--font-size-xl', '1.25rem');
  document.documentElement.style.setProperty('--font-size-2xl', '1.5rem');
  document.documentElement.style.setProperty('--font-size-3xl', '1.875rem');
  document.documentElement.style.setProperty('--font-size-4xl', '2.25rem');

  // Line heights
  document.documentElement.style.setProperty('--line-height-tight', '1.25');
  document.documentElement.style.setProperty('--line-height-normal', '1.5');
  document.documentElement.style.setProperty('--line-height-relaxed', '1.75');

  // Border radius
  document.documentElement.style.setProperty('--radius-sm', '2px');
  document.documentElement.style.setProperty('--radius', '4px');
  document.documentElement.style.setProperty('--radius-md', '4px');
  document.documentElement.style.setProperty('--radius-lg', '8px');
  document.documentElement.style.setProperty('--radius-full', '9999px');

  // Shadows
  document.documentElement.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.05)');
  document.documentElement.style.setProperty('--shadow', '0 1px 3px 0 rgba(0, 0, 0, 0.1)');
  document.documentElement.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.1)');
  document.documentElement.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.1)');
}
