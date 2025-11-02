/**
 * SortableTable Component
 *
 * Reusable table component with client-side sorting functionality.
 * Provides sortable column headers with visual indicators and keyboard navigation.
 * Used for displaying analytics data with user-controlled sort order.
 *
 * @example
 * ```tsx
 * const columns: ColumnConfig[] = [
 *   { key: 'name', label: 'Name', sortable: true, align: 'left' },
 *   { key: 'count', label: 'Count', sortable: true, align: 'right' },
 *   { key: 'percentage', label: 'Percentage', sortable: true, align: 'right',
 *     format: (val) => `${val.toFixed(1)}%` }
 * ];
 *
 * <SortableTable
 *   data={data}
 *   columns={columns}
 *   defaultSort={{ column: 'count', direction: 'desc' }}
 * />
 * ```
 */

'use client';

import * as React from 'react';

export interface ColumnConfig {
  /** Key to access data property */
  key: string;
  /** Column header label */
  label: string;
  /** Whether column is sortable */
  sortable: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Optional formatting function for cell values */
  format?: (value: unknown) => string;
}

export interface SortableTableProps {
  /** Array of data objects to display */
  data: Array<Record<string, unknown>>;
  /** Column configuration array */
  columns: ColumnConfig[];
  /** Default sort configuration */
  defaultSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  /** Additional CSS classes */
  className?: string;
}

type SortDirection = 'asc' | 'desc';

/**
 * SortableTable Component
 *
 * Client-side sortable table with accessible keyboard navigation.
 * Handles sorting state internally and provides visual sort indicators.
 */
export function SortableTable({
  data,
  columns,
  defaultSort,
  className = '',
}: SortableTableProps) {
  // Sort state management
  const [sortColumn, setSortColumn] = React.useState<string | null>(
    defaultSort?.column || null
  );
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(
    defaultSort?.direction || 'desc'
  );

  /**
   * Handle column header click to toggle sort
   * If clicking same column, toggle direction; if new column, use descending
   */
  const handleSort = React.useCallback((columnKey: string) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === columnKey) {
        // Toggle direction for same column
        setSortDirection((prevDirection) =>
          prevDirection === 'asc' ? 'desc' : 'asc'
        );
        return columnKey;
      } else {
        // New column - default to descending
        setSortDirection('desc');
        return columnKey;
      }
    });
  }, []);

  /**
   * Handle keyboard navigation on sortable headers
   * Enter or Space triggers sort
   */
  const handleKeyDown = React.useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    columnKey: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSort(columnKey);
    }
  }, [handleSort]);

  /**
   * Sort data based on current sort column and direction
   */
  const sortedData = React.useMemo(() => {
    if (!sortColumn) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  /**
   * Render sort indicator arrow
   */
  const renderSortIndicator = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <span className="text-foreground/30 ml-1" aria-hidden="true">↕</span>;
    }
    return (
      <span className="ml-1" aria-hidden="true">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  /**
   * Get alignment class for column
   */
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div
      className={`overflow-x-auto ${className}`}
      role="region"
      aria-label="Sortable data table"
      tabIndex={0}
    >
      <table className="w-full min-w-[500px]" aria-label="Analytics data table">
        <thead>
          <tr className="border-b border-foreground/10">
            {columns.map((column) => {
              const isCurrentSort = sortColumn === column.key;
              const alignClass = getAlignClass(column.align);

              if (column.sortable) {
                return (
                  <th
                    key={column.key}
                    className={`py-2 px-4 font-body text-sm font-semibold min-w-[120px] ${alignClass}`}
                    scope="col"
                    aria-sort={
                      isCurrentSort
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="w-full cursor-pointer hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 rounded px-0 py-0 bg-transparent border-none font-body text-sm font-semibold"
                      onClick={() => handleSort(column.key)}
                      onKeyDown={(e) => handleKeyDown(e, column.key)}
                    >
                      <div className={`flex items-center ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {column.label}
                        {renderSortIndicator(column.key)}
                      </div>
                    </button>
                  </th>
                );
              }

              return (
                <th
                  key={column.key}
                  className={`py-2 px-4 font-body text-sm font-semibold min-w-[120px] ${alignClass}`}
                  scope="col"
                >
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-foreground/60"
              >
                No data available
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-foreground/10">
                {columns.map((column) => {
                  const value = row[column.key];
                  const displayValue = column.format
                    ? column.format(value)
                    : String(value ?? '');
                  const alignClass = getAlignClass(column.align);

                  return (
                    <td
                      key={`${rowIndex}-${column.key}`}
                      className={`py-2 px-4 font-body text-base min-w-[120px] ${alignClass}`}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
