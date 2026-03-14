/**
 * Email Settings Client Component
 * Client-side component for managing email settings state and interactions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ReportSchedule } from './components/ReportSchedule';
import { AlertThresholds } from './components/AlertThresholds';
import { DowntimeToggle } from './components/DowntimeToggle';
import { MetricToggles } from './components/MetricToggles';
import { DeliveryLog } from './components/DeliveryLog';
import type { EmailSchedule } from '@prisma/client';

interface Website {
  id: string;
  domain: string;
}

interface TemplateConfig {
  includePageviews?: boolean;
  includeUniqueVisitors?: boolean;
  includeTopPages?: boolean;
  includeTopReferrers?: boolean;
  includeComparison?: boolean;
  topPagesLimit?: number;
}

interface EmailPreference {
  id?: string;
  websiteId: string | null;
  reportSchedule: EmailSchedule | null;
  reportEnabled: boolean;
  spikeAlertEnabled: boolean;
  spikeThreshold: number | null;
  downtimeAlertEnabled: boolean;
  downtimeThresholdMinutes: number | null;
  alertCooldownHours: number;
  templateConfig: TemplateConfig | null;
}

interface EmailSettingsClientProps {
  userId: string;
}

const defaultPreferences: EmailPreference = {
  websiteId: null,
  reportSchedule: null,
  reportEnabled: false,
  spikeAlertEnabled: false,
  spikeThreshold: null,
  downtimeAlertEnabled: false,
  downtimeThresholdMinutes: null,
  alertCooldownHours: 1,
  templateConfig: {
    includePageviews: true,
    includeUniqueVisitors: true,
    includeTopPages: true,
    includeTopReferrers: true,
    includeComparison: true,
    topPagesLimit: 5,
  },
};

export function EmailSettingsClient({ }: EmailSettingsClientProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<EmailPreference>(defaultPreferences);
  const [originalPreferences, setOriginalPreferences] = useState<EmailPreference>(defaultPreferences);

  // Load websites and preferences on mount
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load preferences when selected website changes
  useEffect(() => {
    if (!loading) {
      loadPreferencesForSite(selectedWebsiteId);
    }
  }, [selectedWebsiteId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    try {
      // Load websites
      const websitesRes = await fetch('/api/websites');
      if (websitesRes.ok) {
        const websitesData = await websitesRes.json();
        setWebsites(websitesData);
      }

      // Load preferences
      await loadPreferencesForSite(null);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadPreferencesForSite(websiteId: string | null) {
    try {
      const res = await fetch('/api/settings/email/preferences');
      if (!res.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await res.json();

      let prefs: EmailPreference;
      if (websiteId === null) {
        // Load global preferences
        prefs = data.global || defaultPreferences;
      } else {
        // Load site-specific preferences, fall back to global if not exists
        prefs = data.sites[websiteId] || data.global || defaultPreferences;
        prefs.websiteId = websiteId; // Ensure websiteId is set
      }

      // Ensure templateConfig is an object
      if (!prefs.templateConfig) {
        prefs.templateConfig = defaultPreferences.templateConfig;
      }

      setPreferences(prefs);
      setOriginalPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preferences. Please try again.',
        variant: 'destructive',
      });
    }
  }

  function handlePreferenceChange(updates: Partial<EmailPreference>) {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
    }));
  }

  function handleCancel() {
    setPreferences(originalPreferences);
    toast({
      title: 'Changes Discarded',
      description: 'Your changes have been discarded.',
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Validate required fields
      if (preferences.reportEnabled && !preferences.reportSchedule) {
        toast({
          title: 'Validation Error',
          description: 'Please select a report schedule when reports are enabled.',
          variant: 'destructive',
        });
        return;
      }

      if (preferences.spikeAlertEnabled && !preferences.spikeThreshold) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a spike threshold when spike alerts are enabled.',
          variant: 'destructive',
        });
        return;
      }

      if (preferences.downtimeAlertEnabled && !preferences.downtimeThresholdMinutes) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a downtime threshold when downtime alerts are enabled.',
          variant: 'destructive',
        });
        return;
      }

      const res = await fetch('/api/settings/email/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      const savedPreference = await res.json();
      setPreferences(savedPreference);
      setOriginalPreferences(savedPreference);

      toast({
        title: 'Settings Saved',
        description: 'Your email settings have been saved successfully.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  return (
    <div className="space-y-6">
      {/* Site Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Configuration</CardTitle>
          <CardDescription>
            Choose global defaults or configure settings for a specific site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedWebsiteId || 'global'}
            onValueChange={(value) => setSelectedWebsiteId(value === 'global' ? null : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global Defaults</SelectItem>
              {websites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Report Schedule */}
      <ReportSchedule
        value={preferences}
        onChange={handlePreferenceChange}
      />

      {/* Alert Thresholds */}
      <AlertThresholds
        value={preferences}
        onChange={handlePreferenceChange}
      />

      {/* Downtime Toggle */}
      <DowntimeToggle
        value={preferences}
        onChange={handlePreferenceChange}
        websiteId={selectedWebsiteId}
      />

      {/* Metric Toggles */}
      <MetricToggles
        value={preferences.templateConfig || defaultPreferences.templateConfig!}
        onChange={(templateConfig) => handlePreferenceChange({ templateConfig })}
      />

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex-1"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={saving || !hasChanges}
        >
          Cancel
        </Button>
      </div>

      {/* Delivery Log */}
      <DeliveryLog />
    </div>
  );
}
