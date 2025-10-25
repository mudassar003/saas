'use client';

import { useState, useEffect } from 'react';
import { ContractTable } from '@/components/contract/contract-table';
import { ContractFilters } from '@/components/contract/contract-filters';
import { Pagination } from '@/components/ui/pagination';
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
    <div className="container mx-auto py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Contract Management</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Active:</span>
              <span className="font-semibold text-green-600">
                {statistics.active}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-semibold text-blue-600">
                {statistics.completed}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Cancelled:</span>
              <span className="font-semibold text-red-600">
                {statistics.cancelled}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <ContractFilters
          onFiltersChange={setFilters}
          resultsCount={contracts.length}
          totalCount={totalCount}
        />

        <ContractTable
          contracts={contracts}
          onViewContract={handleViewContract}
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
