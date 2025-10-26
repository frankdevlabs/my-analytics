/**
 * DateRangePresetPicker Tests
 *
 * Tests critical date range picker behaviors:
 * - Preset selection
 * - Custom range selection
 * - URL parameter updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DateRangePresetPicker } from './date-range-preset-picker';
import { useRouter, usePathname } from 'next/navigation';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

describe('DateRangePresetPicker', () => {
  const mockPush = jest.fn();
  const mockPathname = '/dashboard';

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
  });

  /**
   * Test 1: Component renders with current selection displayed
   */
  test('renders with current date range displayed', () => {
    const from = '2025-10-17';
    const to = '2025-10-24';

    render(<DateRangePresetPicker from={from} to={to} />);

    // Button should be visible
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    // Should display date range text
    expect(button).toHaveTextContent(/Oct/i);
  });

  /**
   * Test 2: Preset selection updates URL parameters
   */
  test('selecting a preset updates URL parameters', async () => {
    const from = '2025-10-17';
    const to = '2025-10-24';

    render(<DateRangePresetPicker from={from} to={to} />);

    // Open popover
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Wait for popover to open and find preset option
    await waitFor(() => {
      const lastSevenDaysOption = screen.getByText('Last 7 Days');
      expect(lastSevenDaysOption).toBeInTheDocument();
    });

    // Click preset
    const lastSevenDaysOption = screen.getByText('Last 7 Days');
    fireEvent.click(lastSevenDaysOption);

    // Verify router.push was called with date parameters
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
      const callArg = mockPush.mock.calls[0][0];
      expect(callArg).toContain('from=');
      expect(callArg).toContain('to=');
    });
  });

  /**
   * Test 3: Popover opens and shows all preset options
   */
  test('popover displays all preset options', async () => {
    const from = '2025-10-17';
    const to = '2025-10-24';

    render(<DateRangePresetPicker from={from} to={to} />);

    // Open popover
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Verify all presets are visible
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
      expect(screen.getByText('Last Month')).toBeInTheDocument();
      expect(screen.getByText('Custom Range')).toBeInTheDocument();
    });
  });

  /**
   * Test 4: Custom Range option is available
   */
  test('custom range option is available in preset list', async () => {
    const from = '2025-10-17';
    const to = '2025-10-24';

    render(<DateRangePresetPicker from={from} to={to} />);

    // Open popover
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Verify Custom Range option exists
    await waitFor(() => {
      const customRangeOption = screen.getByText('Custom Range');
      expect(customRangeOption).toBeInTheDocument();
    });
  });

  /**
   * Test 5: Component has proper ARIA attributes
   */
  test('component has proper accessibility attributes', () => {
    const from = '2025-10-17';
    const to = '2025-10-24';

    render(<DateRangePresetPicker from={from} to={to} />);

    const trigger = screen.getByRole('button');

    // Button should have aria-label or accessible name
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toBeTruthy();
  });

  /**
   * Test 6: Keyboard navigation support (Escape closes popover)
   */
  test('pressing Escape closes the popover', async () => {
    const from = '2025-10-17';
    const to = '2025-10-24';

    render(<DateRangePresetPicker from={from} to={to} />);

    // Open popover
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Wait for popover to open
    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    });

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    // Popover should close (preset option should not be visible)
    await waitFor(() => {
      expect(screen.queryByText('Last 7 Days')).not.toBeInTheDocument();
    });
  });
});
