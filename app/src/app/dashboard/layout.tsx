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
 * Checks authentication and wraps authenticated dashboard pages
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

  // Render children for authenticated users
  return <>{children}</>;
}
