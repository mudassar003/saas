'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import { ContractTable } from '@/components/contract/contract-table';
import { ContractFilters } from '@/components/contract/contract-filters';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard, MetricsGrid } from '@/components/ui/metric-card';
import { Contract } from '@/types/contract';

interface FilterState {
  search: string;
  status: string;
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

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all'
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

  const handleViewContract = (contractId: number) => {
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
