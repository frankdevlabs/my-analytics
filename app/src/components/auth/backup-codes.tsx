/**
 * Backup Codes Component
 * Displays backup codes with download and copy functionality
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BackupCodesProps {
  codes: string[];
}

/**
 * BackupCodes Component
 * Shows backup codes in a grid with copy and download options
 */
export function BackupCodes({ codes }: BackupCodesProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = codes.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy codes:', err);
    }
  };

  const handleDownload = () => {
    const text = [
      'My Analytics - Backup Codes',
      '================================',
      '',
      'Store these codes in a secure location.',
      'Each code can only be used once.',
      '',
      ...codes,
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {codes.map((code, index) => (
            <div
              key={index}
              className="p-2 bg-muted rounded text-center"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="flex-1"
        >
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          className="flex-1"
        >
          Download
        </Button>
      </div>

      <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
        <p className="font-semibold mb-1">⚠️ Important</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Save these codes in a secure password manager</li>
          <li>Each code can only be used once</li>
          <li>You won&apos;t be able to see these codes again</li>
        </ul>
      </div>
    </div>
  );
}
