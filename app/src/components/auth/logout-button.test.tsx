/**
 * LogoutButton Component Tests
 * Tests for logout functionality and user interaction
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { LogoutButton } from './logout-button';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders logout button with default text', () => {
    render(<LogoutButton />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('renders logout button with custom text', () => {
    render(<LogoutButton>Log out</LogoutButton>);
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('calls signOut when clicked', async () => {
    render(<LogoutButton />);
    const button = screen.getByText('Sign out');

    fireEvent.click(button);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({
        callbackUrl: '/login',
        redirect: true,
      });
    });
  });

  it('redirects to custom URL when provided', async () => {
    render(<LogoutButton redirectTo="/custom-page" />);
    const button = screen.getByText('Sign out');

    fireEvent.click(button);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({
        callbackUrl: '/custom-page',
        redirect: true,
      });
    });
  });

  it('has proper ARIA label for accessibility', () => {
    render(<LogoutButton />);
    const button = screen.getByLabelText('Sign out of your account');
    expect(button).toBeInTheDocument();
  });

  it('applies custom variant prop', () => {
    render(<LogoutButton variant="default" />);
    const button = screen.getByText('Sign out');
    expect(button).toHaveClass('bg-foreground');
  });

  it('applies outline variant by default', () => {
    render(<LogoutButton />);
    const button = screen.getByText('Sign out');
    expect(button).toHaveClass('border-2');
  });

  it('forwards additional props to Button component', () => {
    render(<LogoutButton className="custom-class" data-testid="logout-btn" />);
    const button = screen.getByTestId('logout-btn');
    expect(button).toHaveClass('custom-class');
  });
});
