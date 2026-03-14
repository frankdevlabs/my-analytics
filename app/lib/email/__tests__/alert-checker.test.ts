/**
 * Tests for Alert Checker
 * Covers critical alert conditions: threshold detection and cooldown logic
 */

import {
  checkTrafficSpike,
  checkDowntime,
  isCooldownActive,
  generateTrafficSpikeAlert,
  generateDowntimeAlert,
  AlertPreference,
} from '../alert-checker';
import { prisma } from '../../db/prisma';

// Mock Prisma
jest.mock('../../db/prisma', () => ({
  prisma: {
    pageview: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('Alert Checker', () => {
  const basePreference: AlertPreference = {
    userId: 'user123',
    websiteId: 'website456',
    spikeAlertEnabled: true,
    spikeThreshold: 1000,
    lastSpikeTriggeredAt: null,
    downtimeAlertEnabled: true,
    downtimeThresholdMinutes: 30,
    lastDowntimeTriggeredAt: null,
    alertCooldownHours: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Traffic Spike Detection', () => {
    it('should trigger alert when traffic exceeds threshold', async () => {
      (prisma.pageview.count as jest.Mock).mockResolvedValue(1500);

      const result = await checkTrafficSpike('website456', basePreference);

      expect(result.shouldAlert).toBe(true);
      expect(result.currentCount).toBe(1500);
      expect(result.reason).toBeUndefined();
    });

    it('should not trigger when traffic is below threshold', async () => {
      (prisma.pageview.count as jest.Mock).mockResolvedValue(500);

      const result = await checkTrafficSpike('website456', basePreference);

      expect(result.shouldAlert).toBe(false);
      expect(result.currentCount).toBe(500);
      expect(result.reason).toContain('below threshold');
    });

    it('should not trigger when traffic equals threshold (strict > comparison)', async () => {
      (prisma.pageview.count as jest.Mock).mockResolvedValue(1000);

      const result = await checkTrafficSpike('website456', basePreference);

      expect(result.shouldAlert).toBe(false);
      expect(result.currentCount).toBe(1000);
    });

    it('should suppress alert when cooldown is active', async () => {
      (prisma.pageview.count as jest.Mock).mockResolvedValue(2000);

      const preference = {
        ...basePreference,
        lastSpikeTriggeredAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      const result = await checkTrafficSpike('website456', preference);

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toContain('Cooldown active');
    });

    it('should trigger alert when cooldown expired', async () => {
      (prisma.pageview.count as jest.Mock).mockResolvedValue(2000);

      const preference = {
        ...basePreference,
        lastSpikeTriggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      const result = await checkTrafficSpike('website456', preference);

      expect(result.shouldAlert).toBe(true);
    });

    it('should skip check when spike alerts disabled', async () => {
      const preference = {
        ...basePreference,
        spikeAlertEnabled: false,
      };

      const result = await checkTrafficSpike('website456', preference);

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toContain('disabled');
      expect(prisma.pageview.count).not.toHaveBeenCalled();
    });
  });

  describe('Downtime Detection', () => {
    it('should trigger alert when downtime exceeds threshold', async () => {
      const lastPageview = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
      (prisma.pageview.findFirst as jest.Mock).mockResolvedValue({
        added_iso: lastPageview,
      });

      const result = await checkDowntime('website456', basePreference);

      expect(result.shouldAlert).toBe(true);
      expect(result.lastPageviewTime).toEqual(lastPageview);
    });

    it('should not trigger when downtime is below threshold', async () => {
      const lastPageview = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      (prisma.pageview.findFirst as jest.Mock).mockResolvedValue({
        added_iso: lastPageview,
      });

      const result = await checkDowntime('website456', basePreference);

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toContain('Last pageview 15 minutes ago');
    });

    it('should not trigger when downtime equals threshold (strict > comparison)', async () => {
      const lastPageview = new Date(Date.now() - 30 * 60 * 1000); // Exactly 30 minutes ago
      (prisma.pageview.findFirst as jest.Mock).mockResolvedValue({
        added_iso: lastPageview,
      });

      const result = await checkDowntime('website456', basePreference);

      expect(result.shouldAlert).toBe(false);
    });

    it('should skip check when site never received pageviews', async () => {
      (prisma.pageview.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkDowntime('website456', basePreference);

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toContain('never received pageviews');
      expect(result.lastPageviewTime).toBeNull();
    });

    it('should suppress alert when cooldown is active', async () => {
      const lastPageview = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
      (prisma.pageview.findFirst as jest.Mock).mockResolvedValue({
        added_iso: lastPageview,
      });

      const preference = {
        ...basePreference,
        lastDowntimeTriggeredAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      const result = await checkDowntime('website456', preference);

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toContain('Cooldown active');
    });

    it('should skip check when downtime alerts disabled', async () => {
      const preference = {
        ...basePreference,
        downtimeAlertEnabled: false,
      };

      const result = await checkDowntime('website456', preference);

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toContain('disabled');
      expect(prisma.pageview.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('Cooldown Logic', () => {
    it('should return false when lastTriggered is null', () => {
      const result = isCooldownActive(null, 1);
      expect(result).toBe(false);
    });

    it('should return true when within cooldown period', () => {
      const lastTriggered = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const result = isCooldownActive(lastTriggered, 1); // 1 hour cooldown
      expect(result).toBe(true);
    });

    it('should return false when cooldown period expired', () => {
      const lastTriggered = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const result = isCooldownActive(lastTriggered, 1); // 1 hour cooldown
      expect(result).toBe(false);
    });

    it('should handle fractional cooldown hours', () => {
      const lastTriggered = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const result = isCooldownActive(lastTriggered, 0.25); // 15 minute cooldown
      expect(result).toBe(true);
    });
  });

  describe('Alert Email Generation', () => {
    it('should generate traffic spike alert email', async () => {
      const email = await generateTrafficSpikeAlert(
        'example.com',
        5000,
        1000,
        2
      );

      expect(email.html).toContain('Traffic Spike Alert');
      expect(email.html).toContain('example.com');
      expect(email.html).toMatch(/5[,.]000/);
      expect(email.subject).toBe('Traffic Spike Alert: example.com');
    });

    it('should generate downtime alert email', async () => {
      const lastPageview = new Date('2025-11-21T10:00:00Z');
      const email = await generateDowntimeAlert(
        'example.com',
        lastPageview,
        30,
        1
      );

      expect(email.html).toContain('Downtime Alert');
      expect(email.html).toContain('example.com');
      expect(email.html).toContain('30 minutes');
      expect(email.subject).toBe('Downtime Alert: example.com');
    });
  });
});
