/**
 * NextAuth.js Type Augmentation
 * Extends default NextAuth types to include custom user fields
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extend Session user object with id field and MFA status
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      mfaEnabled?: boolean;
      mfaVerified?: boolean;
    };
  }

  /**
   * Extend User object with id field and MFA fields
   */
  interface User {
    id: string;
    email: string;
    name: string | null;
    mfaEnabled?: boolean;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend JWT token with id field and MFA status
   */
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    mfaEnabled?: boolean;
    mfaVerified?: boolean;
  }
}
