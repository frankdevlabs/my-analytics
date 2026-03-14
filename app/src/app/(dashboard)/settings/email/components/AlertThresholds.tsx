/**
 * Alert Thresholds Component
 * Configures traffic spike alerts and cooldown period
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface EmailPreference {
  spikeAlertEnabled: boolean;
  spikeThreshold: number | null;
  alertCooldownHours: number;
}

interface AlertThresholdsProps {
  value: EmailPreference;
  onChange: (updates: Partial<EmailPreference>) => void;
}

export function AlertThresholds({ value, onChange }: AlertThresholdsProps) {
  const [thresholdError, setThresholdError] = React.useState<string | null>(null);
  const [cooldownError, setCooldownError] = React.useState<string | null>(null);

  function handleThresholdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === '') {
      onChange({ spikeThreshold: null });
      setThresholdError(null);
      return;
    }

    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setThresholdError('Please enter a valid number');
      return;
    }

    if (num < 1 || num > 100000) {
      setThresholdError('Threshold must be between 1 and 100,000');
      onChange({ spikeThreshold: num });
      return;
    }

    setThresholdError(null);
    onChange({ spikeThreshold: num });
  }

  function handleCooldownChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === '') {
      onChange({ alertCooldownHours: 1 });
      setCooldownError(null);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
      setCooldownError('Please enter a valid number');
      return;
    }

    if (num < 0.083 || num > 24) {
      setCooldownError('Cooldown must be between 0.083 (5 minutes) and 24 hours');
      onChange({ alertCooldownHours: num });
      return;
    }

    setCooldownError(null);
    onChange({ alertCooldownHours: num });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Settings</CardTitle>
        <CardDescription>
          Configure traffic spike alerts and cooldown periods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Traffic Spike Alerts */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="spikeAlertEnabled"
              checked={value.spikeAlertEnabled}
              onCheckedChange={(checked) => onChange({ spikeAlertEnabled: checked as boolean })}
            />
            <Label htmlFor="spikeAlertEnabled" className="cursor-pointer">
              Enable traffic spike alerts
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spikeThreshold">
              Alert when pageviews exceed
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="spikeThreshold"
                type="number"
                min={1}
                max={100000}
                value={value.spikeThreshold || ''}
                onChange={handleThresholdChange}
                disabled={!value.spikeAlertEnabled}
                placeholder="e.g., 1000"
                className="max-w-xs"
              />
              <span className="text-sm text-text-secondary">per hour</span>
            </div>
            {thresholdError && (
              <p className="text-sm text-red-600 dark:text-red-400">{thresholdError}</p>
            )}
            <p className="text-sm text-text-secondary">
              Checks last 60 minutes every 15 minutes (range: 1-100,000)
            </p>
          </div>
        </div>

        {/* Alert Cooldown */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="alertCooldownHours">Cooldown period</Label>
          <div className="flex items-center gap-2">
            <Input
              id="alertCooldownHours"
              type="number"
              min={0.083}
              max={24}
              step={0.1}
              value={value.alertCooldownHours}
              onChange={handleCooldownChange}
              placeholder="1"
              className="max-w-xs"
            />
            <span className="text-sm text-text-secondary">hours</span>
          </div>
          {cooldownError && (
            <p className="text-sm text-red-600 dark:text-red-400">{cooldownError}</p>
          )}
          <p className="text-sm text-text-secondary">
            Minimum time between alerts of the same type (0.083-24 hours)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
