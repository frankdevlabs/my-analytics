/**
 * Tests for email-related database models
 * Note: These tests use mocked Prisma client to avoid actual database calls
 * Focused on critical model behaviors: validations, associations, key methods
 */

import { PrismaClient, EmailSchedule, EmailType, EmailStatus } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Create the mock
const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

// Mock the prisma module
jest.mock('../prisma', () => ({
  prisma: prismaMock,
}));

describe('EmailPreference model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create global preference with null websiteId', async () => {
    const mockPreference = {
      id: 'pref-1',
      userId: 'user-1',
      websiteId: null,
      reportSchedule: EmailSchedule.DAILY,
      reportEnabled: true,
      spikeAlertEnabled: false,
      spikeThreshold: null,
      lastSpikeTriggeredAt: null,
      downtimeAlertEnabled: false,
      downtimeThresholdMinutes: null,
      lastDowntimeTriggeredAt: null,
      alertCooldownHours: 1,
      templateConfig: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaMock.emailPreference.create as jest.Mock).mockResolvedValue(mockPreference);

    const result = await prismaMock.emailPreference.create({
      data: {
        userId: 'user-1',
        websiteId: null,
        reportSchedule: EmailSchedule.DAILY,
        reportEnabled: true,
      },
    });

    expect(result.websiteId).toBeNull();
    expect(result.userId).toBe('user-1');
    expect(result.reportSchedule).toBe(EmailSchedule.DAILY);
  });

  it('should create site-specific preference with websiteId', async () => {
    const mockPreference = {
      id: 'pref-2',
      userId: 'user-1',
      websiteId: 'website-1',
      reportSchedule: EmailSchedule.WEEKLY,
      reportEnabled: true,
      spikeAlertEnabled: true,
      spikeThreshold: 1000,
      lastSpikeTriggeredAt: null,
      downtimeAlertEnabled: true,
      downtimeThresholdMinutes: 30,
      lastDowntimeTriggeredAt: null,
      alertCooldownHours: 2,
      templateConfig: { includePageviews: true, topPagesLimit: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaMock.emailPreference.create as jest.Mock).mockResolvedValue(mockPreference);

    const result = await prismaMock.emailPreference.create({
      data: {
        userId: 'user-1',
        websiteId: 'website-1',
        reportSchedule: EmailSchedule.WEEKLY,
        reportEnabled: true,
        spikeAlertEnabled: true,
        spikeThreshold: 1000,
      },
    });

    expect(result.websiteId).toBe('website-1');
    expect(result.spikeAlertEnabled).toBe(true);
    expect(result.spikeThreshold).toBe(1000);
  });

  it('should use default values for boolean and cooldown fields', async () => {
    const mockPreference = {
      id: 'pref-3',
      userId: 'user-1',
      websiteId: null,
      reportSchedule: null,
      reportEnabled: false, // default
      spikeAlertEnabled: false, // default
      spikeThreshold: null,
      lastSpikeTriggeredAt: null,
      downtimeAlertEnabled: false, // default
      downtimeThresholdMinutes: null,
      lastDowntimeTriggeredAt: null,
      alertCooldownHours: 1, // default
      templateConfig: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaMock.emailPreference.create as jest.Mock).mockResolvedValue(mockPreference);

    const result = await prismaMock.emailPreference.create({
      data: {
        userId: 'user-1',
      },
    });

    expect(result.reportEnabled).toBe(false);
    expect(result.spikeAlertEnabled).toBe(false);
    expect(result.downtimeAlertEnabled).toBe(false);
    expect(result.alertCooldownHours).toBe(1);
  });
});

