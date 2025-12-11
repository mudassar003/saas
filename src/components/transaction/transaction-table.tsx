'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import { Eye, ExternalLink, Settings2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataSentButtons } from '@/components/invoice/data-sent-buttons';
import { DataSentUpdate } from '@/types/invoice';
import {
  formatCurrency,
  formatDate,
  formatDateTime
} from '@/lib/utils';

interface Transaction {
  id: string;
  mx_payment_id: number;
  amount: number;
  transaction_date: string;
  status: string;
  mx_invoice_number?: number;
  customer_name?: string;
  auth_code?: string;
  reference_number?: string;
  card_type?: string;
  card_last4?: string;
  transaction_type?: string;
  source?: string;
  product_name?: string;
  product_category?: string;
  membership_status?: string;
  fulfillment_type?: string;
  google_review_submitted?: boolean;
  referral_source?: string;
  created_at: string;
  ordered_by_provider?: boolean;
  ordered_by_provider_at?: string;
  invoice?: {
    id: string;
    mx_invoice_id: number;
    invoice_number: number;
    customer_name?: string;
    total_amount: number;
    invoice_date?: string;
    data_sent_status?: string;
    ordered_by_provider_at?: string;
  } | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdateDataSent?: (update: DataSentUpdate) => void;
  loading?: boolean;
}

const STORAGE_KEY = 'transaction-table-preferences';

