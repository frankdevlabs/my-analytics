/**
 * Email Template Renderer
 * Renders React Email templates to HTML and text
 */

// Dynamic import to avoid issues with instrumentation
// import { renderToStaticMarkup } from 'react-dom/server';
import { EmailType } from '@prisma/client';
import ReportEmail, { ReportEmailData } from './report';
import TrafficSpikeEmail, { TrafficSpikeEmailData } from './traffic-spike';
import DowntimeEmail, { DowntimeEmailData } from './downtime';

/**
 * Rendered email output
 */
export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

/**
 * Union type for all email data types
 */
export type EmailTemplateData = ReportEmailData | TrafficSpikeEmailData | DowntimeEmailData;

/**
 * Render email template based on type and data
 *
 * @param type - Email type (DAILY_REPORT, TRAFFIC_SPIKE, DOWNTIME, etc.)
 * @param data - Template data matching the email type
 * @returns Promise<RenderedEmail> with HTML, text, and subject
 *
 * @example
 * const email = await renderTemplate(EmailType.DAILY_REPORT, {
 *   schedule: 'daily',
 *   domain: 'example.com',
 *   // ... other report data
 * });
 */
export async function renderTemplate(
  type: EmailType,
  data: EmailTemplateData
): Promise<RenderedEmail> {
  // Dynamic import to avoid issues with instrumentation
  const { renderToStaticMarkup } = await import('react-dom/server');

  let html: string;
  let subject: string;
  let component: React.ReactElement;

  switch (type) {
    case EmailType.DAILY_REPORT:
    case EmailType.WEEKLY_REPORT:
    case EmailType.MONTHLY_REPORT:
      const reportData = data as ReportEmailData;
      component = ReportEmail(reportData);
      html = renderToStaticMarkup(component);
      subject = `${reportData.schedule.charAt(0).toUpperCase() + reportData.schedule.slice(1)} Report for ${reportData.domain} - ${reportData.dateRange}`;
      break;

    case EmailType.TRAFFIC_SPIKE:
      const spikeData = data as TrafficSpikeEmailData;
      component = TrafficSpikeEmail(spikeData);
      html = renderToStaticMarkup(component);
      subject = `Traffic Spike Alert: ${spikeData.domain}`;
      break;

    case EmailType.DOWNTIME:
      const downtimeData = data as DowntimeEmailData;
      component = DowntimeEmail(downtimeData);
      html = renderToStaticMarkup(component);
      subject = `Downtime Alert: ${downtimeData.domain}`;
      break;

    default:
      throw new Error(`Unsupported email type: ${type}`);
  }

  // Generate plain text version by stripping HTML tags (simple implementation)
  const text = html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    html,
    text,
    subject,
  };
}

// Re-export types for convenience
export type { ReportEmailData, TrafficSpikeEmailData, DowntimeEmailData };
