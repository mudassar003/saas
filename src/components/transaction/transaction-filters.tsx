'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface FilterState {
  search: string;
  status: string;
  showType: string;
  dateRange: string;
}

interface TransactionFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  resultsCount: number;
  totalCount: number;
  statistics: {
    total: number;
    withInvoices: number;
    standalone: number;
    approved: number;
    settled: number;
    declined: number;
  };
}

export function TransactionFilters({ 
  onFiltersChange, 
  resultsCount, 
  totalCount,
  statistics
}: TransactionFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    showType: 'all',
    dateRange: 'all'
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      status: 'all',
      showType: 'all',
      dateRange: 'all'
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.showType !== 'all' || 
    filters.dateRange !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions, customers..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>
        
        {/* Transaction Type Filter */}
        <Select value={filters.showType} onValueChange={(value) => handleFilterChange('showType', value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions ({statistics.total})</SelectItem>
            <SelectItem value="with_invoices">With Invoices ({statistics.withInvoices})</SelectItem>
            <SelectItem value="standalone">Standalone ({statistics.standalone})</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Approved">Approved ({statistics.approved})</SelectItem>
            <SelectItem value="Settled">Settled ({statistics.settled})</SelectItem>
            <SelectItem value="Declined">Declined ({statistics.declined})</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {resultsCount.toLocaleString()} of {totalCount.toLocaleString()} transactions
        {hasActiveFilters && (
          <span className="ml-2 text-blue-600">
            (filtered)
          </span>
        )}
      </div>

      {/* Transaction Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
          <p className="text-sm font-medium text-blue-600">Total</p>
          <p className="text-2xl font-bold text-blue-900">{statistics.total}</p>
        </div>
        <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
          <p className="text-sm font-medium text-green-600">With Invoices</p>
          <p className="text-2xl font-bold text-green-900">{statistics.withInvoices}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
          <p className="text-sm font-medium text-orange-600">Standalone</p>
          <p className="text-2xl font-bold text-orange-900">{statistics.standalone}</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded border-l-4 border-emerald-500">
          <p className="text-sm font-medium text-emerald-600">Approved</p>
          <p className="text-2xl font-bold text-emerald-900">{statistics.approved}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-500">
          <p className="text-sm font-medium text-purple-600">Settled</p>
          <p className="text-2xl font-bold text-purple-900">{statistics.settled}</p>
        </div>
        <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
          <p className="text-sm font-medium text-red-600">Declined</p>
          <p className="text-2xl font-bold text-red-900">{statistics.declined}</p>
        </div>
      </div>
    </div>
  );
}