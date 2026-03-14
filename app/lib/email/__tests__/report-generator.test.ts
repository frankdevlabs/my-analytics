/**
 * Tests for Report Generator
 * Covers critical report generation: data aggregation and period comparison
 */

import { generateReportData, generateReport } from '../report-generator';
import { EmailSchedule } from '@prisma/client';
import * as pageviews from '../../db/pageviews';
import * as dateUtils from '../../utils/date-utils';

// Mock dependencies
jest.mock('../../db/pageviews');
jest.mock('../../utils/date-utils');

describe('Report Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock date utilities
    (dateUtils.calculatePreviousPeriod as jest.Mock).mockReturnValue({
      from: new Date('2025-11-14'),
      to: new Date('2025-11-20'),
    });
    (dateUtils.formatDateRangeDisplay as jest.Mock).mockReturnValue('Nov 21 - Nov 21');
    (dateUtils.calculatePercentageChange as jest.Mock).mockImplementation(
      (current, previous) => {
        if (previous === 0) return null;
        return ((current - previous) / previous) * 100;
      }
    );
  });

  it('should generate report data with all metrics', async () => {
    // Mock database queries
    (pageviews.getPageviewsInDateRange as jest.Mock).mockResolvedValueOnce(1500); // Current
    (pageviews.getPageviewsInDateRange as jest.Mock).mockResolvedValueOnce(1300); // Previous
    (pageviews.getUniqueVisitors as jest.Mock).mockResolvedValueOnce(800); // Current
    (pageviews.getUniqueVisitors as jest.Mock).mockResolvedValueOnce(850); // Previous
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([
      { path: '/', pageviews: 500, uniqueVisitors: 250 },
      { path: '/about', pageviews: 300, uniqueVisitors: 150 },
    ]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([
      { domain: 'google.com', category: 'Search', pageviews: 200 },
      { domain: 'facebook.com', category: 'Social', pageviews: 150 },
    ]);

    const data = await generateReportData(null, EmailSchedule.DAILY);

    expect(data.schedule).toBe('daily');
    expect(data.pageviews).toBe(1500);
    expect(data.uniqueVisitors).toBe(800);
    expect(data.topPages).toHaveLength(2);
    expect(data.topReferrers).toHaveLength(2);
    expect(data.pageviewsChange).toBeCloseTo(15.38, 1);
    expect(data.uniqueVisitorsChange).toBeCloseTo(-5.88, 1);
  });

  it('should handle zero pageviews gracefully', async () => {
    (pageviews.getPageviewsInDateRange as jest.Mock).mockResolvedValue(0);
    (pageviews.getUniqueVisitors as jest.Mock).mockResolvedValue(0);
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([]);

    const data = await generateReportData(null, EmailSchedule.DAILY);

    expect(data.pageviews).toBe(0);
    expect(data.uniqueVisitors).toBe(0);
    expect(data.topPages).toEqual([]);
    expect(data.topReferrers).toEqual([]);
  });

  it('should calculate period comparison correctly', async () => {
    (pageviews.getPageviewsInDateRange as jest.Mock)
      .mockResolvedValueOnce(200) // Current
      .mockResolvedValueOnce(100); // Previous
    (pageviews.getUniqueVisitors as jest.Mock)
      .mockResolvedValueOnce(120) // Current
      .mockResolvedValueOnce(100); // Previous
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([]);

    const data = await generateReportData(null, EmailSchedule.WEEKLY);

    expect(data.pageviewsChange).toBe(100); // 100% increase
    expect(data.uniqueVisitorsChange).toBe(20); // 20% increase
  });

  it('should handle null comparison for first report', async () => {
    (pageviews.getPageviewsInDateRange as jest.Mock)
      .mockResolvedValueOnce(100) // Current
      .mockResolvedValueOnce(0); // Previous (no data)
    (pageviews.getUniqueVisitors as jest.Mock)
      .mockResolvedValueOnce(50) // Current
      .mockResolvedValueOnce(0); // Previous
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([]);
    (dateUtils.calculatePercentageChange as jest.Mock).mockReturnValue(null);

    const data = await generateReportData(null, EmailSchedule.MONTHLY);

    expect(data.pageviewsChange).toBeNull();
    expect(data.uniqueVisitorsChange).toBeNull();
  });

  it('should respect template config for metric customization', async () => {
    (pageviews.getPageviewsInDateRange as jest.Mock).mockResolvedValue(100);
    (pageviews.getUniqueVisitors as jest.Mock).mockResolvedValue(50);
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([
      { path: '/1', pageviews: 10, uniqueVisitors: 5 },
      { path: '/2', pageviews: 9, uniqueVisitors: 4 },
      { path: '/3', pageviews: 8, uniqueVisitors: 3 },
      { path: '/4', pageviews: 7, uniqueVisitors: 2 },
      { path: '/5', pageviews: 6, uniqueVisitors: 1 },
      { path: '/6', pageviews: 5, uniqueVisitors: 1 },
      { path: '/7', pageviews: 4, uniqueVisitors: 1 },
      { path: '/8', pageviews: 3, uniqueVisitors: 1 },
      { path: '/9', pageviews: 2, uniqueVisitors: 1 },
      { path: '/10', pageviews: 1, uniqueVisitors: 1 },
    ]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([]);

    const _data = await generateReportData(null, EmailSchedule.DAILY, {
      topPagesLimit: 10,
      includeComparison: false,
    });

    expect(pageviews.getTopPages).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 10);
    // When includeComparison is false, should only call current period queries
    expect(pageviews.getPageviewsInDateRange).toHaveBeenCalledTimes(1);
  });

  it('should generate complete email with rendered template', async () => {
    (pageviews.getPageviewsInDateRange as jest.Mock).mockResolvedValue(500);
    (pageviews.getUniqueVisitors as jest.Mock).mockResolvedValue(250);
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([]);

    const email = await generateReport(null, EmailSchedule.DAILY, 'test@example.com');

    expect(email.html).toBeDefined();
    expect(email.text).toBeDefined();
    expect(email.subject).toBeDefined();
    expect(email.to).toBe('test@example.com');
  });

  it('should use correct schedule type for email type', async () => {
    (pageviews.getPageviewsInDateRange as jest.Mock).mockResolvedValue(100);
    (pageviews.getUniqueVisitors as jest.Mock).mockResolvedValue(50);
    (pageviews.getTopPages as jest.Mock).mockResolvedValue([]);
    (pageviews.getReferrersByDomain as jest.Mock).mockResolvedValue([]);

    const dailyEmail = await generateReport(null, EmailSchedule.DAILY, 'test@example.com');
    expect(dailyEmail.subject).toContain('Daily Report');

    const weeklyEmail = await generateReport(null, EmailSchedule.WEEKLY, 'test@example.com');
    expect(weeklyEmail.subject).toContain('Weekly Report');

    const monthlyEmail = await generateReport(null, EmailSchedule.MONTHLY, 'test@example.com');
    expect(monthlyEmail.subject).toContain('Monthly Report');
  });
});
