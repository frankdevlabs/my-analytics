/**
 * Report Schedule Component
 * Allows users to enable/disable email reports and select schedule
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailSchedule } from '@prisma/client';

interface EmailPreference {
  reportSchedule: EmailSchedule | null;
  reportEnabled: boolean;
}

interface ReportScheduleProps {
  value: EmailPreference;
  onChange: (updates: Partial<EmailPreference>) => void;
}

export function ReportSchedule({ value, onChange }: ReportScheduleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Reports</CardTitle>
        <CardDescription>
          Receive automated email reports summarizing your analytics data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Reports Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="reportEnabled"
            checked={value.reportEnabled}
            onCheckedChange={(checked) => onChange({ reportEnabled: checked as boolean })}
          />
          <Label htmlFor="reportEnabled" className="cursor-pointer">
            Enable email reports
          </Label>
        </div>

        {/* Schedule Selector */}
        <div className="space-y-2">
          <Label htmlFor="reportSchedule">Report Schedule</Label>
          <Select
            value={value.reportSchedule || ''}
            onValueChange={(schedule) => onChange({ reportSchedule: schedule as EmailSchedule })}
            disabled={!value.reportEnabled}
          >
            <SelectTrigger id="reportSchedule" className="w-full">
              <SelectValue placeholder="Select schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly (Monday)</SelectItem>
              <SelectItem value="MONTHLY">Monthly (1st of month)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-text-secondary">
            Reports sent at 9am server time
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
