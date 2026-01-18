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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Users, CheckCircle2, XCircle, Clock, Settings2, GripVertical, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';

// Patient census record type - enterprise-grade typing
interface PatientCensusRecord {
  id: string;
  customer_name: string;
  product_name: string | null;
  product_category: string | null;
  membership_status: string;
  amount: number;
  last_payment_date: string;
  transaction_count: number;
  source: string | null;
  fulfillment_type: string | null;
  google_review_submitted: boolean | null;
  referral_source: string | null;
  ordered_by_provider: boolean | null;
  ordered_by_provider_at: string | null;
  created_at: string;
}

interface CensusTableProps {
  patients: PatientCensusRecord[];
  loading: boolean;
}

// localStorage key for table preferences
const STORAGE_KEY = 'census-table-preferences';

// Status badge configuration
const getStatusBadge = (status: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactElement } => {
  switch (status.toLowerCase()) {
    case 'active':
      return {
        variant: 'default' as const,
        icon: <CheckCircle2 className="w-3 h-3" />
      };
    case 'paused':
      return {
        variant: 'secondary' as const,
        icon: <Clock className="w-3 h-3" />
      };
    case 'canceled':
    case 'cancelled':
      return {
        variant: 'destructive' as const,
        icon: <XCircle className="w-3 h-3" />
      };
    default:
      return {
        variant: 'outline' as const,
        icon: <Clock className="w-3 h-3" />
      };
  }
};

