/**
 * Active Visitors UI Integration Tests
 *
 * Tests the integration between the ActiveVisitorBadge component
 * and the actual API endpoints with real-world scenarios:
 * 1. Badge displays correct count after real API calls
 * 2. Badge updates after polling interval with changing data
 * 3. Badge handles network failures gracefully
 * 4. Badge recovers from temporary API failures
 */

import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ActiveVisitorBadge } from '@/components/dashboard/active-visitor-badge';
import { getRedisClient } from 'lib/redis';

// Use real fetch, but control the API response
const originalFetch = global.fetch;

describe('Active Visitors UI Integration', () => {
  let redisClient: Awaited<ReturnType<typeof getRedisClient>>;

  beforeAll(async () => {
    try {
      redisClient = await getRedisClient();
    } catch {
      console.warn('Redis not available - skipping UI integration tests');
    }
  });

  beforeEach(async () => {
    jest.useFakeTimers();

    if (redisClient) {
      try {
        await redisClient.del('active_visitors');
      } catch {
        // Redis not available
      }
    }
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  afterAll(async () => {
    if (redisClient) {
      try {
        await redisClient.del('active_visitors');
      } catch {
        // Redis not available
      }
    }
  });

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
    await redisClient.zAdd('active_visitors', [
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

    // Wait for initial fetch and render
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(screen.getByText('active')).toBeInTheDocument();
  });

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
    await redisClient.zAdd('active_visitors', [
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
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Add more visitors to Redis
    await act(async () => {
      await redisClient.zAdd('active_visitors', [
        { score: currentTimestamp, value: 'visitor_poll_3' },
        { score: currentTimestamp, value: 'visitor_poll_4' },
      ]);
    });

    // Advance time by 10 seconds to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(10000);
      await jest.runOnlyPendingTimersAsync();
    });

    // Should now show 4 visitors
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

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
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    // Setup Redis data
    const currentTimestamp = Math.floor(Date.now() / 1000);
    await redisClient.zAdd('active_visitors', [
      { score: currentTimestamp, value: 'visitor_recovery_1' },
    ]);

    // Fix the network
    fetchShouldFail = false;

    // Advance time to trigger next poll
    await act(async () => {
      jest.advanceTimersByTime(10000);
      await jest.runOnlyPendingTimersAsync();
    });

    // Should now show count
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

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
    await redisClient.del('active_visitors');

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
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    expect(screen.getByText('active')).toBeInTheDocument();
  });

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
    await redisClient.zAdd('active_visitors', [
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
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      const badge = screen.getByLabelText('Active visitors count: 1');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-live', 'polite');
      expect(badge).toHaveAttribute('role', 'status');
    });

    // Add more visitors
    await act(async () => {
      await redisClient.zAdd('active_visitors', [
        { score: currentTimestamp, value: 'visitor_a11y_2' },
        { score: currentTimestamp, value: 'visitor_a11y_3' },
      ]);
    });

    // Trigger polling
    await act(async () => {
      jest.advanceTimersByTime(10000);
      await jest.runOnlyPendingTimersAsync();
    });

    await waitFor(() => {
      const badge = screen.getByLabelText('Active visitors count: 3');
      expect(badge).toBeInTheDocument();
    });
  });
});
