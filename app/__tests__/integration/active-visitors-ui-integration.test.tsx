/**
 * Active Visitors UI Integration Tests
 *
 * Tests the integration between the ActiveVisitorBadge component
 * and the actual API endpoints with real-world scenarios:
 * 1. Badge displays correct count after real API calls
 * 2. Badge updates after polling interval with changing data
 * 3. Badge handles network failures gracefully
 * 4. Badge recovers from temporary API failures
 *
 * Note: Uses real timers to test actual polling behavior.
 */

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { ActiveVisitorBadge } from '@/components/dashboard/active-visitor-badge';
import { getRedisClient, getRedisKey } from 'lib/redis';

// Use real fetch, but control the API response
const originalFetch = global.fetch;

describe('Active Visitors UI Integration', () => {
  let redisClient: Awaited<ReturnType<typeof getRedisClient>>;

  beforeAll(async () => {
    // Generate unique Redis prefix for this test file to prevent key collisions between test files
    process.env.TEST_REDIS_PREFIX = `test-ui-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      );

      redisClient = await Promise.race([
        getRedisClient(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof getRedisClient>>;
    } catch (error) {
      console.warn('Redis not available - tests will be skipped:', error instanceof Error ? error.message : 'Unknown error');
      redisClient = null as any;
    }
  }, 10000); // Increase beforeAll timeout to 10s

  beforeEach(async () => {
    if (redisClient) {
      try {
        // Clean up only this test file's Redis key
        await redisClient.del(getRedisKey('active_visitors'));
        // Small wait to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Redis cleanup failed - not critical
      }
    }
  });

  afterEach(async () => {
    // Cleanup component and stop all intervals
    cleanup();

    // Restore original fetch
    global.fetch = originalFetch;

    // Extra cleanup: ensure Redis is clean for next test
    if (redisClient) {
      try {
        await redisClient.del(getRedisKey('active_visitors'));
      } catch {
        // Cleanup failed - not critical
      }
    }
  });

  afterAll(async () => {
    if (redisClient) {
      try {
        // Add timeout to prevent hanging during cleanup
        const cleanupPromise = redisClient.del(getRedisKey('active_visitors'));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cleanup timeout')), 3000)
        );
        await Promise.race([cleanupPromise, timeoutPromise]);
      } catch {
        // Redis cleanup failed or timed out - not critical
      }
    }

    // Clean up environment variable after all tests in this file complete
    delete process.env.TEST_REDIS_PREFIX;
  }, 5000); // Add timeout to afterAll hook

  /**
   * UI Integration Test 1: Badge displays correct count after real API call
   * Verifies: Component → API → Redis → Response → Display
   */
  test('badge displays correct count from real API data', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    // Setup Redis with active visitors
    const currentTimestamp = Math.floor(Date.now() / 1000);
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_ui_1' },
      { score: currentTimestamp - 60, value: 'visitor_ui_2' },
      { score: currentTimestamp - 120, value: 'visitor_ui_3' },
    ]);

    // Mock fetch to call actual API endpoint
    const mockFetch = jest.fn((url: string) => {
      if (url.includes('/api/active-visitors')) {
        // Import and call the actual route handler
        return import('../../src/app/api/active-visitors/route').then(module => {
          return module.GET();
        });
      }
      return originalFetch(url);
    });

    global.fetch = mockFetch as typeof fetch;

    render(<ActiveVisitorBadge />);

    // Wait for initial fetch and render (component calls fetch immediately on mount)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('active')).toBeInTheDocument();
  }, 10000);

  /**
   * UI Integration Test 2: Badge updates when count changes
   * Verifies: Polling detects changes in Redis → Updates display
   */
  test('badge updates count after polling interval when data changes', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Start with 2 visitors
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_poll_1' },
      { score: currentTimestamp - 60, value: 'visitor_poll_2' },
    ]);

    const mockFetch = jest.fn((url: string) => {
      if (url.includes('/api/active-visitors')) {
        return import('../../src/app/api/active-visitors/route').then(module => {
          return module.GET();
        });
      }
      return originalFetch(url);
    });

    global.fetch = mockFetch as typeof fetch;

    render(<ActiveVisitorBadge />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Add more visitors to Redis
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_poll_3' },
      { score: currentTimestamp, value: 'visitor_poll_4' },
    ]);

    // Wait for polling interval (10 seconds) + buffer
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    }, { timeout: 12000 }); // 10s polling + 2s buffer
  }, 20000);

  /**
   * UI Integration Test 3: Badge shows dash when backend unavailable
   * Verifies: API error → Badge displays "—" → Recovers when API returns
   */
  test('badge shows "—" when backend unavailable, then recovers', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    let fetchShouldFail = true;

    const mockFetch = jest.fn((url: string) => {
      if (url.includes('/api/active-visitors')) {
        if (fetchShouldFail) {
          return Promise.reject(new Error('Network error'));
        }
        return import('../../src/app/api/active-visitors/route').then(module => {
          return module.GET();
        });
      }
      return originalFetch(url);
    });

    global.fetch = mockFetch as typeof fetch;

    render(<ActiveVisitorBadge />);

    // Wait for initial fetch (should fail)
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Setup Redis data
    const currentTimestamp = Math.floor(Date.now() / 1000);
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_recovery_1' },
    ]);

    // Fix the network
    fetchShouldFail = false;

    // Wait for next polling interval (10 seconds) + buffer
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    }, { timeout: 12000 }); // 10s polling + 2s buffer
  }, 20000);

  /**
   * UI Integration Test 4: Badge handles zero active visitors correctly
   * Verifies: Empty Redis → API returns 0 → Badge displays "0"
   */
  test('badge displays "0" when no active visitors', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    // Ensure Redis is empty
    await redisClient.del(getRedisKey('active_visitors'));

    const mockFetch = jest.fn((url: string) => {
      if (url.includes('/api/active-visitors')) {
        return import('../../src/app/api/active-visitors/route').then(module => {
          return module.GET();
        });
      }
      return originalFetch(url);
    });

    global.fetch = mockFetch as typeof fetch;

    render(<ActiveVisitorBadge />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('active')).toBeInTheDocument();
  }, 10000);

  /**
   * UI Integration Test 5: Badge maintains ARIA live region announcements
   * Verifies: Count changes → ARIA live region updates for screen readers
   */
  test('badge maintains accessible live region when count updates', async () => {
    if (!redisClient) {
      console.log('Skipping test - Redis not available');
      return;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_a11y_1' },
    ]);

    const mockFetch = jest.fn((url: string) => {
      if (url.includes('/api/active-visitors')) {
        return import('../../src/app/api/active-visitors/route').then(module => {
          return module.GET();
        });
      }
      return originalFetch(url);
    });

    global.fetch = mockFetch as typeof fetch;

    render(<ActiveVisitorBadge />);

    // Wait for initial fetch
    await waitFor(() => {
      const badge = screen.getByLabelText('Active visitors count: 1');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-live', 'polite');
      expect(badge).toHaveAttribute('role', 'status');
    }, { timeout: 5000 });

    // Add more visitors
    await redisClient.zAdd(getRedisKey('active_visitors'), [
      { score: currentTimestamp, value: 'visitor_a11y_2' },
      { score: currentTimestamp, value: 'visitor_a11y_3' },
    ]);

    // Wait for polling interval (10 seconds) + buffer
    await waitFor(() => {
      const badge = screen.getByLabelText('Active visitors count: 3');
      expect(badge).toBeInTheDocument();
    }, { timeout: 12000 }); // 10s polling + 2s buffer
  }, 20000);
});
