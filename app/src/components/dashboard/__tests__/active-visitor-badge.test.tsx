/**
 * ActiveVisitorBadge Component Tests
 * Focused tests covering critical rendering states and polling behavior
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ActiveVisitorBadge } from '../active-visitor-badge';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock timers for interval testing
jest.useFakeTimers();

describe('ActiveVisitorBadge', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('displays loading state initially with "..."', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ActiveVisitorBadge />);

    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays count correctly from API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 5 }),
    } as Response);

    render(<ActiveVisitorBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays "—" on API error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ActiveVisitorBadge />);

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('displays "—" when count is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: null }),
    } as Response);

    render(<ActiveVisitorBadge />);

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('triggers fetch every 10 seconds via polling interval', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ count: 3 }),
    } as Response);

    render(<ActiveVisitorBadge />);

    // Initial fetch on mount
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Advance time by 10 seconds
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Advance time by another 10 seconds
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it('cleans up interval on unmount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ count: 2 }),
    } as Response);

    const { unmount } = render(<ActiveVisitorBadge />);

    // Initial fetch on mount
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Unmount the component
    unmount();

    // Advance time by 10 seconds after unmount
    jest.advanceTimersByTime(10000);

    // Should not trigger additional fetch after unmount
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('includes proper ARIA label with count value', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 7 }),
    } as Response);

    render(<ActiveVisitorBadge />);

    await waitFor(() => {
      const badge = screen.getByLabelText('Active visitors count: 7');
      expect(badge).toBeInTheDocument();
    });
  });

  it('includes proper ARIA label when showing dash on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ActiveVisitorBadge />);

    await waitFor(() => {
      const badge = screen.getByLabelText(/Active visitors count:/);
      expect(badge).toBeInTheDocument();
    });
  });
});
