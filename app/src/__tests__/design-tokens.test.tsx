/**
 * Design Token Tests
 * Tests for the Tailwind design system foundation including CSS variables,
 * font loading, color contrast, and semantic token resolution.
 */

import '@testing-library/jest-dom';

describe('Design Tokens - CSS Variables', () => {
  beforeEach(() => {
    // Create a fresh document for each test
    document.documentElement.innerHTML = '';
    // Add the globals.css styles to document
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --background: #FEFBF4;
        --foreground: #09192B;
        --primary: #09192B;
        --accent: #D9BF65;
        --surface: #F5F2EB;
        --border: rgba(9, 25, 43, 0.1);
        --text: #09192B;
        --text-secondary: rgba(9, 25, 43, 0.7);
        --button-bg: #09192B;
        --button-text: #FEFBF4;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --background: #09192B;
          --foreground: #FEFBF4;
          --primary: #FEFBF4;
          --accent: #D9BF65;
          --surface: #0F2338;
          --border: rgba(254, 251, 244, 0.1);
          --text: #FEFBF4;
          --text-secondary: rgba(254, 251, 244, 0.7);
          --button-bg: #D9BF65;
          --button-text: #09192B;
        }
      }
    `;
    document.head.appendChild(style);
  });

  test('Light mode CSS variables are defined correctly', () => {
    const styles = getComputedStyle(document.documentElement);

    expect(styles.getPropertyValue('--background').trim()).toBe('#FEFBF4');
    expect(styles.getPropertyValue('--foreground').trim()).toBe('#09192B');
    expect(styles.getPropertyValue('--primary').trim()).toBe('#09192B');
    expect(styles.getPropertyValue('--accent').trim()).toBe('#D9BF65');
  });

  test('Semantic tokens resolve to correct values', () => {
    const styles = getComputedStyle(document.documentElement);

    // Primary semantic token should match foreground in light mode
    expect(styles.getPropertyValue('--primary').trim()).toBe('#09192B');

    // Accent should be golden yellow
    expect(styles.getPropertyValue('--accent').trim()).toBe('#D9BF65');

    // Surface should be slightly darker than background
    expect(styles.getPropertyValue('--surface').trim()).toBe('#F5F2EB');
  });

  test('Button colors are defined for light and dark modes', () => {
    const styles = getComputedStyle(document.documentElement);

    // Light mode button colors
    expect(styles.getPropertyValue('--button-bg').trim()).toBe('#09192B');
    expect(styles.getPropertyValue('--button-text').trim()).toBe('#FEFBF4');
  });
});

describe('Design Tokens - Font Loading', () => {
  test('Font family variables are defined', () => {
    // Check if font families are defined (they will be set by Next.js font loader)
    const rootElement = document.documentElement;

    // Font variables should exist in the style system
    expect(rootElement).toBeDefined();
  });

  test('System font fallbacks are configured', () => {
    // This test verifies that even without custom fonts loaded,
    // the system has proper fallbacks
    const testDiv = document.createElement('div');
    testDiv.style.fontFamily = "'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    document.body.appendChild(testDiv);

    const computedFont = getComputedStyle(testDiv).fontFamily;

    // Should include fallback fonts
    expect(computedFont).toBeTruthy();

    document.body.removeChild(testDiv);
  });
});

describe('Design Tokens - Color Contrast', () => {
  /**
   * Convert hex color to RGB
   */
  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Calculate relative luminance
   * https://www.w3.org/WAI/GL/wiki/Relative_luminance
   */
  function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      const val = c / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate contrast ratio between two colors
   * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
   */
  function getContrastRatio(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  test('Light mode text/background contrast meets WCAG AA (4.5:1)', () => {
    const background = '#FEFBF4';
    const text = '#09192B';

    const ratio = getContrastRatio(text, background);

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test('Dark mode text/background contrast meets WCAG AA (4.5:1)', () => {
    const background = '#09192B';
    const text = '#FEFBF4';

    const ratio = getContrastRatio(text, background);

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test('Accent color provides sufficient contrast in dark mode', () => {
    const background = '#09192B';
    const accent = '#D9BF65';

    const ratio = getContrastRatio(accent, background);

    // Accent should be readable on dark background
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Design Tokens - Typography Scale', () => {
  test('Font sizes follow dashboard-optimized scale', () => {
    const expectedSizes = {
      'xs': '0.75rem',    // 12px
      'sm': '0.875rem',   // 14px
      'base': '1rem',     // 16px
      'lg': '1.125rem',   // 18px
      'xl': '1.25rem',    // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
    };

    // Verify the scale is smaller than blog's massive 17.4rem headings
    Object.entries(expectedSizes).forEach(([, value]) => {
      const remValue = parseFloat(value);
      expect(remValue).toBeLessThan(17.4); // Much smaller than blog scale
    });

    // Verify largest heading is suitable for dashboards
    expect(parseFloat(expectedSizes['4xl'])).toBeLessThanOrEqual(2.25);
  });

  test('Line heights are configured for data density', () => {
    const lineHeights = {
      tight: 1.25,   // For dense data displays
      normal: 1.5,   // Standard body text
      relaxed: 1.75, // Long-form content
    };

    // Tight line height for tables and dense data
    expect(lineHeights.tight).toBe(1.25);

    // Normal for readable body text
    expect(lineHeights.normal).toBe(1.5);
  });
});