// Category badge color mapping
const getCategoryColor = (category: string | null): string => {
  if (!category) return 'bg-muted text-muted-foreground';

  switch (category) {
    case 'TRT':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Weight Loss':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Peptides':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'ED':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    case 'Other':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function CensusTable({ patients, loading }: CensusTableProps) {
  const [updatingCategory, setUpdatingCategory] = useState<Set<string>>(new Set());
  const [updatingMembership, setUpdatingMembership] = useState<Set<string>>(new Set());
  const [updatingGoogleReview, setUpdatingGoogleReview] = useState<Set<string>>(new Set());
  const [updatingReferralSource, setUpdatingReferralSource] = useState<Set<string>>(new Set());

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

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      visibility: columnVisibility,
      sizing: columnSizing,
      sorting: sorting,
    }));
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
  }, [patients]);

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

  // Update handlers
  const handleCategoryUpdate = async (patientId: string, newCategory: string): Promise<void> => {
    setUpdatingCategory(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_category: newCategory })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setUpdatingCategory(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  const handleMembershipUpdate = async (patientId: string, newStatus: string): Promise<void> => {
    setUpdatingMembership(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
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
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  const handleGoogleReviewUpdate = async (patientId: string, newValue: boolean): Promise<void> => {
    setUpdatingGoogleReview(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_review_submitted: newValue })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating Google review status:', error);
    } finally {
      setUpdatingGoogleReview(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  const handleReferralSourceUpdate = async (patientId: string, newSource: string): Promise<void> => {
    setUpdatingReferralSource(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_source: newSource })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating referral source:', error);
    } finally {
      setUpdatingReferralSource(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  // Column definitions
  const columns = useMemo<ColumnDef<PatientCensusRecord>[]>(
    () => [
      {
        id: 'patient',
        accessorKey: 'customer_name',
        header: 'Patient',
        size: 200,
        minSize: 150,
        maxSize: 350,
        cell: ({ getValue, row }) => (
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-foreground font-medium truncate" title={getValue() as string}>
              {getValue() as string}
            </span>
            {row.original.referral_source && (
              <span className="text-xs text-muted-foreground truncate">
                via {(row.original.referral_source as string).replace('_', ' ')}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'product',
        accessorKey: 'product_name',
        header: 'Product/Medication',
        size: 220,
        minSize: 150,
        maxSize: 400,
        cell: ({ getValue, row }) => {
          const value = (getValue() as string) || 'No Product';
          return (
            <div className="flex flex-col min-w-0">
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
              {row.original.fulfillment_type && (
                <span className="text-xs text-muted-foreground truncate">
                  {(row.original.fulfillment_type as string).replace('_', ' ')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'category',
        accessorKey: 'product_category',
        header: 'Category',
        size: 160,
        minSize: 130,
        maxSize: 200,
        cell: ({ getValue, row }) => {
          const category = getValue() as string | null;
          const categoryColor = getCategoryColor(category);
          const isCategoryUpdating = updatingCategory.has(row.original.id);

          return (
            <select
              value={category || 'Uncategorized'}
              onChange={(e) => handleCategoryUpdate(row.original.id, e.target.value)}
              disabled={isCategoryUpdating}
              className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded-full cursor-pointer disabled:opacity-50 ${categoryColor}`}
            >
              <option value="TRT" className="text-foreground bg-background">TRT</option>
              <option value="Weight Loss" className="text-foreground bg-background">Weight Loss</option>
              <option value="Peptides" className="text-foreground bg-background">Peptides</option>
              <option value="ED" className="text-foreground bg-background">ED</option>
              <option value="Other" className="text-foreground bg-background">Other</option>
              <option value="Uncategorized" className="text-foreground bg-background">Uncategorized</option>
            </select>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'membership_status',
        header: 'Status',
        size: 140,
        minSize: 120,
        maxSize: 180,
        cell: ({ getValue, row }) => {
          const status = getValue() as string;
          const statusBadge = getStatusBadge(status);
          const isMembershipUpdating = updatingMembership.has(row.original.id);

          return (
            <div className="flex flex-col gap-1">
              <select
                value={status}
                onChange={(e) => handleMembershipUpdate(row.original.id, e.target.value)}
                disabled={isMembershipUpdating}
                className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded cursor-pointer disabled:opacity-50 ${
                  statusBadge.variant === 'default'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : statusBadge.variant === 'secondary'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                <option value="active" className="text-foreground bg-background">Active</option>
                <option value="paused" className="text-foreground bg-background">Paused</option>
                <option value="canceled" className="text-foreground bg-background">Canceled</option>
              </select>
              {row.original.google_review_submitted && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓ Google Review
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue }) => (
          <div className="text-right font-medium text-foreground">
            ${(getValue() as number).toFixed(2)}
          </div>
        ),
      },
      {
        id: 'last_payment',
        accessorKey: 'last_payment_date',
        header: 'Last Payment',
        size: 160,
        minSize: 140,
        maxSize: 200,
        cell: ({ getValue }) => {
          const dateString = getValue() as string;
          const timezone = 'America/Chicago';
          return (
            <div className="flex flex-col">
              <span className="text-sm text-foreground">
                {formatInTimeZone(dateString, timezone, 'MMM d, yyyy')}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatInTimeZone(dateString, timezone, 'h:mm a')} CST
              </span>
            </div>
          );
        },
      },
      {
        id: 'transaction_count',
        accessorKey: 'transaction_count',
        header: 'Transactions',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue }) => (
          <div className="text-center">
            <Badge variant="outline" className="font-mono">
              {getValue() as number}
            </Badge>
          </div>
        ),
      },
      {
        id: 'referral_source',
        accessorKey: 'referral_source',
        header: 'Referral Source',
        size: 160,
        minSize: 130,
        maxSize: 200,
        cell: ({ getValue, row }) => {
          const referralSource = getValue() as string | null;
          const isReferralSourceUpdating = updatingReferralSource.has(row.original.id);

          return (
            <select
              value={referralSource || 'other'}
              onChange={(e) => handleReferralSourceUpdate(row.original.id, e.target.value)}
              disabled={isReferralSourceUpdating}
              className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded cursor-pointer disabled:opacity-50 ${
                referralSource === 'online'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : referralSource === 'refer_a_friend'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <option value="online" className="text-foreground bg-background">Online</option>
              <option value="refer_a_friend" className="text-foreground bg-background">Refer a Friend</option>
              <option value="other" className="text-foreground bg-background">Other</option>
            </select>
          );
        },
      },
      {
        id: 'google_review',
        accessorKey: 'google_review_submitted',
        header: 'Google Review',
        size: 140,
        minSize: 120,
        maxSize: 180,
        cell: ({ getValue, row }) => {
          const googleReview = getValue() as boolean | null;
          const isGoogleReviewUpdating = updatingGoogleReview.has(row.original.id);

          return (
            <div className="text-center">
              <select
                value={googleReview ? 'true' : 'false'}
                onChange={(e) => handleGoogleReviewUpdate(row.original.id, e.target.value === 'true')}
                disabled={isGoogleReviewUpdating}
                className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded cursor-pointer disabled:opacity-50 ${
                  googleReview
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                <option value="true" className="text-foreground bg-background">✓ Yes</option>
                <option value="false" className="text-foreground bg-background">✗ No</option>
              </select>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        minSize: 80,
        maxSize: 120,
        cell: () => (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="View patient transactions"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [updatingCategory, updatingMembership, updatingGoogleReview, updatingReferralSource]
  );

  // Create table instance
  const table = useReactTable({
    data: patients,
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
      <div className="border border-border rounded-lg">
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-muted-foreground border-t-primary rounded-full"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading patient census...</p>
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="border border-border rounded-lg">
        <div className="p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No patients found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No patients match the current filters. Try adjusting your search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Visibility Controls */}
      <div className="flex items-center justify-between px-2">
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
          aria-label="Patient census table"
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
                        minWidth: header.getSize(),
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
                        minWidth: cell.column.getSize(),
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
