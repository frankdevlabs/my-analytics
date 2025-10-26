/**
 * Logout Button Component
 * Client component for user sign-out functionality
 */

'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { Button, ButtonProps } from '@/components/ui/button';

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  redirectTo?: string;
}

/**
 * LogoutButton Component
 * Handles user sign-out with NextAuth
 * Redirects to login page after logout
 * Fully accessible with ARIA labels
 */
export function LogoutButton({
  redirectTo = '/login',
  children = 'Sign out',
  variant = 'outline',
  ...props
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({
      callbackUrl: redirectTo,
      redirect: true,
    });
  };

  return (
    <Button
      variant={variant}
      onClick={handleLogout}
      aria-label="Sign out of your account"
      {...props}
    >
      {children}
    </Button>
  );
}
