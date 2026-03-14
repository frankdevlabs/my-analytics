/**
 * API Integration Tests for Email Settings
 * Tests API endpoints end-to-end including authentication and validation
 */

import { GET as getPreferences, POST as postPreferences } from '../preferences/route';
import { GET as getDeliveryLog } from '../delivery-log/route';
import { GET as getDowntimeSuggestion } from '../downtime-suggestion/route';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';
import { EmailSchedule, EmailStatus, EmailType } from '@prisma/client';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    emailPreference: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    emailDeliveryLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pageview: {
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn(),
}));

describe('Email Settings API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Preferences API CRUD Workflow', () => {
    it('should complete full CRUD workflow: create, read, update', async () => {
      // Mock authenticated user
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      // Step 1: Read empty preferences
      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue([]);

      const getRequest = new NextRequest('http://localhost/api/settings/email/preferences');
      const getResponse = await getPreferences(getRequest);
      const getData = await getResponse.json();

      expect(getData.global).toBeNull();
      expect(getData.sites).toEqual({});

      // Step 2: Create new preference
      const newPreference = {
        id: 'pref-1',
        userId: 'user-1',
        websiteId: null,
        reportSchedule: EmailSchedule.DAILY,
        reportEnabled: true,
        spikeAlertEnabled: true,
        spikeThreshold: 1000,
        downtimeAlertEnabled: false,
        downtimeThresholdMinutes: null,
        alertCooldownHours: 1,
        templateConfig: null,
        lastSpikeTriggeredAt: null,
        lastDowntimeTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.emailPreference.upsert as jest.Mock).mockResolvedValue(newPreference);

      const postRequest = new NextRequest('http://localhost/api/settings/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          websiteId: null,
          reportSchedule: 'DAILY',
          reportEnabled: true,
          spikeAlertEnabled: true,
          spikeThreshold: 1000,
        }),
      });

      const postResponse = await postPreferences(postRequest);
      const postData = await postResponse.json();

      expect(postResponse.status).toBe(201);
      expect(postData.reportSchedule).toBe(EmailSchedule.DAILY);
      expect(postData.spikeThreshold).toBe(1000);

      // Step 3: Read updated preferences
      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue([newPreference]);

      const getRequest2 = new NextRequest('http://localhost/api/settings/email/preferences');
      const getResponse2 = await getPreferences(getRequest2);
      const getData2 = await getResponse2.json();

      expect(getData2.global).not.toBeNull();
      expect(getData2.global.reportSchedule).toBe(EmailSchedule.DAILY);

      // Step 4: Update preference
      const updatedPreference = {
        ...newPreference,
        spikeThreshold: 2000,
      };

      (prisma.emailPreference.upsert as jest.Mock).mockResolvedValue(updatedPreference);

      const updateRequest = new NextRequest('http://localhost/api/settings/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          websiteId: null,
          reportSchedule: 'DAILY',
          reportEnabled: true,
          spikeAlertEnabled: true,
          spikeThreshold: 2000,
        }),
      });

      const updateResponse = await postPreferences(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(201);
      expect(updateData.spikeThreshold).toBe(2000);
    });
  });

  describe('API Authentication Flow', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated request
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/settings/email/preferences');
      const response = await getPreferences(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 200 when user is authenticated', async () => {
      // Mock authenticated user
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      (prisma.emailPreference.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/settings/email/preferences');
      const response = await getPreferences(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('global');
      expect(data).toHaveProperty('sites');
    });
  });

  describe('API Validation Errors', () => {
    it('should return 400 with helpful message for invalid spike threshold', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost/api/settings/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          websiteId: null,
          reportEnabled: true,
          spikeAlertEnabled: true,
          spikeThreshold: 200000, // Exceeds max of 100,000
        }),
      });

      const response = await postPreferences(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for invalid downtime threshold', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost/api/settings/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          websiteId: null,
          reportEnabled: true,
          downtimeAlertEnabled: true,
          downtimeThresholdMinutes: 2000, // Exceeds max of 1440
        }),
      });

      const response = await postPreferences(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should return 400 for invalid cooldown hours', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const request = new NextRequest('http://localhost/api/settings/email/preferences', {
        method: 'POST',
        body: JSON.stringify({
          websiteId: null,
          reportEnabled: true,
          alertCooldownHours: 50, // Exceeds max of 24
        }),
      });

      const response = await postPreferences(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });
  });

  describe('Delivery Log Pagination', () => {
    it('should return paginated delivery logs with correct metadata', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const mockLogs = Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i + 1}`,
        userId: 'user-1',
        websiteId: 'website-1',
        emailType: EmailType.DAILY_REPORT,
        recipientEmail: 'test@example.com',
        sentAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        status: EmailStatus.SENT,
        errorMessage: null,
      }));

      (prisma.emailDeliveryLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (prisma.emailDeliveryLog.count as jest.Mock).mockResolvedValue(25);

      const request = new NextRequest('http://localhost/api/settings/email/delivery-log?page=1&limit=5');
      const response = await getDeliveryLog(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(5);
      expect(data.total).toBe(25);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(5);
    });
  });

  describe('Downtime Suggestion Algorithm', () => {
    it('should calculate 7-day average and provide suggestion with insufficient data', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      // Mock low pageview count (< 100/day average)
      (prisma.pageview.count as jest.Mock).mockResolvedValue(350); // 350 pageviews in 7 days = 50/day

      const request = new NextRequest(
        'http://localhost/api/settings/email/downtime-suggestion?websiteId=website-1'
      );
      const response = await getDowntimeSuggestion(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.averagePageviewsPerDay).toBe(50);
      expect(data.suggestion).toBe('disable');
      expect(data.reason).toContain('Low traffic');
    });

    it('should suggest enable for high-traffic sites', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      // Mock high pageview count (> 100/day average)
      (prisma.pageview.count as jest.Mock).mockResolvedValue(1400); // 1400 pageviews in 7 days = 200/day

      const request = new NextRequest(
        'http://localhost/api/settings/email/downtime-suggestion?websiteId=website-1'
      );
      const response = await getDowntimeSuggestion(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.averagePageviewsPerDay).toBe(200);
      expect(data.suggestion).toBe('enable');
      expect(data.reason).toContain('consistent traffic');
    });

    it('should handle zero pageviews gracefully', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      (prisma.pageview.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost/api/settings/email/downtime-suggestion?websiteId=website-1'
      );
      const response = await getDowntimeSuggestion(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.averagePageviewsPerDay).toBe(0);
      expect(data.suggestion).toBeNull();
      expect(data.reason).toContain('no pageviews');
    });
  });
});
