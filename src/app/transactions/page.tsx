'use client';

import { useState, useEffect } from 'react';
import { TransactionTable } from '@/components/transaction/transaction-table';
import { TransactionFilters } from '@/components/transaction/transaction-filters';
import { AutoSyncHeader } from '@/components/sync/auto-sync-header';
import { SyncDialog } from '@/components/sync/sync-dialog';
import { Pagination } from '@/components/ui/pagination';
import { DataSentUpdate } from '@/types/invoice';

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
  created_at: string;
  ordered_by_provider?: boolean;
  ordered_by_provider_at?: string;
  invoices?: {
    id: string;
    invoice_number: number;
    customer_name?: string;
    total_amount: number;
    invoice_date?: string;
    data_sent_status?: string;
    ordered_by_provider_at?: string;
  } | null;
}

interface FilterState {
  search: string;
  status: string;
  showType: string;
  dateRange: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    records: Transaction[];
    recordCount: number;
    totals: {
      grandTotalAmount: string;
    };
    statistics: {
      total: number;
      withInvoices: number;
      standalone: number;
      approved: number;
      settled: number;
      declined: number;
    };
  };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    showType: 'all',
    dateRange: 'all'
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  
  // Statistics state for transactions
  const [statistics, setStatistics] = useState({
    total: 0,
    withInvoices: 0,
    standalone: 0,
    approved: 0,
    settled: 0,
    declined: 0
  });

  // Convert date range filter to actual dates
  const getDateRange = (dateRange: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return {
          start: yearStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      default:
        return { start: undefined, end: undefined };
    }
  };

  // Load transactions from API
  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('limit', pageSize.toString());
        params.append('offset', ((currentPage - 1) * pageSize).toString());
        
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.status !== 'all') {
          params.append('status', filters.status);
        }
        if (filters.showType !== 'all') {
          params.append('showType', filters.showType);
        }
        
        // Add date range filtering
        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.start) {
          params.append('dateStart', dateRange.start);
        }
        if (dateRange.end) {
          params.append('dateEnd', dateRange.end);
        }
        
        // Make API call to transactions endpoint
        const response = await fetch(`/api/transactions?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          setTransactions(result.data.records);
          setTotalCount(result.data.recordCount);
          setTotalPages(Math.ceil(result.data.recordCount / pageSize));
          setStatistics(result.data.statistics);
        } else {
          console.error('API returned error:', result);
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
        // Fallback to empty array on error
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [filters, currentPage, pageSize]); // Reload when filters or pagination change

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);


  const handleUpdateDataSent = async (update: DataSentUpdate) => {
    try {
      const response = await fetch('/api/data-sent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        throw new Error('Failed to update data sent status');
      }

      // Refresh the transaction data to show updated status
      const currentFilters = filters;
      setFilters({ ...currentFilters });
    } catch (error) {
      console.error('Error updating data sent status:', error);
      throw error;
    }
  };

  const handleSyncComplete = () => {
    // Refresh the transaction data after sync
    const currentFilters = filters;
    setFilters({ ...currentFilters }); // This will trigger the useEffect to reload data
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Transaction Management</h1>
            <p className="text-sm text-muted-foreground">
              Complete view of all MX Merchant transactions including standalone payments
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{statistics.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">With Invoices:</span>
              <span className="font-semibold text-green-600">
                {statistics.withInvoices}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Standalone:</span>
              <span className="font-semibold text-orange-600">
                {statistics.standalone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Approved:</span>
              <span className="font-semibold text-blue-600">
                {statistics.approved}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <AutoSyncHeader />
          <div className="flex items-center gap-2">
            <SyncDialog onSyncComplete={handleSyncComplete} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <TransactionFilters
          onFiltersChange={setFilters}
          resultsCount={transactions.length}
          totalCount={totalCount}
          statistics={statistics}
        />

        <TransactionTable
          transactions={transactions}
          onUpdateDataSent={handleUpdateDataSent}
          loading={loading}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mt-4"
        />
      </div>
    </div>
  );
}