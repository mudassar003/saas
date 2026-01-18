'use client';

import { useMemo } from 'react';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useAdminTable } from '@/hooks/use-admin-table';
import { TableHeaderControls } from './table-header-controls';
import { TableResizeHandle } from './table-resize-handle';
import { TableSortHeader } from './table-sort-header';
import { ExportButton } from './export-button';
import { ExportColumn, formatters } from '@/lib/export-utils';

interface MerchantData {
  merchant_id: number;
  environment: string;
  is_active: boolean;
  created_at: string;
}

interface MerchantTableProps {
  merchants: MerchantData[];
  loading: boolean;
  onRefresh: () => void;
}

const STORAGE_KEY = 'admin-merchant-table-preferences';

export function MerchantTable({ merchants, loading, onRefresh }: MerchantTableProps): React.JSX.Element {
  // Define columns
  const columns = useMemo<ColumnDef<MerchantData>[]>(
    () => [
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
            : environment.toLowerCase() === 'staging'
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
    ],
    []
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
    data: merchants,
    columns,
    storageKey: STORAGE_KEY,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading merchants...
        </div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No merchants found</p>
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

  // Export columns definition
  const exportColumns: ExportColumn<MerchantData>[] = [
    { header: 'Merchant ID', accessor: 'merchant_id' },
    { header: 'Environment', accessor: 'environment' },
    { header: 'Status', accessor: (row) => row.is_active ? 'Active' : 'Inactive' },
    { header: 'Created', accessor: 'created_at', formatter: formatters.dateTime },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Header Controls */}
      <TableHeaderControls
        table={table}
        recordCount={merchants.length}
        recordLabel="merchant"
      >
        <ExportButton
          data={merchants}
          columns={exportColumns}
          filename="merchants"
        />
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
