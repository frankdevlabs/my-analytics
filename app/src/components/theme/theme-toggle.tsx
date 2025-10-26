"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";

/**
 * ThemeToggle Component
 *
 * A minimal, accessible button that cycles through light, dark, and system theme modes.
 * Follows Frank's Blog aesthetic with clean design and smooth transitions.
 *
 * Features:
 * - Cycles through: light → dark → system
 * - Shows current theme with clear labels
 * - Full keyboard accessibility (Tab, Enter)
 * - Prevents hydration mismatch with mounted state
 * - Smooth 300ms color transitions
 * - Hover effect using accent color
 */
export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  // Prevent hydration mismatch by only rendering after mount
  // Use startTransition to avoid cascading render warning
  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    // Render placeholder to prevent layout shift
    return (
      <button
        className="px-4 py-2 text-sm font-medium transition-colors duration-300"
        disabled
        aria-label="Loading theme toggle"
      >
        <span className="opacity-0">Loading...</span>
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  // Determine display label
  const getThemeLabel = () => {
    if (theme === "system") {
      const effectiveTheme = systemTheme === "dark" ? "Dark" : "Light";
      return `Auto (${effectiveTheme})`;
    }
    return theme === "dark" ? "Dark" : "Light";
  };

  const themeLabel = getThemeLabel();

  return (
    <button
      onClick={cycleTheme}
      className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-[var(--radius)]
                 bg-[var(--surface)] text-[var(--foreground)]
                 hover:border-[var(--accent)] hover:text-[var(--accent)]
                 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
                 transition-colors duration-300"
      aria-label={`Current theme: ${themeLabel}. Click to change theme.`}
    >
      {themeLabel}
    </button>
  );
}
