/**
 * NextAuth.js Configuration
 * Authentication setup with Credentials provider and JWT sessions
 */

import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUserByEmail } from '../db/users';
import { verifyPassword } from './hash';
import { loginSchema } from '../validation/auth';

/**
 * NextAuth.js v5 configuration
 * Uses Credentials provider for email/password authentication
 * JWT sessions with 30-day expiration
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate credentials format
          const validatedFields = loginSchema.safeParse(credentials);

          if (!validatedFields.success) {
            console.error('Invalid credential format:', validatedFields.error);
            return null;
          }

          const { email, password } = validatedFields.data;

          // Look up user by email
          const user = await getUserByEmail(email);

          if (!user) {
            // Don't reveal whether email exists (prevent enumeration)
            console.log('Authentication failed: user not found');
            return null;
          }

          // Verify password against hash
          const isValidPassword = await verifyPassword(password, user.password);

          if (!isValidPassword) {
            console.log('Authentication failed: invalid password');
            return null;
          }

          // Return user object for successful authentication
          // This will be available in JWT callbacks
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user id to token on sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user id to session from token
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },
  },
  trustHost: true, // Required for deployment behind proxies
};

/**
 * NextAuth.js handlers
 * Export GET and POST for API route
 */
const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
