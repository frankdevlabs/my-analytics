/**
 * Email Report Template
 * Generates HTML and text email for daily/weekly/monthly analytics reports
 */
import React from 'react';

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from '@react-email/components';

export interface ReportEmailData {
  schedule: 'daily' | 'weekly' | 'monthly';
  domain: string;
  dateRange: string;
  pageviews: number;
  pageviewsChange?: number | null;
  uniqueVisitors: number;
  uniqueVisitorsChange?: number | null;
  topPages: Array<{ path: string; pageviews: number }>;
  topReferrers: Array<{ domain: string; pageviews: number }>;
  dashboardUrl: string;
}

/**
 * Sanitize user-generated content to prevent XSS
 */
function sanitize(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Format percentage change with sign
 */
function formatChange(change: number | null | undefined): string {
  if (change === null || change === undefined) {
    return 'N/A';
  }
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Report Email Template Component
 */
export default function ReportEmail({
  schedule,
  domain,
  dateRange,
  pageviews,
  pageviewsChange,
  uniqueVisitors,
  uniqueVisitorsChange,
  topPages,
  topReferrers,
  dashboardUrl,
}: ReportEmailData) {
  const scheduleTitle = schedule.charAt(0).toUpperCase() + schedule.slice(1);
  const sanitizedDomain = sanitize(domain);

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {scheduleTitle} Report for {sanitizedDomain}
          </Heading>

          <Text style={text}>Hi there,</Text>

          <Text style={text}>
            Here&apos;s your {schedule} analytics report for {sanitizedDomain}:
          </Text>

          <Text style={dateText}>Period: {dateRange}</Text>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={h2}>OVERVIEW</Heading>

            <table style={table}>
              <tbody>
                <tr>
                  <td style={tableCell}>
                    <strong>Total Pageviews:</strong>
                  </td>
                  <td style={tableCell}>
                    {pageviews.toLocaleString()} {formatChange(pageviewsChange) !== 'N/A' && `(${formatChange(pageviewsChange)} vs previous period)`}
                  </td>
                </tr>
                <tr>
                  <td style={tableCell}>
                    <strong>Unique Visitors:</strong>
                  </td>
                  <td style={tableCell}>
                    {uniqueVisitors.toLocaleString()} {formatChange(uniqueVisitorsChange) !== 'N/A' && `(${formatChange(uniqueVisitorsChange)} vs previous period)`}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={hr} />

          {topPages.length > 0 && (
            <Section>
              <Heading as="h2" style={h2}>TOP PAGES</Heading>
              <table style={table}>
                <tbody>
                  {topPages.map((page, index) => (
                    <tr key={index}>
                      <td style={tableCell}>{index + 1}.</td>
                      <td style={tableCell}>{sanitize(page.path)}</td>
                      <td style={tableCell}>{page.pageviews.toLocaleString()} pageviews</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {topPages.length === 0 && (
            <Section>
              <Heading as="h2" style={h2}>TOP PAGES</Heading>
              <Text style={text}>No data available</Text>
            </Section>
          )}

          <Hr style={hr} />

          {topReferrers.length > 0 && (
            <Section>
              <Heading as="h2" style={h2}>TOP REFERRERS</Heading>
              <table style={table}>
                <tbody>
                  {topReferrers.map((referrer, index) => (
                    <tr key={index}>
                      <td style={tableCell}>{index + 1}.</td>
                      <td style={tableCell}>{sanitize(referrer.domain)}</td>
                      <td style={tableCell}>{referrer.pageviews.toLocaleString()} visits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {topReferrers.length === 0 && (
            <Section>
              <Heading as="h2" style={h2}>TOP REFERRERS</Heading>
              <Text style={text}>No data available</Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={text}>
            <Link href={dashboardUrl} style={link}>
              View full dashboard →
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>Generated by My Analytics</Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
};

const dateText = {
  color: '#666',
  fontSize: '14px',
  fontStyle: 'italic',
  padding: '0 40px',
  marginTop: '10px',
};

const table = {
  width: '100%',
  padding: '0 40px',
};

const tableCell = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '4px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const link = {
  color: '#556cd6',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
};
