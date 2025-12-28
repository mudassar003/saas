'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRequireSuperAdmin } from '@/lib/auth';
import { Activity, Trash2 } from 'lucide-react';
import { getRecentLogs, clearLogs, ActivityLog } from '@/lib/activity-logger';
import { formatDateTime } from '@/lib/utils';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { useAdminTable } from '@/hooks/use-admin-table';
import { TableHeaderControls } from '@/components/admin/table-header-controls';
import { TableResizeHandle } from '@/components/admin/table-resize-handle';
import { TableSortHeader } from '@/components/admin/table-sort-header';
import { ExportButton } from '@/components/admin/export-button';
import { ExportColumn, formatters } from '@/lib/export-utils';

const STORAGE_KEY = 'admin-activity-table-preferences';

export default function AdminActivityPage(): React.JSX.Element {
  const auth = useRequireSuperAdmin();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    try {
      const recentLogs = getRecentLogs(500);
      setLogs(recentLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      loadLogs();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  const handleClearLogs = () => {
    if (
      confirm(
        'Are you sure you want to clear all activity logs? This action cannot be undone.'
      )
    ) {
      clearLogs();
      setLogs([]);
    }
  };

  // Define columns
  const columns = useMemo<ColumnDef<ActivityLog>[]>(
    () => [
      {
        id: 'timestamp',
        accessorKey: 'timestamp',
        header: 'Timestamp',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
      {
        id: 'userEmail',
        accessorKey: 'userEmail',
        header: 'User',
        size: 220,
        minSize: 180,
        maxSize: 300,
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue() as string}</span>
        ),
      },
      {
        id: 'action',
        accessorKey: 'action',
        header: 'Action',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue }) => {
          const action = getValue() as string;
          const colorMap: Record<string, string> = {
            create: 'text-green-600 dark:text-green-400',
            update: 'text-blue-600 dark:text-blue-400',
            delete: 'text-red-600 dark:text-red-400',
            view: 'text-gray-600 dark:text-gray-400',
            export: 'text-purple-600 dark:text-purple-400',
          };
          return (
            <span className={`font-medium capitalize ${colorMap[action] || ''}`}>
              {action.replace('_', ' ')}
            </span>
          );
        },
      },
      {
        id: 'resource',
        accessorKey: 'resource',
        header: 'Resource',
        size: 140,
        minSize: 120,
        maxSize: 180,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground capitalize">
            {(getValue() as string).replace('_', ' ')}
          </span>
        ),
      },
      {
        id: 'resourceId',
        accessorKey: 'resourceId',
        header: 'Resource ID',
        size: 140,
        minSize: 100,
        maxSize: 200,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className="text-sm text-muted-foreground font-mono">
              {value ? String(value) : '-'}
            </span>
          );
        },
      },
      {
        id: 'details',
        accessorKey: 'details',
        header: 'Details',
        size: 300,
        minSize: 200,
        maxSize: 500,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className="text-sm text-muted-foreground truncate block">
              {value ? String(value) : '-'}
            </span>
          );
        },
      },
    ],
    []
  );

  // Use admin table hook
  const { table, showLeftShadow, showRightShadow, scrollContainerRef, handleScroll, handleKeyDown } =
    useAdminTable({
      data: logs,
      columns,
      storageKey: STORAGE_KEY,
    });

  // Export columns definition
  const exportColumns: ExportColumn<ActivityLog>[] = [
    { header: 'Timestamp', accessor: 'timestamp', formatter: formatters.dateTime },
    { header: 'User Email', accessor: 'userEmail' },
    { header: 'Action', accessor: 'action' },
    { header: 'Resource', accessor: 'resource' },
    { header: 'Resource ID', accessor: (row) => row.resourceId || '' },
    { header: 'Details', accessor: (row) => row.details || '' },
  ];

  if (auth.isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-spin" />
          Loading activity logs...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track and audit administrative actions
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleClearLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Clear Logs
        </Button>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            {logs.length > 0
              ? `Showing ${logs.length} recent activities`
              : 'No activity logs found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs to display
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Controls */}
              <TableHeaderControls
                table={table}
                recordCount={logs.length}
                recordLabel="log"
              >
                <ExportButton
                  data={logs}
                  columns={exportColumns}
                  filename="activity_logs"
                />
              </TableHeaderControls>

              {/* Table Container */}
              <div className="relative border rounded-lg overflow-hidden">
                {/* Scroll Shadows */}
                {showLeftShadow && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
                )}
                {showRightShadow && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
                )}

                {/* Scrollable Table */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  className="overflow-x-auto focus:outline-none"
                  style={{
                    maxHeight: '70vh',
                    willChange: 'scroll-position',
                  }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="sticky top-0 z-20 bg-muted shadow-sm border-r border-border/50 last:border-r-0 px-4 py-3 text-left text-sm font-semibold text-muted-foreground"
                              style={{
                                width: header.getSize(),
                                position: 'relative',
                                willChange: 'transform',
                                transform: 'translateZ(0)',
                                contain: 'layout style paint',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <TableSortHeader column={header.column}>
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </TableSortHeader>
                              </div>
                              {header.column.getCanResize() && (
                                <TableResizeHandle header={header} />
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody style={{ contain: 'layout style paint' }}>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="border-r border-border/30 last:border-r-0 px-4 py-3 text-sm"
                              style={{
                                width: cell.column.getSize(),
                              }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
