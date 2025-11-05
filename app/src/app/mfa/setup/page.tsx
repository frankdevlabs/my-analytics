/**
 * MFA Setup Page
 * First-time setup page for two-factor authentication
 */

import { redirect } from 'next/navigation';
import { auth } from 'lib/auth/config';
import { getUserByEmail } from 'lib/db/users';
import { MFASetupForm } from '@/components/auth/mfa-setup-form';

/**
 * MFA Setup Page
 * Requires authentication
 * Redirects to dashboard if MFA is already enabled
 */
export default async function MFASetupPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  // Check if MFA is already enabled
  const user = await getUserByEmail(session.user.email);

  if (user?.mfaEnabled) {
    // Already set up, redirect to dashboard
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <MFASetupForm />
    </div>
  );
}
