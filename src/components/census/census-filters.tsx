'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';

type TabKey = 'all' | 'trt' | 'weight_loss' | 'peptides' | 'ed' | 'cancellations';

interface FilterState {
  search: string;
  category: string;
  membershipStatus: string;
  googleReview: string;
  referralSource: string;
  fulfillmentType: string;
  dateRange: string;
  activeTab: TabKey;
}

interface CensusStatistics {
  total: number;
  byCategory: Record<string, number>;
  byMembershipStatus: Record<string, number>;
  tabCounts: Record<TabKey, number>;
}

interface CensusFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  resultsCount: number;
  totalCount: number;
  statistics: CensusStatistics;
  activeTab: TabKey;
}

export function CensusFilters({ 
  onFiltersChange, 
  resultsCount, 
  totalCount, 
  statistics,
  activeTab 
}: CensusFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    membershipStatus: 'all',
    googleReview: 'all',
    referralSource: 'all',
    fulfillmentType: 'all',
    dateRange: 'all',
    activeTab
  });

  const handleFilterChange = (key: keyof FilterState, value: string): void => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    const updatedFilters = { ...localFilters, search: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleReset = (): void => {
    const resetFilters: FilterState = {
      search: '',
      category: 'all',
      membershipStatus: 'all',
      googleReview: 'all',
      referralSource: 'all',
      fulfillmentType: 'all',
      dateRange: 'all',
      activeTab
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const hasActiveFilters = (): boolean => {
    return localFilters.search !== '' ||
           localFilters.category !== 'all' ||
           localFilters.membershipStatus !== 'all' ||
           localFilters.googleReview !== 'all' ||
           localFilters.referralSource !== 'all' ||
           localFilters.fulfillmentType !== 'all' ||
           localFilters.dateRange !== 'all';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
      {/* Search and Results Count */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search patients..."
            value={localFilters.search}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-slate-100">{resultsCount}</span> of{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">{totalCount}</span> patients
          </div>
          {hasActiveFilters() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Product Category Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Category
          </label>
          <Select 
            value={localFilters.category} 
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({statistics.total})</SelectItem>
              <SelectItem value="TRT">TRT ({statistics.byCategory.TRT || 0})</SelectItem>
              <SelectItem value="Weight Loss">Weight Loss ({statistics.byCategory['Weight Loss'] || 0})</SelectItem>
              <SelectItem value="Peptides">Peptides ({statistics.byCategory.Peptides || 0})</SelectItem>
              <SelectItem value="ED">ED ({statistics.byCategory.ED || 0})</SelectItem>
              <SelectItem value="Other">Other ({statistics.byCategory.Other || 0})</SelectItem>
              <SelectItem value="Uncategorized">Uncategorized ({statistics.byCategory.Uncategorized || 0})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Membership Status Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <Select 
            value={localFilters.membershipStatus} 
            onValueChange={(value) => handleFilterChange('membershipStatus', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">
                Active ({statistics.byMembershipStatus.active || 0})
              </SelectItem>
              <SelectItem value="paused">
                Paused ({statistics.byMembershipStatus.paused || 0})
              </SelectItem>
              <SelectItem value="canceled">
                Canceled ({statistics.byMembershipStatus.canceled || 0})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Google Review Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Google Review
          </label>
          <Select 
            value={localFilters.googleReview} 
            onValueChange={(value) => handleFilterChange('googleReview', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Submitted</SelectItem>
              <SelectItem value="false">Not Submitted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Referral Source Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Referral Source
          </label>
          <Select 
            value={localFilters.referralSource} 
            onValueChange={(value) => handleFilterChange('referralSource', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="refer_a_friend">Refer a Friend</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fulfillment Type Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Fulfillment
          </label>
          <Select 
            value={localFilters.fulfillmentType} 
            onValueChange={(value) => handleFilterChange('fulfillmentType', value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="in_office">In Office</SelectItem>
              <SelectItem value="mail_out">Mail Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Date Range
          </label>
          <Select 
            value={localFilters.dateRange} 
            onValueChange={(value) => handleFilterChange('dateRange', value)}
          >
            <SelectTrigger className="h-8 text-xs">
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

      {/* Statistics Summary - Only show when filters are applied */}
      {hasActiveFilters() && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span>Filtered Results:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{totalCount}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-emerald-600">
                Active: {statistics.byMembershipStatus.active || 0}
              </span>
              <span className="text-amber-600">
                Paused: {statistics.byMembershipStatus.paused || 0}
              </span>
              <span className="text-red-600">
                Canceled: {statistics.byMembershipStatus.canceled || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}