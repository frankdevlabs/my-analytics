/**
 * MFA Setup Form Component
 * Client component for setting up two-factor authentication
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { BackupCodes } from './backup-codes';

interface SetupData {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

/**
 * MFASetupForm Component
 * Handles two-factor authentication setup
 * 1. Generates QR code
 * 2. Verifies TOTP code
 * 3. Displays backup codes
 */
export function MFASetupForm() {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'scan' | 'verify' | 'complete'>('loading');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate QR code on mount
  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate setup data');
      }

      const data = await response.json();
      setSetupData(data);
      setStep('scan');
    } catch (err) {
      setError('Failed to initialize MFA setup. Please try again.');
      console.error('MFA setup error:', err);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          secret: setupData?.secret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Store backup codes and move to complete step
      setBackupCodes(data.backupCodes);
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
      console.error('MFA verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // Redirect to dashboard
    router.push('/');
    router.refresh();
  };

  if (step === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setting up Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Two-Factor Authentication Enabled</CardTitle>
          <CardDescription>
            Save your backup codes in a secure location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BackupCodes codes={backupCodes} />
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              These backup codes can be used to access your account if you lose access
              to your authenticator app. Each code can only be used once.
            </p>
            <Button onClick={handleComplete} className="w-full">
              Continue to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set Up Two-Factor Authentication</CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {setupData && (
          <>
            {/* QR Code */}
            <div className="flex justify-center py-4">
              <img
                src={setupData.qrCode}
                alt="QR Code for authenticator app"
                className="border-4 border-white dark:border-gray-800 rounded-lg"
              />
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Can't scan? Enter this code manually:
              </p>
              <code className="block p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono break-all">
                {setupData.secret}
              </code>
            </div>

            {/* Verification */}
            <form onSubmit={handleVerify} className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="token">
                  Enter the 6-digit code from your app
                </Label>
                <Input
                  id="token"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  autoComplete="off"
                  maxLength={6}
                  aria-label="Verification code"
                  aria-required="true"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || token.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify and Enable'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
