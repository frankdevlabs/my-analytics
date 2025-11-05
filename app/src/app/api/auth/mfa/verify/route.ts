/**
 * MFA Verification API Endpoint
 * Verifies TOTP code or backup code during login
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { verifyToken, decryptSecret } from 'lib/auth/mfa';
import { verifyBackupCode } from 'lib/auth/backup-codes';
import { getUserByEmail, getUnusedBackupCodes, markBackupCodeUsed } from 'lib/db/users';
import { mfaVerifySchema } from 'lib/validation/mfa';

/**
 * POST /api/auth/mfa/verify
 * Verify TOTP token or backup code during login
 *
 * Requires partial authentication (password verified, MFA pending)
 *
 * Request body:
 * - code: string (6-digit TOTP or 8-character backup code)
 * - isBackupCode: boolean (optional, default: false)
 *
 * Returns:
 * - 200: Verification successful
 * - 400: Invalid request data or verification failed
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

    // Check if already verified
    if (session.user.mfaVerified) {
      return NextResponse.json(
        { message: 'MFA already verified' }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const validationResult = mfaVerifySchema.safeParse(body);

    if (!validationResult.success) {
      console.error('MFA verification validation failed:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { code, isBackupCode } = validationResult.data;

    // Get user from database
    const user = await getUserByEmail(session.user.email);

    if (!user || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'MFA not properly configured' },
        { status: 401 }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // Verify backup code
      const backupCodes = await getUnusedBackupCodes(user.id);

      for (const backupCode of backupCodes) {
        const matches = await verifyBackupCode(code, backupCode.code);

        if (matches) {
          // Mark code as used
          await markBackupCodeUsed(backupCode.id);
          isValid = true;
          console.log('MFA verified with backup code for user:', user.id);
          break;
        }
      }
    } else {
      // Verify TOTP token
      const secret = decryptSecret(user.mfaSecret);
      isValid = verifyToken(code, secret);

      if (isValid) {
        console.log('MFA verified with TOTP for user:', user.id);
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Return success - the frontend will handle session update
    return NextResponse.json({
      message: 'MFA verification successful',
      verified: true,
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify MFA' },
      { status: 500 }
    );
  }
}
