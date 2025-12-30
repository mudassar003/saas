'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  ColumnResizeMode,
  VisibilityState,
  SortingState,
} from '@tanstack/react-table';
import { type ContractStatus } from '@/types/contract';
import { ContractStatusBadge } from './contract-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Settings2, GripVertical, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Contract } from '@/types/contract';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ContractTableProps {
  contracts: Contract[];
  onViewContract: (contractId: number) => void;
  loading?: boolean;
}

// localStorage key for table preferences
const STORAGE_KEY = 'contract-table-preferences';

export function ContractTable({
  contracts,
  onViewContract,
  loading = false
}: ContractTableProps) {
  // TanStack Table state
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);

  // Scroll state for indicators
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { visibility, sizing, sorting: savedSorting } = JSON.parse(saved);
        if (visibility) setColumnVisibility(visibility);
        if (sizing) setColumnSizing(sizing);
        if (savedSorting) setSorting(savedSorting);
      } catch (e) {
        console.error('Failed to parse saved table preferences:', e);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0 || Object.keys(columnSizing).length > 0 || sorting.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        visibility: columnVisibility,
        sizing: columnSizing,
        sorting: sorting,
      }));
    }
  }, [columnVisibility, columnSizing, sorting]);

  // Handle scroll for indicators
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll();
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [contracts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      container.scrollLeft -= scrollAmount;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      container.scrollLeft += scrollAmount;
    }
  };

  // Column definitions
  const columns = useMemo<ColumnDef<Contract>[]>(
    () => [
      {
        id: 'contract_id',
        accessorKey: 'mx_contract_id',
        header: 'Contract ID',
        size: 140,
        minSize: 100,
        maxSize: 180,
        cell: ({ getValue }) => (
          <span className="text-sm font-mono text-muted-foreground">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: 'contract_number',
        accessorKey: 'contract_name',
        header: 'Contract #',
        size: 140,
        minSize: 100,
        maxSize: 200,
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold text-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'customer',
        accessorKey: 'customer_name',
        header: 'Customer',
        size: 200,
        minSize: 150,
        maxSize: 300,
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span
              className="text-sm font-medium text-foreground truncate block"
              title={value}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }}
            >
              {value}
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue }) => {
          const status = getValue() as ContractStatus;
          return <ContractStatusBadge status={status} />;
        },
        sortingFn: (rowA, rowB, columnId) => {
          // Custom sort order: Active → Completed → Cancelled → Inactive → Deleted
          const statusOrder: Record<string, number> = {
            'Active': 1,
            'Completed': 2,
            'Cancelled': 3,
            'Inactive': 4,
            'Deleted': 5
          };

          const statusA = rowA.getValue(columnId) as string;
          const statusB = rowB.getValue(columnId) as string;

          const orderA = statusOrder[statusA] || 999;
          const orderB = statusOrder[statusB] || 999;

          return orderA - orderB;
        },
      },
      {
        id: 'frequency',
        accessorKey: 'billing_interval',
        header: 'Frequency',
        size: 160,
        minSize: 130,
        maxSize: 200,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.billing_interval} - {row.original.billing_frequency}
          </span>
        ),
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue, row }) => (
          <div className="text-right">
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(getValue() as number, row.original.currency_code || 'USD')}
            </span>
          </div>
        ),
      },
      {
        id: 'next_bill',
        accessorKey: 'next_bill_date',
        header: 'Next Bill',
        size: 140,
        minSize: 120,
        maxSize: 180,
        cell: ({ getValue }) => {
          const date = getValue() as string | null;
          return (
            <span className="text-sm text-muted-foreground">
              {date ? formatDate(date) : 'N/A'}
            </span>
          );
        },
      },
      {
        id: 'start_date',
        accessorKey: 'start_date',
        header: 'Start Date',
        size: 140,
        minSize: 120,
        maxSize: 180,
        cell: ({ getValue }) => {
          const date = getValue() as string | null;
          return (
            <span className="text-sm text-muted-foreground">
              {date ? formatDate(date) : 'N/A'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        minSize: 80,
        maxSize: 120,
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewContract(row.original.mx_contract_id)}
              className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
              title="View contract details"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View contract</span>
            </Button>
          </div>
        ),
      },
    ],
    [onViewContract]
  );

  // Create table instance
  const table = useReactTable({
    data: contracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    enableSorting: true,
    columnResizeMode,
    state: {
      columnVisibility,
      columnSizing,
      sorting,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
  });

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="border border-border rounded-lg">
        <div className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No contracts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No contracts match the current filters. Try adjusting your search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Column Visibility Controls - Matching Transactions Page */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setColumnVisibility({});
              setColumnSizing({});
              setSorting([]);
              localStorage.removeItem(STORAGE_KEY);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset All
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {table.getVisibleLeafColumns().length} of {table.getAllLeafColumns().length} columns visible
        </div>
      </div>

      {/* Table Container with Scroll Indicators */}
      <div className="relative border border-border rounded-lg overflow-hidden">
        {showLeftShadow && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
        )}
        {showRightShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-thin"
          style={{
            maxHeight: '70vh',
            willChange: 'scroll-position',
            overflowY: 'auto',
          }}
          tabIndex={0}
          role="region"
          aria-label="Contract table"
          onKeyDown={handleKeyDown}
        >
          <table className="w-full" style={{ tableLayout: 'fixed', width: table.getTotalSize() }}>
            <thead
              className="sticky top-0 z-20 bg-muted shadow-sm"
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
                contain: 'layout style paint',
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b-2 border-border">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        position: 'relative',
                      }}
                      className="px-4 py-3 text-left text-xs font-semibold text-foreground border-r border-border/50 last:border-r-0"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex items-center gap-2 cursor-pointer select-none hover:text-primary transition-colors'
                              : 'flex items-center gap-2'
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="inline-flex">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-primary" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Resize Handle */}
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none transition-all ${
                          header.column.getIsResizing()
                            ? 'bg-primary w-2 opacity-100'
                            : 'bg-transparent hover:bg-primary/30 hover:w-2'
                        }`}
                        style={{
                          userSelect: 'none',
                        }}
                      >
                        {header.column.getIsResizing() && (
                          <GripVertical className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody style={{ contain: 'layout style paint' }}>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm border-r border-border/30 last:border-r-0"
                      style={{
                        width: cell.column.getSize(),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyboard Navigation Hint */}
      <div className="text-xs text-muted-foreground text-center">
        Use arrow keys (← →) to scroll horizontally • Drag column borders to resize
      </div>
    </div>
  );
}
