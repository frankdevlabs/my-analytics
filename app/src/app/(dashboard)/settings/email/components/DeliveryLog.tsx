/**
 * Delivery Log Component
 * Displays email delivery history with pagination
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailLog {
  id: string;
  emailType: string;
  recipientEmail: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
  errorMessage: string | null;
}

interface DeliveryLogResponse {
  logs: EmailLog[];
  total: number;
  page: number;
  limit: number;
}

export function DeliveryLog() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeliveryLogResponse | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadLogs(page);
  }, [page]);

  async function loadLogs(pageNum: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/email/delivery-log?page=${pageNum}&limit=${limit}`);
      if (res.ok) {
        const logData = await res.json();
        setData(logData);
      } else {
        console.error('Failed to load delivery log');
      }
    } catch (error) {
      console.error('Failed to load delivery log:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatEmailType(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const hasLogs = data && data.logs.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery History</CardTitle>
        <CardDescription>
          Recent email delivery status and history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !hasLogs ? (
          <div className="text-center py-8 text-text-secondary">
            <p>No emails sent yet</p>
            <p className="text-sm mt-2">
              Emails will appear here once reports or alerts are sent
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {formatEmailType(log.emailType)}
                      </TableCell>
                      <TableCell>{log.recipientEmail}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(log.sentAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === 'SENT' ? 'default' : 'destructive'}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.errorMessage ? (
                          <span
                            className="text-sm text-red-600 dark:text-red-400"
                            title={log.errorMessage}
                          >
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-text-secondary">
                  Page {page} of {totalPages} ({data!.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
