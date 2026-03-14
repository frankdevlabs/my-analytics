/**
 * Tests for Email Templates
 * Covers critical template rendering and data sanitization
 */

import { ReportEmailData, TrafficSpikeEmailData, DowntimeEmailData } from '../templates';
import ReportEmail from '../templates/report';
import TrafficSpikeEmail from '../templates/traffic-spike';
import DowntimeEmail from '../templates/downtime';
import ReactDOMServer from 'react-dom/server';

// Helper to render React components to HTML string
function renderToString(component: React.ReactElement): string {
  return ReactDOMServer.renderToStaticMarkup(component);
}

describe('Email Templates', () => {
  it('should render report template with all data', () => {
    const data: ReportEmailData = {
      schedule: 'daily',
      domain: 'example.com',
      dateRange: 'Nov 15 - Nov 21',
      pageviews: 1500,
      pageviewsChange: 15.5,
      uniqueVisitors: 800,
      uniqueVisitorsChange: -5.2,
      topPages: [
        { path: '/', pageviews: 500 },
        { path: '/about', pageviews: 300 },
      ],
      topReferrers: [
        { domain: 'google.com', pageviews: 200 },
        { domain: 'facebook.com', pageviews: 150 },
      ],
      dashboardUrl: 'https://myanalytics.com/dashboard',
    };

    const html = renderToString(ReportEmail(data));

    expect(html).toContain('Daily Report for example.com');
    // Number formatting can vary by locale, check for either , or . separator
    expect(html).toMatch(/1[,.]500/);
    expect(html).toContain('+15.5%');
    expect(html).toContain('800');
    expect(html).toContain('-5.2%');
  });

  it('should sanitize domain and paths to prevent XSS', () => {
    const data: ReportEmailData = {
      schedule: 'weekly',
      domain: '<script>alert("xss")</script>',
      dateRange: 'Nov 1 - Nov 7',
      pageviews: 100,
      uniqueVisitors: 50,
      topPages: [
        { path: '/"><script>alert("xss")</script>', pageviews: 50 },
      ],
      topReferrers: [],
      dashboardUrl: 'https://myanalytics.com/dashboard',
    };

    const html = renderToString(ReportEmail(data));

    expect(html).not.toContain('<script>');
    expect(html).toContain('&amp;lt;script&amp;gt;');
    expect(html).toContain('&quot;');
  });

  it('should render traffic spike alert template', () => {
    const data: TrafficSpikeEmailData = {
      domain: 'example.com',
      currentTraffic: 5000,
      threshold: 1000,
      cooldownHours: 2,
      dashboardUrl: 'https://myanalytics.com/dashboard',
    };

    const html = renderToString(TrafficSpikeEmail(data));

    expect(html).toContain('Traffic Spike Alert');
    expect(html).toContain('example.com');
    // Number formatting can vary by locale
    expect(html).toMatch(/5[,.]000/);
    expect(html).toMatch(/1[,.]000/);
    expect(html).toContain('2 hours');
  });

  it('should render downtime alert template', () => {
    const lastPageview = new Date('2025-11-21T10:00:00Z');
    const data: DowntimeEmailData = {
      domain: 'example.com',
      lastPageviewTime: lastPageview,
      thresholdMinutes: 30,
      cooldownHours: 1,
      dashboardUrl: 'https://myanalytics.com/dashboard',
    };

    const html = renderToString(DowntimeEmail(data));

    expect(html).toContain('Downtime Alert');
    expect(html).toContain('example.com');
    expect(html).toContain('30 minutes');
    expect(html).toContain('1 hours');
    expect(html).toContain('Site is down');
  });

  it('should handle empty top pages and referrers', () => {
    const data: ReportEmailData = {
      schedule: 'monthly',
      domain: 'example.com',
      dateRange: 'Nov 1 - Nov 30',
      pageviews: 0,
      uniqueVisitors: 0,
      topPages: [],
      topReferrers: [],
      dashboardUrl: 'https://myanalytics.com/dashboard',
    };

    const html = renderToString(ReportEmail(data));

    expect(html).toContain('No data available');
    expect(html).toContain('Monthly Report');
  });

  it('should handle N/A for period comparison when change is null', () => {
    const data: ReportEmailData = {
      schedule: 'daily',
      domain: 'example.com',
      dateRange: 'Nov 21 - Nov 21',
      pageviews: 100,
      pageviewsChange: null,
      uniqueVisitors: 50,
      uniqueVisitorsChange: null,
      topPages: [],
      topReferrers: [],
      dashboardUrl: 'https://myanalytics.com/dashboard',
    };

    const html = renderToString(ReportEmail(data));

    // Should render pageviews but not show comparison when null
    expect(html).toContain('100');
    expect(html).toContain('50');
  });
});
