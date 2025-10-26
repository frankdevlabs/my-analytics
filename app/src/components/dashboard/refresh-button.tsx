'use client';

/**
 * RefreshButton Component
 * Client component that triggers server re-fetch using router.refresh().
 * Includes spinning animation and disabled state during refresh.
 *
 * @example
 * ```tsx
 * <RefreshButton />
 * ```
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RefreshButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement>;
export const RefreshButton = React.forwardRef<
  HTMLButtonElement,
  RefreshButtonProps
>(({ className, ...props }, ref) => {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="default"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-label="Refresh dashboard data"
      title="Refresh dashboard data"
      className={cn(
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        className
      )}
      {...props}
    >
      <RefreshCw
        className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
        aria-hidden="true"
      />
      {isRefreshing && <span className="sr-only">Refreshing dashboard data</span>}
    </Button>
  );
});

RefreshButton.displayName = 'RefreshButton';
