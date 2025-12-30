'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Download, TrendingUp } from 'lucide-react';

type DatePreset = 'thisMonth' | 'nextMonth' | 'next30days' | 'custom';

interface FilterState {
  preset: DatePreset;
  startDate: string;
  endDate: string;
}

interface RevenueProjectionHeaderProps {
  filters: FilterState;
  loading: boolean;
  syncing: boolean;
  lastSyncMessage: string | null;
  canGenerateReport: boolean;
  canSyncRevenue: boolean;
  onPresetChange: (preset: 'thisMonth' | 'nextMonth' | 'next30days') => void;
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void;
  onGenerateReport: () => void;
  onSyncData: () => void;
}

export function RevenueProjectionHeader({
  filters,
  loading,
  syncing,
  lastSyncMessage,
  canGenerateReport,
  canSyncRevenue,
  onPresetChange,
  onDateChange,
  onGenerateReport,
  onSyncData
}: RevenueProjectionHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Revenue Projection</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Forecast future revenue based on contract billing schedules
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range</h2>
          <div className="flex gap-2">
            <Button
              variant={filters.preset === 'thisMonth' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange('thisMonth')}
              disabled={loading || syncing}
            >
              This Month
            </Button>
            <Button
              variant={filters.preset === 'nextMonth' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange('nextMonth')}
              disabled={loading || syncing}
            >
              Next Month
            </Button>
            <Button
              variant={filters.preset === 'next30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange('next30days')}
              disabled={loading || syncing}
            >
              Next 30 Days
            </Button>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => onDateChange('startDate', e.target.value)}
              disabled={loading || syncing}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => onDateChange('endDate', e.target.value)}
              disabled={loading || syncing}
              min={filters.startDate}
              className="w-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <div className="relative group">
              <Button
                onClick={onGenerateReport}
                disabled={!canGenerateReport || loading || syncing}
                className="flex items-center gap-2"
                title={!canGenerateReport ? 'You do not have permission to generate reports' : ''}
              >
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                <TrendingUp className="h-4 w-4" />
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              {!canGenerateReport && (
                <div className="absolute -bottom-8 left-0 text-xs text-red-600 dark:text-red-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Admin/User role required
                </div>
              )}
            </div>

            <div className="relative group">
              <Button
                variant="outline"
                onClick={onSyncData}
                disabled={!canSyncRevenue || loading || syncing}
                className="flex items-center gap-2"
                title={!canSyncRevenue ? 'You do not have permission to sync revenue data (admin only)' : ''}
              >
                {syncing && <RefreshCw className="h-4 w-4 animate-spin" />}
                <Download className="h-4 w-4" />
                {syncing ? 'Syncing...' : 'Fetch New Data'}
              </Button>
              {!canSyncRevenue && (
                <div className="absolute -bottom-8 left-0 text-xs text-red-600 dark:text-red-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Admin role required
                </div>
              )}
            </div>
          </div>

          {lastSyncMessage && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {lastSyncMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
