'use client';

import { useMemo } from 'react';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Webhook } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useAdminTable } from '@/hooks/use-admin-table';
import { TableHeaderControls } from './table-header-controls';
import { TableResizeHandle } from './table-resize-handle';
import { TableSortHeader } from './table-sort-header';
import { ExportButton } from './export-button';
import { ExportColumn, formatters } from '@/lib/export-utils';

interface TenantData {
  id: string;
  merchant_id: number;
  consumer_key: string;
  consumer_secret: string;
  environment: string;
  webhook_secret: string | null;
  tenant_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantTableProps {
  tenants: TenantData[];
  loading: boolean;
  onRefresh: () => void;
  onManageCategories: (merchantId: number) => void;
  onManageWebhooks: (merchantId: number, tenantName: string | null) => void;
}

const STORAGE_KEY = 'admin-tenant-table-preferences';

const maskSecret = (secret: string): string => {
  if (secret.length <= 8) return '••••••••';
  return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
};

export function TenantTable({
  tenants,
  loading,
  onRefresh,
  onManageCategories,
  onManageWebhooks
}: TenantTableProps): React.JSX.Element {
  // Define columns
  const columns = useMemo<ColumnDef<TenantData>[]>(
    () => [
      {
        id: 'tenant_name',
        accessorKey: 'tenant_name',
        header: 'Tenant Name',
        size: 200,
        minSize: 150,
        maxSize: 300,
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">
            {(getValue() as string | null) || 'Unnamed Tenant'}
          </span>
        ),
      },
      {
        id: 'merchant_id',
        accessorKey: 'merchant_id',
        header: 'Merchant ID',
        size: 140,
        minSize: 100,
        maxSize: 200,
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: 'environment',
        accessorKey: 'environment',
        header: 'Environment',
        size: 140,
        minSize: 120,
        maxSize: 200,
        cell: ({ getValue }) => {
          const environment = getValue() as string;
          const variant = environment.toLowerCase() === 'production'
            ? 'destructive'
            : environment.toLowerCase() === 'sandbox'
            ? 'secondary'
            : 'outline';

          return (
            <Badge variant={variant}>
              {environment}
            </Badge>
          );
        },
      },
      {
        id: 'consumer_key',
        accessorKey: 'consumer_key',
        header: 'Consumer Key',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => (
          <code className="font-mono text-xs text-muted-foreground">
            {maskSecret(getValue() as string)}
          </code>
        ),
      },
      {
        id: 'consumer_secret',
        accessorKey: 'consumer_secret',
        header: 'Consumer Secret',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => (
          <code className="font-mono text-xs text-muted-foreground">
            {maskSecret(getValue() as string)}
          </code>
        ),
      },
      {
        id: 'webhook_secret',
        accessorKey: 'webhook_secret',
        header: 'Webhook Secret',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          return value ? (
            <code className="font-mono text-xs text-muted-foreground">
              {maskSecret(value)}
            </code>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'is_active',
        accessorKey: 'is_active',
        header: 'Status',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue }) => {
          const isActive = getValue() as boolean;
          return (
            <Badge variant={isActive ? 'default' : 'outline'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: 'Created',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 140,
        minSize: 120,
        maxSize: 200,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageCategories(row.original.merchant_id)}
            className="flex items-center gap-1"
          >
            <Settings className="h-3 w-3" />
            Categories
          </Button>
        ),
      },
      {
        id: 'webhooks',
        header: 'Webhooks',
        size: 140,
        minSize: 120,
        maxSize: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageWebhooks(row.original.merchant_id, row.original.tenant_name)}
            className="flex items-center gap-1"
          >
            <Webhook className="h-3 w-3" />
            Webhooks
          </Button>
        ),
      },
    ],
    [onManageCategories, onManageWebhooks]
  );

  // Use admin table hook
  const {
    table,
    showLeftShadow,
    showRightShadow,
    scrollContainerRef,
    handleScroll,
    handleKeyDown,
  } = useAdminTable({
    data: tenants,
    columns,
    storageKey: STORAGE_KEY,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading tenants...
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tenants found</p>
        <Button
          variant="outline"
          onClick={onRefresh}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  // Export columns definition (mask secrets for security)
  const exportColumns: ExportColumn<TenantData>[] = [
    { header: 'Tenant Name', accessor: (row) => row.tenant_name || 'Unnamed Tenant' },
    { header: 'Merchant ID', accessor: 'merchant_id' },
    { header: 'Environment', accessor: 'environment' },
    { header: 'Consumer Key', accessor: (row) => maskSecret(row.consumer_key) },
    { header: 'Status', accessor: (row) => (row.is_active ? 'Active' : 'Inactive') },
    { header: 'Created', accessor: 'created_at', formatter: formatters.dateTime },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Header Controls */}
      <TableHeaderControls
        table={table}
        recordCount={tenants.length}
        recordLabel="tenant"
      >
        <ExportButton data={tenants} columns={exportColumns} filename="tenants" />
      </TableHeaderControls>

      {/* Table Container */}
      <div className="relative border rounded-lg overflow-hidden w-full">
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
                        minWidth: header.getSize(),
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
                        minWidth: cell.column.getSize(),
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
  );
}
