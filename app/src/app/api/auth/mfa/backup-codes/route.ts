/**
 * MFA Backup Codes API Endpoint
 * Regenerates backup codes for account recovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { generateBackupCodes, formatCodesForDisplay } from 'lib/auth/backup-codes';
import { createBackupCodes } from 'lib/db/users';

/**
 * POST /api/auth/mfa/backup-codes
 * Generate new backup codes (replaces existing ones)
 *
 * Requires authentication and MFA enabled
 *
 * Returns:
 * - 200: New backup codes generated
 * - 401: Not authenticated or MFA not enabled
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if MFA is enabled
    if (!session.user.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 401 }
      );
    }

    // Generate new backup codes
    const backupCodesData = await generateBackupCodes(10);
    const hashedCodes = backupCodesData.map(bc => bc.hashedCode);

    // Replace existing codes with new ones
    await createBackupCodes(session.user.id, hashedCodes);

    // Format backup codes for display
    const displayCodes = formatCodesForDisplay(backupCodesData);

    console.log('Backup codes regenerated for user:', session.user.id);

    return NextResponse.json({
      message: 'Backup codes regenerated successfully',
      backupCodes: displayCodes,
    });
  } catch (error) {
    console.error('Backup codes generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup codes' },
      { status: 500 }
    );
  }
}
