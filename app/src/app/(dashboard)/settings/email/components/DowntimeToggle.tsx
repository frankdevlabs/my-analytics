/**
 * Downtime Toggle Component
 * Configures downtime alerts with auto-suggestion based on traffic
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EmailPreference {
  downtimeAlertEnabled: boolean;
  downtimeThresholdMinutes: number | null;
}

interface DowntimeToggleProps {
  value: EmailPreference;
  onChange: (updates: Partial<EmailPreference>) => void;
  websiteId: string | null;
}

interface DowntimeSuggestion {
  averagePageviewsPerDay: number;
  suggestion: 'enable' | 'disable' | null;
  reason: string;
}

export function DowntimeToggle({ value, onChange, websiteId }: DowntimeToggleProps) {
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<DowntimeSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Fetch suggestion when website changes (only for site-specific, not global)
  useEffect(() => {
    if (websiteId) {
      fetchSuggestion(websiteId);
    } else {
      setSuggestion(null);
    }
  }, [websiteId]);

  async function fetchSuggestion(siteId: string) {
    setLoadingSuggestion(true);
    try {
      const res = await fetch(`/api/settings/email/downtime-suggestion?websiteId=${siteId}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data);
      } else {
        setSuggestion(null);
      }
    } catch (error) {
      console.error('Failed to fetch downtime suggestion:', error);
      setSuggestion(null);
    } finally {
      setLoadingSuggestion(false);
    }
  }

  function handleThresholdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === '') {
      onChange({ downtimeThresholdMinutes: null });
      setThresholdError(null);
      return;
    }

    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setThresholdError('Please enter a valid number');
      return;
    }

    if (num < 5 || num > 1440) {
      setThresholdError('Threshold must be between 5 and 1440 minutes (24 hours)');
      onChange({ downtimeThresholdMinutes: num });
      return;
    }

    setThresholdError(null);
    onChange({ downtimeThresholdMinutes: num });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Downtime Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suggestion Banner - Only show for site-specific settings */}
        {websiteId && suggestion && !loadingSuggestion && (
          <Alert variant={suggestion.suggestion === 'enable' ? 'default' : 'warning'}>
            <AlertTitle>
              {suggestion.suggestion === 'enable' ? 'Recommendation: Enable' : 'Recommendation: Disable'}
            </AlertTitle>
            <AlertDescription>
              Your site averages {Math.round(suggestion.averagePageviewsPerDay)} pageviews/day.{' '}
              {suggestion.reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Enable Downtime Alerts Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="downtimeAlertEnabled"
            checked={value.downtimeAlertEnabled}
            onCheckedChange={(checked) => onChange({ downtimeAlertEnabled: checked as boolean })}
          />
          <Label htmlFor="downtimeAlertEnabled" className="cursor-pointer">
            Enable downtime alerts
          </Label>
        </div>

        {/* Downtime Threshold Input */}
        <div className="space-y-2">
          <Label htmlFor="downtimeThresholdMinutes">
            Alert when no pageviews for
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="downtimeThresholdMinutes"
              type="number"
              min={5}
              max={1440}
              value={value.downtimeThresholdMinutes || ''}
              onChange={handleThresholdChange}
              disabled={!value.downtimeAlertEnabled}
              placeholder="e.g., 30"
              className="max-w-xs"
            />
            <span className="text-sm text-text-secondary">minutes</span>
          </div>
          {thresholdError && (
            <p className="text-sm text-red-600 dark:text-red-400">{thresholdError}</p>
          )}
          <p className="text-sm text-text-secondary">
            Range: 5-1440 minutes (24 hours)
          </p>
        </div>

        <div className="text-sm text-text-secondary bg-surface/50 p-3 rounded-md">
          <p className="font-medium mb-1">What this detects:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Site downtime</li>
            <li>Tracking script not loading</li>
            <li>DNS or hosting issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
