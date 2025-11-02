/**
 * Tests for SortableTable Component
 *
 * Tests the SortableTable reusable component to ensure correct rendering,
 * sorting functionality, and accessibility features.
 *
 * Task Group 4: Analytics Components - Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortableTable, ColumnConfig } from '../sortable-table';

describe('SortableTable', () => {
  const mockData = [
    { name: 'Desktop', count: 100, percentage: 50 },
    { name: 'Mobile', count: 80, percentage: 40 },
    { name: 'Tablet', count: 20, percentage: 10 },
  ];

  const columns: ColumnConfig[] = [
    { key: 'name', label: 'Name', sortable: true, align: 'left' },
    {
      key: 'count',
      label: 'Count',
      sortable: true,
      align: 'right',
      format: (val: unknown) => (typeof val === 'number' ? val.toLocaleString('en-US') : String(val)),
    },
    {
      key: 'percentage',
      label: 'Percentage',
      sortable: true,
      align: 'right',
      format: (val: unknown) => (typeof val === 'number' ? `${val.toFixed(1)}%` : String(val)),
    },
  ];

  it('should render table with data', () => {
    render(<SortableTable data={mockData} columns={columns} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('Percentage')).toBeInTheDocument();
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
    expect(screen.getByText('Tablet')).toBeInTheDocument();
  });

  it('should apply formatting functions to cell values', () => {
    render(<SortableTable data={mockData} columns={columns} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });

  it('should sort data when column header is clicked', () => {
    render(<SortableTable data={mockData} columns={columns} />);

    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    fireEvent.click(nameHeader);

    // After first click on new column, should sort descending (default)
    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(rows[0]).toHaveTextContent('Tablet');
    expect(rows[1]).toHaveTextContent('Mobile');
    expect(rows[2]).toHaveTextContent('Desktop');
  });

  it('should toggle sort direction on repeated clicks', () => {
    render(<SortableTable data={mockData} columns={columns} />);

    const countHeader = screen.getByRole('columnheader', { name: /count/i });

    // First click - descending (default for new column)
    fireEvent.click(countHeader);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Desktop');
    expect(rows[0]).toHaveTextContent('100');

    // Second click - ascending
    fireEvent.click(countHeader);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Tablet');
    expect(rows[0]).toHaveTextContent('20');
  });

  it('should display sort indicators on headers', () => {
    render(
      <SortableTable
        data={mockData}
        columns={columns}
        defaultSort={{ column: 'count', direction: 'desc' }}
      />
    );

    const countHeader = screen.getByRole('columnheader', { name: /count/i });
    expect(countHeader).toHaveTextContent('↓'); // Descending indicator
  });

  it('should handle keyboard navigation on sortable headers', () => {
    render(<SortableTable data={mockData} columns={columns} />);

    const nameHeader = screen.getByRole('columnheader', { name: /name/i });

    // Press Enter key
    fireEvent.keyDown(nameHeader, { key: 'Enter', code: 'Enter' });
    expect(nameHeader).toHaveAttribute('aria-sort');

    // Press Space key
    fireEvent.keyDown(nameHeader, { key: ' ', code: 'Space' });
    expect(nameHeader).toHaveAttribute('aria-sort');
  });

  it('should set correct ARIA attributes for sorting', () => {
    render(
      <SortableTable
        data={mockData}
        columns={columns}
        defaultSort={{ column: 'count', direction: 'desc' }}
      />
    );

    const countHeader = screen.getByRole('columnheader', { name: /count/i });
    expect(countHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('should display empty state message when no data', () => {
    render(<SortableTable data={[]} columns={columns} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should handle null values in sorting', () => {
    const dataWithNulls = [
      { name: 'A', count: 100, percentage: 50 },
      { name: 'B', count: null, percentage: 30 },
      { name: 'C', count: 80, percentage: 20 },
    ];

    // Updated columns with null-safe formatting
    const columnsWithNullHandling: ColumnConfig[] = [
      { key: 'name', label: 'Name', sortable: true, align: 'left' },
      {
        key: 'count',
        label: 'Count',
        sortable: true,
        align: 'right',
        format: (val: unknown) => (val != null && typeof val === 'number' ? val.toLocaleString('en-US') : '-'),
      },
      {
        key: 'percentage',
        label: 'Percentage',
        sortable: true,
        align: 'right',
        format: (val: unknown) => (val != null && typeof val === 'number' ? `${val.toFixed(1)}%` : '-'),
      },
    ];

    render(<SortableTable data={dataWithNulls} columns={columnsWithNullHandling} />);

    const countHeader = screen.getByRole('columnheader', { name: /count/i });
    fireEvent.click(countHeader);

    // Null values should be sorted to the end
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[2]).toHaveTextContent('B');
  });
});
