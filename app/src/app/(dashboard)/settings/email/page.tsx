/**
 * Email Settings Page
 * Allows users to configure email reports and alerts
 */

import { redirect } from 'next/navigation';
import { auth } from 'lib/auth/config';
import { EmailSettingsClient } from './EmailSettingsClient';

/**
 * Email Settings Page (Server Component)
 * Requires authentication
 */
export default async function EmailSettingsPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-text-secondary mt-2">
          Configure email reports and alerts for your analytics data
        </p>
      </div>

      <EmailSettingsClient userId={session.user.id} />
    </div>
  );
}
