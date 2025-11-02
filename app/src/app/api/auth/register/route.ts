/**
 * User Registration API Endpoint
 * Handles new user registration with single-user constraint
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from 'lib/validation/auth';
import { getUserCount, createUser } from 'lib/db/users';
import { hashPassword } from 'lib/auth/hash';

/**
 * POST /api/auth/register
 * Register a new user (first user only)
 *
 * Request body:
 * - email: string (valid email format, max 255 chars)
 * - password: string (min 8 chars, max 128 chars)
 * - name: string (optional)
 *
 * Returns:
 * - 201: User created successfully
 * - 400: Validation error (invalid email/password format)
 * - 403: Registration closed (user already exists)
 * - 500: Server error (database/hashing error)
 *
 * Security:
 * - Enforces single-user constraint (first user only)
 * - Hashes password with bcrypt (cost factor 12)
 * - Generic error messages to prevent user enumeration
 * - Never logs passwords or sensitive data
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Validate request body with Zod schema
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Registration validation failed:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;

    // Check if any user already exists (single-user constraint)
    const userCount = await getUserCount();

    if (userCount > 0) {
      console.log('Registration attempt blocked: user already exists');
      return NextResponse.json(
        { error: 'Registration is closed' },
        { status: 403 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await createUser({
      email,
      password: hashedPassword,
      name,
    });

    console.log('User registered successfully:', user.id);

    // Return success (client will handle sign-in)
    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
