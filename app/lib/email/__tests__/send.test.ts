/**
 * Tests for Email Send Service
 * Covers critical email operations: send success, retry logic, and delivery logging
 */

import { sendEmail } from '../send';
import { EmailType, EmailStatus } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '../../db/prisma';

// Mock Resend
jest.mock('resend');
const MockedResend = Resend as jest.MockedClass<typeof Resend>;

// Mock Prisma
jest.mock('../../db/prisma', () => ({
  prisma: {
    emailDeliveryLog: {
      create: jest.fn(),
    },
  },
}));

describe('Email Send Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set RESEND_API_KEY for tests
    process.env.RESEND_API_KEY = 'test_api_key';
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('should successfully send email and log delivery', async () => {
    // Mock successful send
    const mockSend = jest.fn().mockResolvedValue({
      data: { id: 'msg_123' },
    });
    MockedResend.prototype.emails = { send: mockSend } as any;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
      text: 'Test content',
      userId: 'user123',
      websiteId: 'website456',
      emailType: EmailType.DAILY_REPORT,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg_123');
    expect(mockSend).toHaveBeenCalledWith({
      from: 'My Analytics <noreply@myanalytics.com>',
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
      text: 'Test content',
    });
    expect(prisma.emailDeliveryLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user123',
        websiteId: 'website456',
        emailType: EmailType.DAILY_REPORT,
        recipientEmail: 'test@example.com',
        status: EmailStatus.SENT,
        errorMessage: null,
      },
    });
  });

  it('should retry on transient failures', async () => {
    const mockSend = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { id: 'msg_456' } });

    MockedResend.prototype.emails = { send: mockSend } as any;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      userId: 'user123',
      emailType: EmailType.TRAFFIC_SPIKE,
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(2); // Failed once, succeeded on retry
  });

  it('should handle rate limit errors', async () => {
    const rateLimitError = { statusCode: 429, message: 'Too many requests' };
    const mockSend = jest.fn().mockRejectedValue(rateLimitError);
    MockedResend.prototype.emails = { send: mockSend } as any;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      userId: 'user123',
      emailType: EmailType.DAILY_REPORT,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit exceeded');
    expect(prisma.emailDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailStatus.FAILED,
        }),
      })
    );
  });

  it('should fail after max retries', async () => {
    const mockSend = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    MockedResend.prototype.emails = { send: mockSend } as any;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      userId: 'user123',
      emailType: EmailType.DOWNTIME,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockSend).toHaveBeenCalledTimes(4); // Initial + 3 retries
    expect(prisma.emailDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailStatus.FAILED,
        }),
      })
    );
  });

  it('should handle missing API key', async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      userId: 'user123',
      emailType: EmailType.WEEKLY_REPORT,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RESEND_API_KEY');
    expect(prisma.emailDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailStatus.FAILED,
        }),
      })
    );
  });

  it('should handle null websiteId for global emails', async () => {
    const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg_789' } });
    MockedResend.prototype.emails = { send: mockSend } as any;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      userId: 'user123',
      websiteId: null,
      emailType: EmailType.MONTHLY_REPORT,
    });

    expect(result.success).toBe(true);
    expect(prisma.emailDeliveryLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user123',
        websiteId: null,
        emailType: EmailType.MONTHLY_REPORT,
        recipientEmail: 'test@example.com',
        status: EmailStatus.SENT,
        errorMessage: null,
      },
    });
  });
});
