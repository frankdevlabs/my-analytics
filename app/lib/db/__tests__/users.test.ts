/**
 * Tests for user query helpers
 * Note: These tests use mocked Prisma client to avoid actual database calls
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Create the mock
const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

// Mock the prisma module
jest.mock('../prisma', () => ({
  prisma: prismaMock,
}));

import {
  getUserByEmail,
  createUser,
  getUserCount,
  UserValidationError,
  DatabaseError
} from '../users';

describe('getUserByEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when found by email', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      createdAt: new Date()
    };

    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await getUserByEmail('test@example.com');

    expect(result).toEqual(mockUser);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'test@example.com'
      }
    });
  });

  it('should return null when user not found', async () => {
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await getUserByEmail('nonexistent@example.com');

    expect(result).toBeNull();
  });

  it('should normalize email to lowercase and trim', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      password: 'hashed-password',
      name: null,
      createdAt: new Date()
    };

    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    await getUserByEmail('  TEST@EXAMPLE.COM  ');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'test@example.com'
      }
    });
  });
});

describe('createUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user with valid data', async () => {
    const mockUser = {
      id: 'new-user-id',
      email: 'newuser@example.com',
      password: 'hashed-password',
      name: 'New User',
      createdAt: new Date()
    };

    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser)
        }
      };
      return await fn(mockTx);
    });

    const result = await createUser({
      email: 'newuser@example.com',
      password: 'hashed-password',
      name: 'New User'
    });

    expect(result).toEqual(mockUser);
  });

  it('should throw validation error when email is missing', async () => {
    await expect(createUser({
      email: '',
      password: 'hashed-password'
    })).rejects.toThrow(UserValidationError);
  });

  it('should throw validation error when password is missing', async () => {
    await expect(createUser({
      email: 'test@example.com',
      password: ''
    })).rejects.toThrow(UserValidationError);
  });

  it('should throw database error when email already exists', async () => {
    const duplicateError = {
      code: 'P2002',
      message: 'Unique constraint violation'
    };

    (prismaMock.$transaction as jest.Mock).mockRejectedValue(duplicateError);

    await expect(createUser({
      email: 'existing@example.com',
      password: 'hashed-password'
    })).rejects.toThrow(DatabaseError);
  });

  it('should normalize email to lowercase and trim when creating', async () => {
    const mockUser = {
      id: 'new-user-id',
      email: 'newuser@example.com',
      password: 'hashed-password',
      name: null,
      createdAt: new Date()
    };

    let capturedData: Prisma.UserCreateInput | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const mockTx = {
        user: {
          create: jest.fn().mockImplementation((args: { data: Prisma.UserCreateInput }) => {
            capturedData = args.data;
            return Promise.resolve(mockUser);
          })
        }
      };
      return await fn(mockTx);
    });

    await createUser({
      email: '  NEWUSER@EXAMPLE.COM  ',
      password: 'hashed-password'
    });

    expect(capturedData!.email).toBe('newuser@example.com');
  });
});

describe('getUserCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct user count', async () => {
    (prismaMock.user.count as jest.Mock).mockResolvedValue(1);

    const count = await getUserCount();

    expect(count).toBe(1);
    expect(prismaMock.user.count).toHaveBeenCalled();
  });

  it('should return zero when no users exist', async () => {
    (prismaMock.user.count as jest.Mock).mockResolvedValue(0);

    const count = await getUserCount();

    expect(count).toBe(0);
  });

  it('should throw database error on failure', async () => {
    (prismaMock.user.count as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    await expect(getUserCount()).rejects.toThrow(DatabaseError);
  });
});
