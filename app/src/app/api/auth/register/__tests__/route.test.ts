/**
 * Registration API Integration Tests
 * Tests for user registration endpoint including single-user constraint
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getUserCount, createUser } from '../../../../../../lib/db/users';
import { hashPassword } from '../../../../../../lib/auth/hash';

// Mock dependencies
jest.mock('../../../../../../lib/db/users');
jest.mock('../../../../../../lib/auth/hash');

const mockGetUserCount = getUserCount as jest.MockedFunction<typeof getUserCount>;
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully register first user', async () => {
    mockGetUserCount.mockResolvedValue(0);
    mockHashPassword.mockResolvedValue('$2a$12$hashedpassword');
    mockCreateUser.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      password: '$2a$12$hashedpassword',
      name: 'Admin User',
      createdAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'SecurePass123',
        name: 'Admin User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('User registered successfully');
    expect(mockGetUserCount).toHaveBeenCalled();
    expect(mockHashPassword).toHaveBeenCalledWith('SecurePass123');
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: '$2a$12$hashedpassword',
      name: 'Admin User',
    });
  });

  it('should block registration when user already exists', async () => {
    mockGetUserCount.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'second@example.com',
        password: 'SecurePass123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Registration is closed');
    expect(mockGetUserCount).toHaveBeenCalled();
    expect(mockHashPassword).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('should reject invalid email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'SecurePass123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid email');
    expect(mockGetUserCount).not.toHaveBeenCalled();
  });

  it('should reject password shorter than 8 characters', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 8');
    expect(mockGetUserCount).not.toHaveBeenCalled();
  });

  it('should reject password longer than 128 characters', async () => {
    const longPassword = 'a'.repeat(129);
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: longPassword,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('too long');
    expect(mockGetUserCount).not.toHaveBeenCalled();
  });

  it('should normalize email to lowercase', async () => {
    mockGetUserCount.mockResolvedValue(0);
    mockHashPassword.mockResolvedValue('$2a$12$hashedpassword');
    mockCreateUser.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      password: '$2a$12$hashedpassword',
      name: null,
      createdAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePass123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    mockGetUserCount.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An error occurred during registration');
  });

  it('should reject malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
