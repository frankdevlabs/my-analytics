/**
 * Login Form Component
 * Client component for email/password authentication
 */

'use client';

import React, { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface LoginFormProps {
  callbackUrl?: string;
}

/**
 * LoginForm Component
 * Handles user authentication with email and password
 * Displays error messages and loading states
 * Fully accessible with ARIA labels and keyboard navigation
 */
export function LoginForm({ callbackUrl = '/' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else if (result?.ok) {
        // Check if user needs MFA setup or verification
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.mfaEnabled === false) {
          // First time login - redirect to MFA setup
          window.location.href = '/mfa/setup';
        } else if (session?.user?.mfaEnabled && !session?.user?.mfaVerified) {
          // MFA enabled but not verified - redirect to verification
          const verifyUrl = `/mfa/verify${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
          window.location.href = verifyUrl;
        } else {
          // No MFA or already verified - redirect to callback URL
          window.location.href = callbackUrl;
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>My Analytics</CardTitle>
        <CardDescription>
          Sign in to access your analytics dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              aria-label="Email address"
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              aria-label="Password"
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200"
            >
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            aria-label={loading ? 'Signing in...' : 'Sign in'}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
