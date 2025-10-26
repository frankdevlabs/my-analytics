/**
 * Dashboard Integration Tests
 * Tests for dashboard authentication integration and session management
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { auth } from '@/lib/auth/config';
import Home from './page';

// Mock auth function from NextAuth v5 config
jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn(),
}));

// Mock LogoutButton component
jest.mock('@/components/auth', () => ({
  LogoutButton: () => <button>Sign out</button>,
}));

describe('Dashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard when user is authenticated', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText('My Analytics')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, test@example.com/i)).toBeInTheDocument();
  });

  it('displays user email in session information', async () => {
    const mockSession = {
      user: {
        id: 'user-456',
        email: 'admin@example.com',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('displays user ID in session information', async () => {
    const mockSession = {
      user: {
        id: 'user-789',
        email: 'user@example.com',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText('user-789')).toBeInTheDocument();
  });

  it('renders logout button when user is authenticated', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('displays fallback when session user email is missing', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText(/Welcome back, User/i)).toBeInTheDocument();
  });

  it('displays dashboard overview section', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(
      screen.getByText('Your analytics dashboard content will appear here.')
    ).toBeInTheDocument();
  });

  it('displays session information section', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    (auth as jest.Mock).mockResolvedValue(mockSession);

    const page = await Home();
    render(page);

    expect(screen.getByText('Session Information')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
  });
});
