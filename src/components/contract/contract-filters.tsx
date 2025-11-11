'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContractFiltersProps {
  onFiltersChange: (filters: { search: string; status: string }) => void;
  resultsCount: number;
  totalCount: number;
}

export function ContractFilters({
  onFiltersChange,
  resultsCount,
  totalCount,
}: ContractFiltersProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFiltersChange({ search: value, status });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFiltersChange({ search, status: value });
  };

  return (
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
        </SelectContent>
      </Select>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        Showing {resultsCount} of {totalCount}
      </div>
    </div>
  );
}
