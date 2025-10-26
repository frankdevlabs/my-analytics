/**
 * Tests for Dark Mode Detection in Chart Components
 *
 * Focused tests covering:
 * - getSeriesColor() returns different colors for light vs dark mode
 * - Chart components properly detect dark mode state
 * - useChartTheme() hook exposes isDark property correctly
 */

import { renderHook } from '@testing-library/react';
import { useChartTheme } from '../BaseChart';
import { getSeriesColor, chartColors } from '@/config/chart-theme';

// Mock next-themes to control theme state
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

import { useTheme } from 'next-themes';
const mockUseTheme = useTheme as jest.Mock;

describe('Dark Mode Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: getSeriesColor returns correct light mode colors
   * Verifies the function uses light mode series when isDark is false
   */
  it('should return light mode colors when isDark is false', () => {
    const color0 = getSeriesColor(0, false);
    const color1 = getSeriesColor(1, false);

    // Light mode colors should come from chartColors.light.series
    expect(color0).toBe(chartColors.light.series[0]);
    expect(color1).toBe(chartColors.light.series[1]);
  });

  /**
   * Test 2: getSeriesColor returns correct dark mode colors
   * Verifies the function uses dark mode series when isDark is true
   */
  it('should return dark mode colors when isDark is true', () => {
    const color0 = getSeriesColor(0, true);
    const color1 = getSeriesColor(1, true);

    // Dark mode colors should come from chartColors.dark.series
    expect(color0).toBe(chartColors.dark.series[0]);
    expect(color1).toBe(chartColors.dark.series[1]);
  });

  /**
   * Test 3: getSeriesColor returns different palettes for light vs dark
   * Verifies at least some colors differ between light and dark modes
   */
  it('should use different color palettes for light vs dark mode', () => {
    // Check a color index that differs between light and dark
    // Index 1 (second color) should be different
    const lightColor1 = getSeriesColor(1, false);
    const darkColor1 = getSeriesColor(1, true);

    // Verify second color is different between modes
    expect(lightColor1).not.toBe(darkColor1);
    expect(lightColor1).toBe(chartColors.light.series[1]);
    expect(darkColor1).toBe(chartColors.dark.series[1]);
  });

  /**
   * Test 4: useChartTheme hook detects light mode correctly
   * Verifies the hook returns isDark=false when theme is light
   */
  it('should detect light mode when resolvedTheme is light', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
    });

    const { result } = renderHook(() => useChartTheme());

    expect(result.current.isDark).toBe(false);
    // Verify it returns light mode colors
    expect(result.current.colors.primary).toBe(chartColors.light.primary);
  });

  /**
   * Test 5: useChartTheme hook detects dark mode correctly
   * Verifies the hook returns isDark=true when theme is dark
   */
  it('should detect dark mode when resolvedTheme is dark', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      resolvedTheme: 'dark',
    });

    const { result } = renderHook(() => useChartTheme());

    expect(result.current.isDark).toBe(true);
    // Verify it returns dark mode colors
    expect(result.current.colors.primary).toBe(chartColors.dark.primary);
  });
});
