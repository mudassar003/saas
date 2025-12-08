'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

type TabKey = 'all' | 'recurring' | 'trt' | 'weight_loss' | 'peptides' | 'ed' | 'cancellations';

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

interface TransactionFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  resultsCount: number;
  totalCount: number;
  activeTab: TabKey;
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
}

export function TransactionFilters({ 
  onFiltersChange, 
  resultsCount, 
  totalCount,
  activeTab,
  statistics
}: TransactionFiltersProps) {
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

  // Local state for search input (doesn't trigger API calls)
  const [searchInput, setSearchInput] = useState('');

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { ...filters, search: searchInput.trim() };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    const newFilters = { ...filters, search: '' };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      status: 'all',
      showType: 'all',
      category: 'all',
      membershipStatus: 'all',
      googleReview: 'all',
      referralSource: 'all',
      fulfillmentType: 'all',
      dateRange: 'all',
      activeTab: activeTab // Keep the current tab
    };
    setSearchInput('');
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.search || 
    filters.status !== 'all' || 
    filters.showType !== 'all' || 
    filters.category !== 'all' || 
    filters.membershipStatus !== 'all' || 
    filters.googleReview !== 'all' || 
    filters.referralSource !== 'all' || 
    filters.fulfillmentType !== 'all' || 
    filters.dateRange !== 'all';

  return (
    <div className="space-y-2">

      {/* Search and Quick Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:flex-1 lg:max-w-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              autoComplete="off"
              suppressHydrationWarning={true}
            />
          </div>
          <Button type="submit" size="sm" className="px-3">
            <Search className="h-4 w-4" />
          </Button>
          {(searchInput || filters.search) && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleSearchClear}
              className="px-3"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
        
        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="transition-all duration-200 hover:scale-105 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 dark:hover:bg-rose-900/20 dark:hover:border-rose-800 dark:hover:text-rose-300"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Compact Filters - Reduced for Tab-based Navigation */}
      <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-3 border border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {/* Only show relevant filters based on active tab */}
          {activeTab !== 'cancellations' && (
            <Select value={filters.showType} onValueChange={(value) => handleFilterChange('showType', value)}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue>
                  {filters.showType === 'all' ? 'Type: All' : 
                   filters.showType === 'with_invoices' ? 'Type: With Invoice' :
                   filters.showType === 'standalone' ? 'Type: Standalone' : 'Type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="with_invoices">With Invoice</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
              </SelectContent>
            </Select>
          )}
            
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue>
                {filters.status === 'all' ? 'Status: All' : 
                 filters.status === 'Approved' ? 'Status: Approved' :
                 filters.status === 'Settled' ? 'Status: Settled' :
                 filters.status === 'Declined' ? 'Status: Declined' : 'Status'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Settled">Settled</SelectItem>
              <SelectItem value="Declined">Declined</SelectItem>
            </SelectContent>
          </Select>

          {/* Only show membership status filter on cancellations tab */}
          {activeTab === 'cancellations' && (
            <Select value={filters.membershipStatus} onValueChange={(value) => handleFilterChange('membershipStatus', value)}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue>
                  {filters.membershipStatus === 'all' ? 'Status: All' : 
                   filters.membershipStatus === 'active' ? 'Status: Active' :
                   filters.membershipStatus === 'canceled' ? 'Status: Canceled' :
                   filters.membershipStatus === 'paused' ? 'Status: Paused' : 'Status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          )}
            
          <Select value={filters.googleReview} onValueChange={(value) => handleFilterChange('googleReview', value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue>
                {filters.googleReview === 'all' ? 'Review: All' : 
                 filters.googleReview === 'true' ? 'Review: Yes' :
                 filters.googleReview === 'false' ? 'Review: No' : 'Review'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.referralSource} onValueChange={(value) => handleFilterChange('referralSource', value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue>
                {filters.referralSource === 'all' ? 'Referral: All' : 
                 filters.referralSource === 'online' ? 'Referral: Online' :
                 filters.referralSource === 'refer_a_friend' ? 'Referral: Refer Friend' :
                 filters.referralSource === 'other' ? 'Referral: Other' : 'Referral'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="refer_a_friend">Refer Friend</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
            
          <Select value={filters.fulfillmentType} onValueChange={(value) => handleFilterChange('fulfillmentType', value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue>
                {filters.fulfillmentType === 'all' ? 'Fulfillment: All' : 
                 filters.fulfillmentType === 'in_office' ? 'Fulfillment: In Office' :
                 filters.fulfillmentType === 'mail_out' ? 'Fulfillment: Mail Out' : 'Fulfillment'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in_office">In Office</SelectItem>
              <SelectItem value="mail_out">Mail Out</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue>
                {filters.dateRange === 'all' ? 'Date: All Time' : 
                 filters.dateRange === 'today' ? 'Date: Today' :
                 filters.dateRange === 'week' ? 'Date: Week' :
                 filters.dateRange === 'month' ? 'Date: Month' : 'Date'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Hide category filter on specific tabs since they're already filtered */}
          {(activeTab === 'all' || activeTab === 'recurring') && (
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue>
                  {filters.category === 'all' ? 'Category: All' : 
                   filters.category === 'TRT' ? 'Category: TRT' :
                   filters.category === 'Weight Loss' ? 'Category: Weight Loss' :
                   filters.category === 'Peptides' ? 'Category: Peptides' :
                   filters.category === 'ED' ? 'Category: ED' : 'Category'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="TRT">TRT</SelectItem>
                <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                <SelectItem value="Peptides">Peptides</SelectItem>
                <SelectItem value="ED">ED</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground flex items-center gap-4">
        <span>
          Showing {resultsCount.toLocaleString()} of {totalCount.toLocaleString()} patients
          {hasActiveFilters && (
            <span className="ml-2 text-blue-600">
              (filtered)
            </span>
          )}
        </span>
        {filters.search && (
          <Badge variant="outline" className="text-xs">
            Searching: &quot;{filters.search}&quot;
          </Badge>
        )}
      </div>

      {/* Compact Statistics */}
      <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-2 border border-border">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-sky-100 dark:bg-sky-900/30 rounded text-sky-700 dark:text-sky-300">
            <span>Total:</span> <span className="font-bold">{statistics.total}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-300">
            <span>Active:</span> <span className="font-bold">{statistics.membershipStatus.active}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 rounded text-violet-700 dark:text-violet-300">
            <span>Approved:</span> <span className="font-bold">{statistics.approved}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-rose-100 dark:bg-rose-900/30 rounded text-rose-700 dark:text-rose-300">
            <span>Declined:</span> <span className="font-bold">{statistics.declined}</span>
          </div>
        </div>
      </div>
    </div>
  );
}