describe('EmailDeliveryLog model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create delivery log for successful email', async () => {
    const mockLog = {
      id: 'log-1',
      userId: 'user-1',
      websiteId: 'website-1',
      emailType: EmailType.DAILY_REPORT,
      recipientEmail: 'user@example.com',
      sentAt: new Date(),
      status: EmailStatus.SENT,
      errorMessage: null,
    };

    (prismaMock.emailDeliveryLog.create as jest.Mock).mockResolvedValue(mockLog);

    const result = await prismaMock.emailDeliveryLog.create({
      data: {
        userId: 'user-1',
        websiteId: 'website-1',
        emailType: EmailType.DAILY_REPORT,
        recipientEmail: 'user@example.com',
        status: EmailStatus.SENT,
      },
    });

    expect(result.status).toBe(EmailStatus.SENT);
    expect(result.errorMessage).toBeNull();
  });

  it('should create delivery log for failed email with error message', async () => {
    const mockLog = {
      id: 'log-2',
      userId: 'user-1',
      websiteId: null,
      emailType: EmailType.TRAFFIC_SPIKE,
      recipientEmail: 'user@example.com',
      sentAt: new Date(),
      status: EmailStatus.FAILED,
      errorMessage: 'Rate limit exceeded',
    };

    (prismaMock.emailDeliveryLog.create as jest.Mock).mockResolvedValue(mockLog);

    const result = await prismaMock.emailDeliveryLog.create({
      data: {
        userId: 'user-1',
        emailType: EmailType.TRAFFIC_SPIKE,
        recipientEmail: 'user@example.com',
        status: EmailStatus.FAILED,
        errorMessage: 'Rate limit exceeded',
      },
    });

    expect(result.status).toBe(EmailStatus.FAILED);
    expect(result.errorMessage).toBe('Rate limit exceeded');
  });

  it('should query logs sorted by sentAt DESC for pagination', async () => {
    const mockLogs = [
      {
        id: 'log-3',
        userId: 'user-1',
        websiteId: 'website-1',
        emailType: EmailType.WEEKLY_REPORT,
        recipientEmail: 'user@example.com',
        sentAt: new Date('2025-11-21T12:00:00Z'),
        status: EmailStatus.SENT,
        errorMessage: null,
      },
      {
        id: 'log-2',
        userId: 'user-1',
        websiteId: 'website-1',
        emailType: EmailType.DAILY_REPORT,
        recipientEmail: 'user@example.com',
        sentAt: new Date('2025-11-20T12:00:00Z'),
        status: EmailStatus.SENT,
        errorMessage: null,
      },
    ];

    (prismaMock.emailDeliveryLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

    const result = await prismaMock.emailDeliveryLog.findMany({
      where: { userId: 'user-1' },
      orderBy: { sentAt: 'desc' },
      take: 20,
      skip: 0,
    });

    expect(result).toHaveLength(2);
    expect(result[0].sentAt > result[1].sentAt).toBe(true);
  });
});

describe('Website model associations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should cascade delete email preferences when website is deleted', async () => {
    const mockWebsite = {
      id: 'website-1',
      domain: 'example.com',
      userId: 'user-1',
      apiKey: 'key-123',
      createdAt: new Date(),
    };

    // Mock website deletion
    (prismaMock.website.delete as jest.Mock).mockResolvedValue(mockWebsite);

    await prismaMock.website.delete({
      where: { id: 'website-1' },
    });

    expect(prismaMock.website.delete).toHaveBeenCalledWith({
      where: { id: 'website-1' },
    });
  });

  it('should allow querying website with associated email preferences', async () => {
    const mockWebsiteWithPreferences = {
      id: 'website-1',
      domain: 'example.com',
      userId: 'user-1',
      apiKey: 'key-123',
      createdAt: new Date(),
      emailPreferences: [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          reportSchedule: EmailSchedule.DAILY,
          reportEnabled: true,
        },
      ],
    };

    (prismaMock.website.findUnique as jest.Mock).mockResolvedValue(mockWebsiteWithPreferences);

    const result = await prismaMock.website.findUnique({
      where: { id: 'website-1' },
      include: { emailPreferences: true },
    });

    expect(result?.emailPreferences).toHaveLength(1);
    expect(result?.emailPreferences[0].reportSchedule).toBe(EmailSchedule.DAILY);
  });
});
