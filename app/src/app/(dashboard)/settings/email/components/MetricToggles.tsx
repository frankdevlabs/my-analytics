/**
 * Metric Toggles Component
 * Allows users to customize which metrics appear in reports
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TemplateConfig {
  includePageviews?: boolean;
  includeUniqueVisitors?: boolean;
  includeTopPages?: boolean;
  includeTopReferrers?: boolean;
  includeComparison?: boolean;
  topPagesLimit?: number;
}

interface MetricTogglesProps {
  value: TemplateConfig;
  onChange: (config: TemplateConfig) => void;
}

export function MetricToggles({ value, onChange }: MetricTogglesProps) {
  const [limitError, setLimitError] = React.useState<string | null>(null);

  function handleToggle(key: keyof TemplateConfig, checked: boolean) {
    onChange({
      ...value,
      [key]: checked,
    });
  }

  function handleLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === '') {
      onChange({ ...value, topPagesLimit: 5 });
      setLimitError(null);
      return;
    }

    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setLimitError('Please enter a valid number');
      return;
    }

    if (num < 1 || num > 10) {
      setLimitError('Limit must be between 1 and 10');
      onChange({ ...value, topPagesLimit: num });
      return;
    }

    setLimitError(null);
    onChange({ ...value, topPagesLimit: num });
  }

  // Provide default values if not set
  const config: Required<TemplateConfig> = {
    includePageviews: value.includePageviews ?? true,
    includeUniqueVisitors: value.includeUniqueVisitors ?? true,
    includeTopPages: value.includeTopPages ?? true,
    includeTopReferrers: value.includeTopReferrers ?? true,
    includeComparison: value.includeComparison ?? true,
    topPagesLimit: value.topPagesLimit ?? 5,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Customization</CardTitle>
        <CardDescription>
          Choose which metrics to include in your email reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Checkboxes */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includePageviews"
              checked={config.includePageviews}
              onCheckedChange={(checked) => handleToggle('includePageviews', checked as boolean)}
            />
            <Label htmlFor="includePageviews" className="cursor-pointer">
              Include pageviews
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeUniqueVisitors"
              checked={config.includeUniqueVisitors}
              onCheckedChange={(checked) => handleToggle('includeUniqueVisitors', checked as boolean)}
            />
            <Label htmlFor="includeUniqueVisitors" className="cursor-pointer">
              Include unique visitors
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeTopPages"
              checked={config.includeTopPages}
              onCheckedChange={(checked) => handleToggle('includeTopPages', checked as boolean)}
            />
            <Label htmlFor="includeTopPages" className="cursor-pointer">
              Include top pages
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeTopReferrers"
              checked={config.includeTopReferrers}
              onCheckedChange={(checked) => handleToggle('includeTopReferrers', checked as boolean)}
            />
            <Label htmlFor="includeTopReferrers" className="cursor-pointer">
              Include top referrers
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeComparison"
              checked={config.includeComparison}
              onCheckedChange={(checked) => handleToggle('includeComparison', checked as boolean)}
            />
            <Label htmlFor="includeComparison" className="cursor-pointer">
              Include period comparison
            </Label>
          </div>
        </div>

        {/* Top Pages/Referrers Limit */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="topPagesLimit">Top pages/referrers limit</Label>
          <Input
            id="topPagesLimit"
            type="number"
            min={1}
            max={10}
            value={config.topPagesLimit}
            onChange={handleLimitChange}
            className="max-w-xs"
          />
          {limitError && (
            <p className="text-sm text-red-600 dark:text-red-400">{limitError}</p>
          )}
          <p className="text-sm text-text-secondary">
            Number of top pages and referrers to include (1-10)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
