"use client";

import React, { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * ThemeProvider Component
 *
 * Wraps the application with next-themes provider to enable theme switching.
 * Configured for class-based dark mode with Tailwind CSS.
 *
 * Features:
 * - Class-based dark mode (.dark selector)
 * - Respects system preference by default
 * - Persists theme choice in localStorage
 * - Prevents flash of unstyled content (FOUC)
 * - Enables smooth 300ms transitions
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="my-analytics-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
