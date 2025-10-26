/**
 * Dashboard Home Page
 * Protected route - requires authentication
 */

import React from 'react';
import { auth } from '@/lib/auth/config';
import { LogoutButton } from '@/components/auth';

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-foreground/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {session?.user?.email || 'User'}
            </p>
          </div>
          <LogoutButton />
        </header>

        <main className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
            <div className="rounded-lg border border-foreground/10 p-6 bg-card">
              <p className="text-muted-foreground">
                Your analytics dashboard content will appear here.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Session Information</h2>
            <div className="rounded-lg border border-foreground/10 p-6 bg-card">
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium text-sm text-muted-foreground">
                    Email
                  </dt>
                  <dd className="mt-1">{session?.user?.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-sm text-muted-foreground">
                    User ID
                  </dt>
                  <dd className="mt-1 font-mono text-sm">
                    {session?.user?.id || 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
