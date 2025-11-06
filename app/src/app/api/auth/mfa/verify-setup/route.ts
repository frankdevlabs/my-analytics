/**
 * MFA Verify Setup API Endpoint
 * Verifies initial TOTP code and enables MFA with backup codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { verifyToken, encryptSecret } from 'lib/auth/mfa';
import { generateBackupCodes, formatCodesForDisplay } from 'lib/auth/backup-codes';
import { updateUserMFA, createBackupCodes, getUserByEmail } from 'lib/db/users';
import { mfaSetupSchema } from 'lib/validation/mfa';

/**
 * POST /api/auth/mfa/verify-setup
 * Verify TOTP token and enable MFA with backup codes
 *
 * Requires authentication
 *
 * Request body:
 * - token: string (6-digit TOTP code)
 * - secret: string (TOTP secret from setup)
 *
 * Returns:
 * - 200: MFA enabled successfully with backup codes
 * - 400: Invalid request data or verification failed
 * - 401: Not authenticated
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

    const validationResult = mfaSetupSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('MFA setup validation failed:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { token, secret } = validationResult.data;

    // Verify TOTP token
    const isValid = verifyToken(token, secret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Get user from database to ensure we have the correct user ID
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      console.error('User not found in database:', {
        sessionUserId: session.user.id,
        sessionUserEmail: session.user.email
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('MFA verify-setup: User fetched from database:', {
      userId: user.id,
      email: user.email,
      sessionUserId: session.user.id,
      idsMatch: user.id === session.user.id
    });

    // Encrypt secret for storage
    const encryptedSecret = encryptSecret(secret);

    // Generate backup codes
    const backupCodesData = await generateBackupCodes(10);
    const hashedCodes = backupCodesData.map(bc => bc.hashedCode);

    // Update user with MFA enabled and encrypted secret (use DB user ID, not session ID)
    await updateUserMFA(user.id, {
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
    });

    // Store backup codes (use DB user ID, not session ID)
    await createBackupCodes(user.id, hashedCodes);

    // Format backup codes for display (only shown once)
    const displayCodes = formatCodesForDisplay(backupCodesData);

    console.log('MFA enabled successfully for user:', user.id);

    return NextResponse.json({
      message: 'MFA enabled successfully',
      backupCodes: displayCodes,
    });
  } catch (error) {
    console.error('MFA verify-setup error:', error);
    return NextResponse.json(
      { error: 'Failed to enable MFA' },
      { status: 500 }
    );
  }
}
