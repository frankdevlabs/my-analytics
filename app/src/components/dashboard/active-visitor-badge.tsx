/**
 * Active Visitor Badge Component
 * Displays real-time count of active visitors with polling and pulse animation
 * Polls /api/active-visitors every 10 seconds for fresh data
 */

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';

export function ActiveVisitorBadge() {
  const [count, setCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const fetchActiveVisitors = React.useCallback(async () => {
    try {
      const response = await fetch('/api/active-visitors');
      const data = await response.json();

      if (data.count === null) {
        setError(true);
        setCount(null);
      } else {
        setError(false);
        setCount(data.count);
      }
    } catch {
      setError(true);
      setCount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Fetch immediately on mount
    fetchActiveVisitors();

    // Set up interval for 10-second polling
    const interval = setInterval(fetchActiveVisitors, 10000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchActiveVisitors]);

  // Determine display value based on state
  const displayValue = isLoading ? '...' : error || count === null ? '—' : count;

  // Generate ARIA label based on state
  const ariaLabel = isLoading
    ? 'Active visitors count: loading'
    : error || count === null
    ? 'Active visitors count: unavailable'
    : `Active visitors count: ${count}`;

  return (
    <Badge
      variant="secondary"
      className="animate-pulse-green"
      aria-label={ariaLabel}
      role="status"
      aria-live="polite"
    >
      <span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true" />
      {displayValue}
      <span className="ml-1 text-muted-foreground">active</span>
    </Badge>
  );
}
