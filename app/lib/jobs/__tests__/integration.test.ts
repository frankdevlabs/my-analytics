/**
 * Integration Tests for Email Jobs
 * Tests complete workflows from job execution to email delivery
 */

import { EmailSchedule, EmailType } from '@prisma/client';

// Mock Resend before any imports that use it
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Mock send email module
jest.mock('../../email/send', () => ({
  sendEmail: jest.fn(),
}));

// Mock prisma
jest.mock('../../db/prisma', () => ({
  prisma: {
    emailPreference: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    website: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    pageview: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// Mock report generator
jest.mock('../../email/report-generator', () => ({
  generateReport: jest.fn().mockResolvedValue({
    subject: 'Daily Report',
    html: '<p>Report</p>',
    text: 'Report',
    to: 'test@example.com',
  }),
}));

// Now import after mocks
import { sendDailyReports } from '../send-reports';
import { checkAlerts } from '../check-alerts';
import { prisma } from '../../db/prisma';
import { sendEmail } from '../../email/send';

describe('Job Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Report Generation Full Workflow', () => {
    it('should complete full report workflow from preference query to delivery log', async () => {
      // Mock preferences with reports enabled
      const mockPreferences = [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          reportSchedule: EmailSchedule.DAILY,
          reportEnabled: true,
          templateConfig: null,
        },
      ];

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.website.findUnique as jest.Mock).mockResolvedValue({
        id: 'website-1',
        domain: 'example.com',
        userId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });

      // Mock successful email send
      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      // Execute job
      const result = await sendDailyReports();

      // Verify workflow
      expect(prisma.emailPreference.findMany).toHaveBeenCalledWith({
        where: {
          reportEnabled: true,
          reportSchedule: EmailSchedule.DAILY,
        },
        include: {
          website: true,
        },
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Daily Report',
          userId: 'user-1',
          websiteId: 'website-1',
          emailType: EmailType.DAILY_REPORT,
        })
      );

      expect(result.totalSent).toBe(1);
      expect(result.totalFailed).toBe(0);
    });
  });

  describe('Alert Detection Full Workflow', () => {
    it('should complete full alert workflow from condition detection to timestamp update', async () => {
      // Mock preferences with alerts enabled
      const mockPreferences = [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          spikeAlertEnabled: true,
          spikeThreshold: 1000,
          lastSpikeTriggeredAt: null,
          downtimeAlertEnabled: false,
          alertCooldownHours: 1,
        },
      ];

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.website.findUnique as jest.Mock).mockResolvedValue({
        id: 'website-1',
        domain: 'example.com',
        userId: 'user-1',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });

      // Mock traffic spike condition
      (prisma.pageview.count as jest.Mock).mockResolvedValue(1500);

      // Mock successful email send
      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-456',
      });

      // Mock timestamp update
      (prisma.emailPreference.update as jest.Mock).mockResolvedValue({
        ...mockPreferences[0],
        lastSpikeTriggeredAt: new Date(),
      });

      // Execute job
      const result = await checkAlerts();

      // Verify workflow
      expect(prisma.emailPreference.findMany).toHaveBeenCalled();
      expect(prisma.pageview.count).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: EmailType.TRAFFIC_SPIKE,
          userId: 'user-1',
          websiteId: 'website-1',
        })
      );
      expect(prisma.emailPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pref-1' },
          data: expect.objectContaining({
            lastSpikeTriggeredAt: expect.any(Date),
          }),
        })
      );

      expect(result.totalAlerts).toBe(1);
      expect(result.totalSuppressed).toBe(0);
    });
  });

  describe('Multi-Site Processing', () => {
    it('should process multiple sites with independent report preferences', async () => {
      // Mock multiple sites with different schedules
      const mockPreferences = [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          reportSchedule: EmailSchedule.DAILY,
          reportEnabled: true,
        },
        {
          id: 'pref-2',
          userId: 'user-1',
          websiteId: 'website-2',
          reportSchedule: EmailSchedule.DAILY,
          reportEnabled: true,
        },
      ];

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.website.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'website-1', domain: 'site1.com', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'website-2', domain: 'site2.com', userId: 'user-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      // Execute job
      const result = await sendDailyReports();

      // Verify both sites processed
      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(0);
    });

    it('should process multiple sites with different alert thresholds', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          spikeAlertEnabled: true,
          spikeThreshold: 500,
          lastSpikeTriggeredAt: null,
          downtimeAlertEnabled: false,
          alertCooldownHours: 1,
        },
        {
          id: 'pref-2',
          userId: 'user-1',
          websiteId: 'website-2',
          spikeAlertEnabled: true,
          spikeThreshold: 2000,
          lastSpikeTriggeredAt: null,
          downtimeAlertEnabled: false,
          alertCooldownHours: 1,
        },
      ];

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.website.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'website-1', domain: 'site1.com', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'website-2', domain: 'site2.com', userId: 'user-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });

      // Site 1 exceeds threshold (1000 > 500), Site 2 does not (1000 < 2000)
      (prisma.pageview.count as jest.Mock).mockResolvedValue(1000);

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      (prisma.emailPreference.update as jest.Mock).mockResolvedValue(mockPreferences[0]);

      // Execute job
      const result = await checkAlerts();

      // Verify only site 1 triggered alert
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          websiteId: 'website-1',
        })
      );
      expect(result.totalAlerts).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing other sites when one fails', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          reportSchedule: EmailSchedule.DAILY,
          reportEnabled: true,
        },
        {
          id: 'pref-2',
          userId: 'user-1',
          websiteId: 'website-2',
          reportSchedule: EmailSchedule.DAILY,
          reportEnabled: true,
        },
      ];

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.website.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'website-1', domain: 'site1.com', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'website-2', domain: 'site2.com', userId: 'user-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });

      // First site fails, second succeeds
      (sendEmail as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'Network error' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-123' });

      // Execute job
      const result = await sendDailyReports();

      // Verify both sites attempted, one succeeded
      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(result.totalSent).toBe(1);
      expect(result.totalFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Cooldown Persistence', () => {
    it('should enforce cooldown across multiple job runs', async () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const mockPreferences = [
        {
          id: 'pref-1',
          userId: 'user-1',
          websiteId: 'website-1',
          spikeAlertEnabled: true,
          spikeThreshold: 1000,
          lastSpikeTriggeredAt: thirtyMinutesAgo, // Triggered 30 minutes ago
          downtimeAlertEnabled: false,
          alertCooldownHours: 1, // 1 hour cooldown
        },
      ];

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue(mockPreferences);
      (prisma.website.findUnique as jest.Mock).mockResolvedValue({
        id: 'website-1',
        domain: 'example.com',
        userId: 'user-1',
      });

      // Traffic still exceeds threshold
      (prisma.pageview.count as jest.Mock).mockResolvedValue(1500);

      // Execute job
      const result = await checkAlerts();

      // Verify alert suppressed by cooldown
      expect(sendEmail).not.toHaveBeenCalled();
      expect(result.totalSuppressed).toBe(1);
      expect(result.totalAlerts).toBe(0);
    });
  });
});
