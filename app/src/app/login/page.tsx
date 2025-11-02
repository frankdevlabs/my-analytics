/**
 * Login Page
 * Server component that renders the login form
 * Redirects to dashboard if user is already authenticated
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '../../../lib/auth/config';
import { LoginForm } from '@/components/auth/login-form';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

/**
 * Login Page Component
 * Checks authentication status and handles callback URL
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;

  // Redirect to dashboard if already authenticated
  if (session?.user) {
    redirect(params.callbackUrl || '/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-background">
      <LoginForm callbackUrl={params.callbackUrl} />
    </main>
  );
}
