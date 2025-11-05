/**
 * MFA Verify Page
 * Verification page for two-factor authentication during login
 */

import { redirect } from 'next/navigation';
import { auth } from 'lib/auth/config';
import { MFAVerifyForm } from '@/components/auth/mfa-verify-form';

/**
 * MFA Verify Page
 * Requires partial authentication (password verified, MFA pending)
 */
export default async function MFAVerifyPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  // If MFA is not enabled, redirect to dashboard
  if (!session.user.mfaEnabled) {
    redirect(searchParams.callbackUrl || '/');
  }

  // If already verified, redirect to callback
  if (session.user.mfaVerified) {
    redirect(searchParams.callbackUrl || '/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <MFAVerifyForm callbackUrl={searchParams.callbackUrl} />
    </div>
  );
}
