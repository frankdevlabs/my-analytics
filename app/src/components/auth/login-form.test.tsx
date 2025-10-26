/**
 * LoginForm Component Tests
 * Tests for login form rendering and behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from './login-form';
import { signIn } from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.location mock
    delete (window as { location?: { href: string } }).location;
    (window as { location?: { href: string } }).location = { href: '' };
  });

  test('renders email and password inputs', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('renders submit button', () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  test('form submission calls signIn with credentials', async () => {
    (signIn as jest.Mock).mockResolvedValue({ ok: true });

    render(<LoginForm callbackUrl="/dashboard" />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      });
    });
  });

  test('displays error message when sign-in fails', async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: 'Invalid credentials' });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/invalid email or password/i);
    });
  });

  test('displays loading state during submission', async () => {
    (signIn as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check loading state
    const loadingButton = screen.getByRole('button', { name: /signing in/i });
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();

    // Wait for loading to complete
    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });
  });

  test('inputs have proper accessibility attributes', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveAttribute('aria-label', 'Email address');
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(passwordInput).toHaveAttribute('aria-label', 'Password');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
  });
});
