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
  dataSent: string;
  dateRange: string;
}

interface InvoiceFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  resultsCount: number;
  totalCount: number;
}

export function InvoiceFilters({ 
  onFiltersChange, 
  resultsCount, 
  totalCount 
}: InvoiceFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    dataSent: 'all',
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
      dataSent: 'all',
      dateRange: 'all'
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.dataSent !== 'all' || 
    filters.dateRange !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices, customers..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Data Sent:</span>
          <Select value={filters.dataSent} onValueChange={(value) => handleFilterChange('dataSent', value)}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes" className="text-green-600">YES</SelectItem>
              <SelectItem value="no" className="text-red-600">NO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Date:</span>
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {hasActiveFilters 
            ? `Showing ${resultsCount} of ${totalCount} invoices` 
            : `${totalCount} invoices total`
          }
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {filters.search && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Search: &quot;{filters.search}&quot;
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Status: {filters.status}
              </span>
            )}
            {filters.dataSent !== 'all' && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                Data: {filters.dataSent}
              </span>
            )}
            {filters.dateRange !== 'all' && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                Date: {filters.dateRange}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}