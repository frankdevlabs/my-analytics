/**
 * MFA Setup API Endpoint
 * Generates TOTP secret and QR code for first-time MFA setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'lib/auth/config';
import { generateSecret, generateOtpauthUrl } from 'lib/auth/mfa';
import QRCode from 'qrcode';

/**
 * POST /api/auth/mfa/setup
 * Generate TOTP secret and QR code for MFA setup
 *
 * Requires authentication
 *
 * Returns:
 * - 200: QR code data URL and secret
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

    // Generate TOTP secret
    const secret = generateSecret();

    // Generate otpauth URL for QR code
    const otpauthUrl = generateOtpauthUrl(session.user.email, secret);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    console.log('MFA setup initiated for user:', session.user.id);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to generate MFA setup' },
      { status: 500 }
    );
  }
}
