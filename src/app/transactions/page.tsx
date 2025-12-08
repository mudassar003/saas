'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Users, CheckCircle, XCircle } from 'lucide-react';
import { TransactionTable } from '@/components/transaction/transaction-table';
import { TransactionFilters } from '@/components/transaction/transaction-filters';
import { SyncDialog } from '@/components/sync/sync-dialog';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard, MetricsGrid } from '@/components/ui/metric-card';
import { DataSentUpdate } from '@/types/invoice';
import { getDateRange } from '@/lib/date-filters';

type TabKey = 'all' | 'recurring' | 'trt' | 'weight_loss' | 'peptides' | 'ed' | 'cancellations';

interface TabConfig {
  key: TabKey;
  label: string;
  description: string;
}

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
  category: string;
  membershipStatus: string;
  googleReview: string;
  referralSource: string;
  fulfillmentType: string;
  dateRange: string;
  activeTab: TabKey;
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
      categories: {
        TRT: number;
        'Weight Loss': number;
        Peptides: number;
        ED: number;
        Other: number;
        Uncategorized: number;
      };
      tabCounts: Record<TabKey, number>;
      membershipStatus: {
        active: number;
        canceled: number;
        paused: number;
      };
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
    category: 'all',
    membershipStatus: 'all',
    googleReview: 'all',
    referralSource: 'all',
    fulfillmentType: 'all',
    dateRange: 'all',
    activeTab: 'all'
  });

  // Tab configuration
  const tabs: TabConfig[] = [
    { key: 'all', label: 'All', description: 'All transactions (no filters)' },
    { key: 'recurring', label: 'Recurring', description: 'Active recurring patients' },
    { key: 'trt', label: 'TRT', description: 'Testosterone therapy patients' },
    { key: 'weight_loss', label: 'Weight Loss', description: 'Weight management patients' },
    { key: 'peptides', label: 'Peptides', description: 'Peptide therapy patients' },
    { key: 'ed', label: 'ED', description: 'Erectile dysfunction patients' },
    { key: 'cancellations', label: 'Cancellations', description: 'Canceled or paused memberships' }
  ];

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
    declined: 0,
    categories: {
      TRT: 0,
      'Weight Loss': 0,
      Peptides: 0,
      ED: 0,
      Other: 0,
      Uncategorized: 0
    },
    tabCounts: {
      all: 0,
      recurring: 0,
      trt: 0,
      weight_loss: 0,
      peptides: 0,
      ed: 0,
      cancellations: 0
    } as Record<TabKey, number>,
    membershipStatus: {
      active: 0,
      canceled: 0,
      paused: 0
    }
  });

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
        if (filters.category !== 'all') {
          params.append('category', filters.category);
        }
        if (filters.membershipStatus !== 'all') {
          params.append('membershipStatus', filters.membershipStatus);
        }
        if (filters.googleReview !== 'all') {
          params.append('googleReview', filters.googleReview);
        }
        if (filters.referralSource !== 'all') {
          params.append('referralSource', filters.referralSource);
        }
        if (filters.fulfillmentType !== 'all') {
          params.append('fulfillmentType', filters.fulfillmentType);
        }

        // Add date range filtering
        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.start) {
          params.append('dateStart', dateRange.start);
        }
        if (dateRange.end) {
          params.append('dateEnd', dateRange.end);
        }

        // Add active tab filtering
        params.append('activeTab', filters.activeTab);

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
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [filters, currentPage, pageSize]);

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
    setFilters({ ...currentFilters });
  };

  const handleTabChange = (tabKey: TabKey) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      activeTab: tabKey,
      // Let the backend API handle filtering based on activeTab
      category: 'all',
      membershipStatus: 'all'
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Patient Census Dashboard"
        description="Monitor patient transactions and treatment categories across all payment channels"
        actions={<SyncDialog onSyncComplete={handleSyncComplete} />}
      />

      {/* KPI Metrics */}
      <MetricsGrid>
        <MetricCard
          label="Total Transactions"
          value={statistics.total.toLocaleString()}
          icon={CreditCard}
          variant="default"
        />
        <MetricCard
          label="With Invoices"
          value={statistics.withInvoices.toLocaleString()}
          icon={Users}
          variant="info"
        />
        <MetricCard
          label="Approved"
          value={statistics.approved.toLocaleString()}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          label="Declined"
          value={statistics.declined.toLocaleString()}
          icon={XCircle}
          variant="error"
        />
      </MetricsGrid>

      {/* Tab Navigation */}
      <div className="bg-card dark:bg-card border border-border rounded-lg p-1 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`
                flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${filters.activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/20'
                }
              `}
              title={tab.description}
            >
              {tab.label}
              {statistics.tabCounts[tab.key] > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  filters.activeTab === tab.key
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted/80 dark:bg-muted/40 text-muted-foreground'
                }`}>
                  {statistics.tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        onFiltersChange={setFilters}
        resultsCount={transactions.length}
        totalCount={totalCount}
        statistics={statistics}
        activeTab={filters.activeTab}
      />

      {/* Transaction Table */}
      <div className="bg-card border rounded-lg shadow-sm">
        <TransactionTable
          transactions={transactions}
          onUpdateDataSent={handleUpdateDataSent}
          loading={loading}
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
