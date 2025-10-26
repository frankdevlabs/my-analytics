/**
 * Session Provider
 * Client component wrapper for NextAuth SessionProvider
 */

'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Wraps the application with NextAuth.js SessionProvider
 * Must be a client component to use React Context
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
