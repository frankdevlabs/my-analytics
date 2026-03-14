/**
 * Email Preferences API Endpoint
 * GET: Retrieve user's email preferences (global and site-specific)
 * POST: Create or update email preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { z } from 'zod';
import { EmailSchedule, Prisma } from '@prisma/client';
import {
  getAllEmailPreferences,
  createOrUpdatePreference,
} from 'lib/db/email-preferences';

/**
 * Validation schema for email preference updates
 */
const emailPreferenceSchema = z.object({
  websiteId: z.string().nullable(),
  reportSchedule: z.nativeEnum(EmailSchedule).optional().nullable(),
  reportEnabled: z.boolean(),
  spikeAlertEnabled: z.boolean(),
  spikeThreshold: z.number().min(1).max(100000).optional().nullable(),
  downtimeAlertEnabled: z.boolean(),
  downtimeThresholdMinutes: z.number().min(5).max(1440).optional().nullable(),
  alertCooldownHours: z.number().min(0.083).max(24).optional(),
  templateConfig: z.record(z.any()).optional().nullable(),
});

/**
 * GET /api/settings/email/preferences
 * Retrieve all email preferences for authenticated user
 *
 * Returns:
 * - 200: Success with preferences array
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all preferences for user
    const preferences = await getAllEmailPreferences(session.user.id);

    // Separate global and site-specific preferences
    const global = preferences.find((p) => p.websiteId === null) || null;
    const sites: Record<string, typeof preferences[0]> = {};

    for (const pref of preferences) {
      if (pref.websiteId) {
        sites[pref.websiteId] = pref;
      }
    }

    return NextResponse.json({
      global,
      sites,
    });
  } catch (error) {
    console.error('Failed to get email preferences:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve email preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/email/preferences
 * Create or update email preferences
 *
 * Request body:
 * {
 *   websiteId: string | null,
 *   reportSchedule?: "DAILY" | "WEEKLY" | "MONTHLY",
 *   reportEnabled: boolean,
 *   spikeAlertEnabled: boolean,
 *   spikeThreshold?: number (1-100000),
 *   downtimeAlertEnabled: boolean,
 *   downtimeThresholdMinutes?: number (5-1440),
 *   alertCooldownHours?: number (0.083-24),
 *   templateConfig?: object
 * }
 *
 * Returns:
 * - 201: Created/updated successfully
 * - 400: Invalid request data
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const validationResult = emailPreferenceSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Email preference validation failed:', validationResult.error);
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate conditional requirements
    if (data.reportEnabled && !data.reportSchedule) {
      return NextResponse.json(
        { error: 'reportSchedule is required when reportEnabled is true' },
        { status: 400 }
      );
    }

    if (data.spikeAlertEnabled && !data.spikeThreshold) {
      return NextResponse.json(
        { error: 'spikeThreshold is required when spikeAlertEnabled is true' },
        { status: 400 }
      );
    }

    if (data.downtimeAlertEnabled && !data.downtimeThresholdMinutes) {
      return NextResponse.json(
        {
          error: 'downtimeThresholdMinutes is required when downtimeAlertEnabled is true',
        },
        { status: 400 }
      );
    }

    // Create or update preference
    const preference = await createOrUpdatePreference({
      userId: session.user.id,
      websiteId: data.websiteId || null,
      reportSchedule: data.reportSchedule || null,
      reportEnabled: data.reportEnabled,
      spikeAlertEnabled: data.spikeAlertEnabled,
      spikeThreshold: data.spikeThreshold || null,
      downtimeAlertEnabled: data.downtimeAlertEnabled,
      downtimeThresholdMinutes: data.downtimeThresholdMinutes || null,
      alertCooldownHours: data.alertCooldownHours ?? 1,
      templateConfig: data.templateConfig || Prisma.JsonNull,
    });

    return NextResponse.json(preference, { status: 201 });
  } catch (error) {
    console.error('Failed to save email preference:', error);
    return NextResponse.json(
      { error: 'Failed to save email preference' },
      { status: 500 }
    );
  }
}
