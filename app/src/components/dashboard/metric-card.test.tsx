/**
 * MetricCard Component Tests
 * Focused tests covering critical rendering states
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './metric-card';

describe('MetricCard', () => {
  it('renders metric card with valid data', () => {
    render(
      <MetricCard
        title="Total Pageviews"
        value={12345}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('displays loading skeleton when isLoading is true', () => {
    render(
      <MetricCard
        title="Total Pageviews"
        value={null}
        isLoading={true}
        error={null}
      />
    );

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error message when error prop is provided', () => {
    render(
      <MetricCard
        title="Total Pageviews"
        value={null}
        isLoading={false}
        error="Unable to load data. Please try again."
      />
    );

    expect(screen.getByText(/Unable to load data/i)).toBeInTheDocument();
  });

  it('displays zero value correctly (not as error)', () => {
    render(
      <MetricCard
        title="Total Pageviews"
        value={0}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('formats large numbers with commas', () => {
    render(
      <MetricCard
        title="Total Pageviews"
        value={1234567}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });
});
