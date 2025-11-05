/**
 * MFA Verify Form Component
 * Client component for verifying MFA during login
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface MFAVerifyFormProps {
  callbackUrl?: string;
}

/**
 * MFAVerifyForm Component
 * Handles MFA verification with TOTP or backup codes
 */
export function MFAVerifyForm({ callbackUrl = '/' }: MFAVerifyFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Redirect to callback URL
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code. Please try again.';
      setError(errorMessage);
      console.error('MFA verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError('');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the code from your authenticator app'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              pattern={useBackupCode ? '[A-Za-z0-9-]{8,9}' : '[0-9]{6}'}
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              value={code}
              onChange={(e) => {
                if (useBackupCode) {
                  // Allow alphanumeric and hyphens for backup codes
                  setCode(e.target.value.toUpperCase().slice(0, 9));
                } else {
                  // Only digits for TOTP
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              required
              disabled={loading}
              autoComplete="off"
              maxLength={useBackupCode ? 9 : 6}
              aria-label={useBackupCode ? 'Backup code' : 'Verification code'}
              aria-required="true"
              className="font-mono text-lg text-center tracking-wider"
            />
            {!useBackupCode && (
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || (useBackupCode ? code.length < 8 : code.length !== 6)}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={toggleBackupCode}
              className="w-full text-sm"
            >
              {useBackupCode
                ? 'Use authenticator app instead'
                : 'Use backup code instead'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
