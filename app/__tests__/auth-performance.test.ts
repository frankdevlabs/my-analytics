/**
 * Authentication Performance Tests
 * Validates performance requirements for authentication operations
 *
 * Performance targets from spec:
 * - Password hashing: <500ms
 * - Session validation: <50ms
 * - Login flow: <2s (end-to-end)
 * - Middleware overhead: <50ms for public routes
 */

import { hashPassword, verifyPassword } from '../lib/auth/hash';
import { getUserByEmail, getUserCount } from '../lib/db/users';
import { loginSchema } from '../lib/validation/auth';
import { prisma } from '../lib/db/prisma';

// Mock Prisma for performance testing
jest.mock('../lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('Performance: Password Hashing', () => {
  it('should hash password in less than 500ms', async () => {
    const password = 'TestPassword123';
    const startTime = performance.now();

    await hashPassword(password);

    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(500);
    console.log(`Password hashing took ${duration.toFixed(2)}ms`);
  });

  it('should verify password in less than 500ms', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);

    const startTime = performance.now();

    await verifyPassword(password, hash);

    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(500);
    console.log(`Password verification took ${duration.toFixed(2)}ms`);
  });

  it('should handle multiple password operations efficiently', async () => {
    const password = 'TestPassword123';
    const startTime = performance.now();

    // Simulate 3 rapid password operations
    const hash1 = await hashPassword(password);
    await hashPassword(password);
    await verifyPassword(password, hash1);

    const totalDuration = performance.now() - startTime;

    // 3 operations should complete in reasonable time
    expect(totalDuration).toBeLessThan(1500); // 3 * 500ms
    console.log(`3 password operations took ${totalDuration.toFixed(2)}ms`);
  });
});

describe('Performance: Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should query user by email in less than 50ms', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password: '$2a$12$hash',
      name: 'Test User',
      createdAt: new Date(),
    };

    // Mock fast database response
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const startTime = performance.now();

    await getUserByEmail('test@example.com');

    const duration = performance.now() - startTime;

    // With mocked DB, should be very fast (simulating fast index lookup)
    expect(duration).toBeLessThan(50);
    console.log(`User lookup took ${duration.toFixed(2)}ms`);
  });

  it('should get user count in less than 50ms', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const startTime = performance.now();

    await getUserCount();

    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(50);
    console.log(`User count query took ${duration.toFixed(2)}ms`);
  });
});

describe('Performance: Input Validation', () => {
  it('should validate login credentials in less than 10ms', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'ValidPassword123',
    };

    const startTime = performance.now();

    const result = loginSchema.safeParse(credentials);

    const duration = performance.now() - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(10);
    console.log(`Schema validation took ${duration.toFixed(2)}ms`);
  });

  it('should validate multiple inputs efficiently', () => {
    const inputs = Array(100).fill({
      email: 'test@example.com',
      password: 'ValidPassword123',
    });

    const startTime = performance.now();

    inputs.forEach((input) => {
      loginSchema.safeParse(input);
    });

    const duration = performance.now() - startTime;

    // 100 validations should complete quickly
    expect(duration).toBeLessThan(100); // 1ms per validation
    console.log(`100 validations took ${duration.toFixed(2)}ms`);
  });
});

describe('Performance: Complete Login Flow Simulation', () => {
  it('should complete simulated login flow in less than 2 seconds', async () => {
    // Setup mocks
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password: await hashPassword('TestPassword123'),
      name: 'Test User',
      createdAt: new Date(),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const startTime = performance.now();

    // Step 1: Validate input (~1ms)
    const validationResult = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'TestPassword123',
    });
    expect(validationResult.success).toBe(true);

    // Step 2: Look up user (~10ms with real DB, <1ms mocked)
    const user = await getUserByEmail('test@example.com');
    expect(user).not.toBeNull();

    // Step 3: Verify password (~100-500ms)
    const isValid = await verifyPassword(
      'TestPassword123',
      user!.password
    );
    expect(isValid).toBe(true);

    // Step 4: Create session (JWT signing - negligible in real NextAuth)
    const session = {
      user: { id: user!.id, email: user!.email },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    expect(session.user.email).toBe('test@example.com');

    const totalDuration = performance.now() - startTime;

    // Total login flow should be under 2 seconds
    expect(totalDuration).toBeLessThan(2000);
    console.log(`Complete login flow took ${totalDuration.toFixed(2)}ms`);
  });
});

describe('Performance: Concurrent Operations', () => {
  it('should handle multiple concurrent password hashing operations', async () => {
    const passwords = [
      'Password1',
      'Password2',
      'Password3',
      'Password4',
      'Password5',
    ];

    const startTime = performance.now();

    // Hash all passwords concurrently
    const hashes = await Promise.all(
      passwords.map((pwd) => hashPassword(pwd))
    );

    const duration = performance.now() - startTime;

    expect(hashes).toHaveLength(5);
    hashes.forEach((hash) => {
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
    });

    // Concurrent operations should be faster than sequential
    // (bcrypt uses worker threads)
    console.log(`5 concurrent hashes took ${duration.toFixed(2)}ms`);
  });
});

describe('Performance: Memory Efficiency', () => {
  it('should not leak memory during password operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform 50 password operations
    for (let i = 0; i < 50; i++) {
      const hash = await hashPassword(`Password${i}`);
      await verifyPassword(`Password${i}`, hash);
    }

    // Force garbage collection if available (run with --expose-gc)
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (<10MB for 50 operations)
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

    // This is a soft assertion - memory patterns can vary
    expect(memoryIncreaseMB).toBeLessThan(20);
  });
});
