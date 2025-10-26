/**
 * Dashboard Data Types
 * TypeScript interfaces for dashboard metrics and data structures
 */

/**
 * Result type for Promise.allSettled operations
 * Used to handle partial data failures gracefully
 */
export type MetricResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: Error };

/**
 * Dashboard metrics data structure
 * Contains all analytics data displayed on the dashboard
 */
export interface DashboardMetrics {
  totalPageviews: number | null;
  uniqueVisitors: number | null;
  topPages: Array<{
    path: string;
    pageviews: number;
    uniqueVisitors: number;
  }>;
  dateRange: {
    from: string; // YYYY-MM-DD format
    to: string; // YYYY-MM-DD format
  };
}

/**
 * Dashboard error types
 * Used to track which specific metric failed to load
 */
export interface DashboardError {
  metric: 'pageviews' | 'visitors' | 'topPages';
  message: string;
}

/**
 * Top page data structure
 * Represents a single page's analytics data
 */
export interface TopPageData {
  path: string;
  pageviews: number;
  uniqueVisitors: number;
}

/**
 * Date range for dashboard queries
 */
export interface DateRange {
  from: string; // YYYY-MM-DD format
  to: string; // YYYY-MM-DD format
}
