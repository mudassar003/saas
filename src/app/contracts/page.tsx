'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import { ContractTable } from '@/components/contract/contract-table';
import { ContractFilters } from '@/components/contract/contract-filters';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard, MetricsGrid } from '@/components/ui/metric-card';
import { Contract } from '@/types/contract';
import { getDateRange } from '@/lib/date-filters';

interface FilterState {
  search: string;
  status: string;
  dateRange: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    records: Contract[];
    recordCount: number;
    statistics: {
      total: number;
      active: number;
      completed: number;
      cancelled: number;
      inactive: number;
    };
  };
}

interface ContractSyncResponse {
  success: boolean;
  stats: {
    totalFetched: number;
    newRecords: number;
    updatedRecords: number;
    syncDuration: string;
  };
  error?: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    dateRange: 'all'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Statistics state
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    inactive: 0
  });

  // Load contracts from API
  useEffect(() => {
    const loadContracts = async () => {
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

        // Add date range filtering
        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.start) {
          params.append('dateStart', dateRange.start);
        }
        if (dateRange.end) {
          params.append('dateEnd', dateRange.end);
        }

        // Make API call
        const response = await fetch(`/api/contracts?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contracts');
        }

        const result: ApiResponse = await response.json();

        if (result.success) {
          setContracts(result.data.records);
          setTotalCount(result.data.recordCount);
          setTotalPages(Math.ceil(result.data.recordCount / pageSize));
          setStatistics(result.data.statistics);
        } else {
          console.error('API returned error:', result);
        }
      } catch (error) {
        console.error('Error loading contracts:', error);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, [filters, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Sync contracts from MX Merchant API
  const handleSyncData = async (): Promise<void> => {
    setSyncing(true);
    setLastSyncMessage(null);

    try {
      const response = await fetch('/api/revenue/projection/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' })
      });

      if (!response.ok) {
        throw new Error('Failed to sync contracts');
      }

      const result: ContractSyncResponse = await response.json();

      if (result.success) {
        setLastSyncMessage(
          `Synced ${result.stats.totalFetched} contracts (${result.stats.newRecords} new, ${result.stats.updatedRecords} updated) in ${result.stats.syncDuration}`
        );
        console.log('[Contracts] Sync completed:', result.stats);

        // Reload contracts table after successful sync
        const params = new URLSearchParams();
        params.append('limit', pageSize.toString());
        params.append('offset', ((currentPage - 1) * pageSize).toString());

        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.status !== 'all') {
          params.append('status', filters.status);
        }

        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.start) {
          params.append('dateStart', dateRange.start);
        }
        if (dateRange.end) {
          params.append('dateEnd', dateRange.end);
        }

        const refreshResponse = await fetch(`/api/contracts?${params.toString()}`);
        if (refreshResponse.ok) {
          const refreshResult: ApiResponse = await refreshResponse.json();
          if (refreshResult.success) {
            setContracts(refreshResult.data.records);
            setTotalCount(refreshResult.data.recordCount);
            setTotalPages(Math.ceil(refreshResult.data.recordCount / pageSize));
            setStatistics(refreshResult.data.statistics);
          }
        }
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[Contracts] Error syncing data:', error);
      setLastSyncMessage('Failed to sync contracts. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleViewContract = (contractId: number): void => {
    window.location.href = `/contracts/${contractId}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Contract Management"
        description="Monitor and manage recurring payment contracts and subscriptions"
      />

      {/* KPI Metrics */}
      <MetricsGrid>
        <MetricCard
          label="Total Contracts"
          value={statistics.total.toLocaleString()}
          icon={FileText}
          variant="default"
        />
        <MetricCard
          label="Active"
          value={statistics.active.toLocaleString()}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          label="Completed"
          value={statistics.completed.toLocaleString()}
          icon={Clock}
          variant="info"
        />
        <MetricCard
          label="Cancelled"
          value={statistics.cancelled.toLocaleString()}
          icon={XCircle}
          variant="error"
        />
        <MetricCard
          label="Inactive"
          value={statistics.inactive.toLocaleString()}
          icon={Loader}
          variant="warning"
        />
      </MetricsGrid>

      {/* Filters */}
      <ContractFilters
        onFiltersChange={setFilters}
        resultsCount={contracts.length}
        totalCount={totalCount}
        syncing={syncing}
        lastSyncMessage={lastSyncMessage}
        onSyncData={handleSyncData}
      />

      {/* Contract Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <ContractTable
          contracts={contracts}
          onViewContract={handleViewContract}
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
