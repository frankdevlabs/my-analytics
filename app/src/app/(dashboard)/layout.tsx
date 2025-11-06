/**
 * Dashboard Layout with Authentication Gate
 * Server component that enforces authentication at layout level
 * Redirects unauthenticated users to /login
 */

import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Dashboard layout component
 * Checks authentication and MFA verification before allowing access
 * This provides defense-in-depth alongside middleware
 */
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Check authentication session
  const session = await auth();

  // Redirect to login if no valid session
  if (!session) {
    redirect('/login');
  }

  // SECURITY GATE 1: Enforce MFA setup for users who haven't configured it
  // This provides defense-in-depth alongside proxy middleware
  if (!session.user.mfaEnabled) {
    redirect('/mfa/setup');
  }

  // SECURITY GATE 2: Enforce MFA verification for users with MFA enabled
  // If user has MFA enabled but hasn't verified this session, redirect to verification
  if (session.user.mfaEnabled && !session.user.mfaVerified) {
    redirect('/mfa/verify');
  }

  // Render children for authenticated, MFA-configured, and MFA-verified users
  return <>{children}</>;
}
