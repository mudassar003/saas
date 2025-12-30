'use client';

import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContractFiltersProps {
  onFiltersChange: (filters: { search: string; status: string; dateRange: string }) => void;
  resultsCount: number;
  totalCount: number;
  syncing: boolean;
  lastSyncMessage: string | null;
  onSyncData: () => Promise<void>;
}

export function ContractFilters({
  onFiltersChange,
  resultsCount,
  totalCount,
  syncing,
  lastSyncMessage,
  onSyncData,
}: ContractFiltersProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFiltersChange({ search: value, status, dateRange });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFiltersChange({ search, status: value, dateRange });
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    onFiltersChange({ search, status, dateRange: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
        {/* Search */}
        <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name or contract ID..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Status Filter */}
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Cancelled">Cancelled</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
          <SelectItem value="Deleted">Deleted</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select value={dateRange} onValueChange={handleDateRangeChange}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="All Dates" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dates</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
        </SelectContent>
      </Select>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Showing {resultsCount} of {totalCount}
        </div>
      </div>

      {/* Sync Button Row */}
      <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
        <Button
          variant="outline"
          onClick={onSyncData}
          disabled={syncing}
          className="flex items-center gap-2"
        >
          {syncing && <RefreshCw className="h-4 w-4 animate-spin" />}
          <RefreshCw className={syncing ? "hidden" : "h-4 w-4"} />
          {syncing ? 'Syncing from MX Merchant...' : 'Fetch New Contracts'}
        </Button>

        {lastSyncMessage && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            {lastSyncMessage}
          </p>
        )}
      </div>
    </div>
  );
}