export function TransactionTable({
  transactions,
  onUpdateDataSent,
  loading = false
}: TransactionTableProps) {
  const [updatingRecords, setUpdatingRecords] = useState<Set<string>>(new Set());
  const [updatingMembership, setUpdatingMembership] = useState<Set<string>>(new Set());
  const [updatingCategory, setUpdatingCategory] = useState<Set<string>>(new Set());
  const [updatingFulfillment, setUpdatingFulfillment] = useState<Set<string>>(new Set());
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { visibility, sizing } = JSON.parse(saved);
        if (visibility) setColumnVisibility(visibility);
        if (sizing) setColumnSizing(sizing);
      } catch (error) {
        console.error('Failed to load table preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      visibility: columnVisibility,
      sizing: columnSizing,
    }));
  }, [columnVisibility, columnSizing]);

  // Handle scroll to show/hide shadows
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Check scroll on mount and when data changes
  useEffect(() => {
    handleScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [transactions]);

  // Keyboard navigation for horizontal scrolling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200; // pixels to scroll

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      container.scrollLeft -= scrollAmount;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      container.scrollLeft += scrollAmount;
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault();
      container.scrollLeft = 0;
    } else if (e.key === 'End' && e.ctrlKey) {
      e.preventDefault();
      container.scrollLeft = container.scrollWidth;
    }
  };

  const handleUpdateDataSent = async (update: DataSentUpdate) => {
    if (!onUpdateDataSent) return;

    const recordId = update.invoice_id || update.transaction_id || '';
    setUpdatingRecords(prev => new Set(prev).add(recordId));
    try {
      await onUpdateDataSent(update);
    } catch (error) {
      console.error('Failed to update data sent status:', error);
    } finally {
      setUpdatingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handleViewTransaction = (transactionId: string) => {
    window.location.href = `/transactions/${transactionId}`;
  };

  const handleMembershipUpdate = async (transactionId: string, newStatus: string) => {
    setUpdatingMembership(prev => new Set(prev).add(transactionId));
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_status: newStatus })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating membership status:', error);
    } finally {
      setUpdatingMembership(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleCategoryUpdate = async (transactionId: string, newCategory: string) => {
    setUpdatingCategory(prev => new Set(prev).add(transactionId));
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_category: newCategory })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating product category:', error);
    } finally {
      setUpdatingCategory(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleFulfillmentUpdate = async (transactionId: string, newFulfillment: string) => {
    setUpdatingFulfillment(prev => new Set(prev).add(transactionId));
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillment_type: newFulfillment })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating fulfillment type:', error);
    } finally {
      setUpdatingFulfillment(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'settled':
        return 'bg-info/10 text-info border-info/20';
      case 'declined':
        return 'bg-error/10 text-error border-error/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TRT':
        return 'bg-info/10 text-info border-info/20';
      case 'Weight Loss':
        return 'bg-success/10 text-success border-success/20';
      case 'Peptides':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'ED':
        return 'bg-error/10 text-error border-error/20';
      case 'Other':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'canceled':
        return 'bg-error/10 text-error border-error/20';
      case 'paused':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getFulfillmentColor = (fulfillment: string) => {
    switch (fulfillment?.toLowerCase()) {
      case 'in_office':
        return 'bg-info/10 text-info border-info/20';
      case 'mail_out':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Define columns with TanStack Table
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'transaction_id',
        accessorKey: 'mx_payment_id',
        header: 'Transaction ID',
        size: 160,
        minSize: 100,
        maxSize: 300,
        cell: ({ getValue }) => (
          <span className="text-sm font-mono text-muted-foreground">
            {getValue() as number}
          </span>
        ),
      },
      {
        id: 'patient_name',
        accessorFn: (row) => row.customer_name || row.invoice?.customer_name || 'N/A',
        header: 'Patient Name',
        size: 180,
        minSize: 120,
        maxSize: 300,
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-foreground truncate">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'product',
        accessorKey: 'product_name',
        header: 'Product/Service',
        size: 220,
        minSize: 150,
        maxSize: 400,
        cell: ({ getValue }) => {
          const value = (getValue() as string) || 'N/A';
          return (
            <div className="flex items-center min-w-0">
              <span
                className="text-sm text-foreground truncate block"
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
            </div>
          );
        },
      },
      {
        id: 'category',
        accessorKey: 'product_category',
        header: 'Category',
        size: 130,
        minSize: 110,
        maxSize: 200,
        cell: ({ row, getValue }) => {
          const value = getValue() as string;
          const transaction = row.original;
          return value ? (
            <select
              value={value}
              onChange={(e) => handleCategoryUpdate(transaction.id, e.target.value)}
              disabled={updatingCategory.has(transaction.id)}
              className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getCategoryColor(value)}`}
            >
              <option value="TRT">TRT</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Peptides">Peptides</option>
              <option value="ED">ED</option>
              <option value="Other">Other</option>
              <option value="Uncategorized">Uncategorized</option>
            </select>
          ) : (
            <select
              value="Uncategorized"
              onChange={(e) => handleCategoryUpdate(transaction.id, e.target.value)}
              disabled={updatingCategory.has(transaction.id)}
              className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getCategoryColor('Uncategorized')}`}
            >
              <option value="TRT">TRT</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Peptides">Peptides</option>
              <option value="ED">ED</option>
              <option value="Other">Other</option>
              <option value="Uncategorized">Uncategorized</option>
            </select>
          );
        },
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        size: 100,
        minSize: 80,
        maxSize: 150,
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        minSize: 90,
        maxSize: 150,
        cell: ({ getValue }) => {
          const status = getValue() as string;
          return (
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(status)}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'membership',
        accessorKey: 'membership_status',
        header: 'Membership',
        size: 110,
        minSize: 100,
        maxSize: 150,
        cell: ({ row, getValue }) => {
          const value = getValue() as string;
          const transaction = row.original;
          return value ? (
            <select
              value={value}
              onChange={(e) => handleMembershipUpdate(transaction.id, e.target.value)}
              disabled={updatingMembership.has(transaction.id)}
              className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getMembershipStatusColor(value)}`}
            >
              <option value="active">Active</option>
              <option value="canceled">Canceled</option>
              <option value="paused">Paused</option>
            </select>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          );
        },
      },
      {
        id: 'fulfillment',
        accessorKey: 'fulfillment_type',
        header: 'Fulfillment',
        size: 110,
        minSize: 100,
        maxSize: 150,
        cell: ({ row, getValue }) => {
          const value = (getValue() as string) || 'in_office';
          const transaction = row.original;
          return (
            <select
              value={value}
              onChange={(e) => handleFulfillmentUpdate(transaction.id, e.target.value)}
              disabled={updatingFulfillment.has(transaction.id)}
              className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getFulfillmentColor(value)}`}
            >
              <option value="in_office">In Office</option>
              <option value="mail_out">Mail Out</option>
            </select>
          );
        },
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: 'Source',
        size: 100,
        minSize: 80,
        maxSize: 150,
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-muted-foreground">
            {(getValue() as string) || 'N/A'}
          </span>
        ),
      },
      {
        id: 'date',
        accessorKey: 'transaction_date',
        header: 'Date',
        size: 140,
        minSize: 120,
        maxSize: 180,
        cell: ({ getValue }) => {
          const dateString = getValue() as string;
          return (
            <div className="flex flex-col">
              <span className="text-sm text-foreground">
                {formatDate(dateString)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(dateString).split(', ')[1]} CST
              </span>
            </div>
          );
        },
      },
      {
        id: 'provider',
        header: 'Provider',
        size: 100,
        minSize: 90,
        maxSize: 150,
        cell: ({ row }) => {
          const transaction = row.original;
          return onUpdateDataSent ? (
            transaction.invoice ? (
              <DataSentButtons
                invoiceId={transaction.invoice.id}
                currentStatus={transaction.invoice.data_sent_status as 'pending' | 'yes' | 'no'}
                onUpdateStatus={handleUpdateDataSent}
                disabled={updatingRecords.has(transaction.invoice.id)}
              />
            ) : (
              <DataSentButtons
                transactionId={transaction.id}
                currentStatus={transaction.ordered_by_provider ? 'yes' : 'pending'}
                onUpdateStatus={handleUpdateDataSent}
                disabled={updatingRecords.has(transaction.id)}
              />
            )
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          );
        },
      },
      {
        id: 'ordered_date',
        header: 'Date/Time Ordered',
        size: 160,
        minSize: 140,
        maxSize: 200,
        cell: ({ row }) => {
          const transaction = row.original;
          return (
            <span className="text-xs text-muted-foreground">
              {transaction.invoice?.ordered_by_provider_at
                ? formatDateTime(transaction.invoice.ordered_by_provider_at)
                : transaction.ordered_by_provider_at
                ? formatDateTime(transaction.ordered_by_provider_at)
                : 'N/A'
              }
            </span>
          );
        },
      },
      {
        id: 'invoice',
        header: 'Invoice',
        size: 90,
        minSize: 70,
        maxSize: 120,
        cell: ({ row }) => {
          const transaction = row.original;
          return transaction.invoice?.mx_invoice_id ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = `/dashboard/invoices/${transaction.invoice!.mx_invoice_id}`}
              className="h-8 w-8 p-0 hover:bg-accent"
              title="View Invoice Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
          ) : null;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 90,
        minSize: 70,
        maxSize: 120,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewTransaction(row.original.id)}
            className="h-8 w-8 p-0 hover:bg-accent"
            title="View Transaction Details"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onUpdateDataSent, updatingRecords, updatingMembership, updatingCategory, updatingFulfillment]
  );

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode,
    state: {
      columnVisibility,
      columnSizing,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Column Visibility Toggle */}
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
              localStorage.removeItem(STORAGE_KEY);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Columns
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {table.getVisibleLeafColumns().length} of {table.getAllLeafColumns().length} columns visible
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden relative">
        {/* Scroll Indicators */}
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
          aria-label="Transaction table"
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
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {/* Resize Handle - More Visible */}
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
                          touchAction: 'none',
                        }}
                      >
                        {header.column.getIsResizing() && (
                          <GripVertical className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-foreground" />
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
                  className="border-b border-border hover:bg-accent/5 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      className="px-4 py-3 border-r border-border/30 last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll Hint */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>💡 Tip:</span>
            <span>Use arrow keys (← →) or drag to scroll horizontally. Header stays visible when scrolling down.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
