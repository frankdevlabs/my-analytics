/**
 * NextAuth.js Type Augmentation
 * Extends default NextAuth types to include custom user fields
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extend Session user object with id field
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }

  /**
   * Extend User object with id field
   */
  interface User {
    id: string;
    email: string;
    name: string | null;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend JWT token with id field
   */
  interface JWT {
    id: string;
    email: string;
    name: string | null;
  }
}
