'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Download, TrendingUp } from 'lucide-react';

type DatePreset = '7days' | '30days' | '90days' | 'custom';

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
  onPresetChange: (preset: '7days' | '30days' | '90days') => void;
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void;
  onGenerateReport: () => void;
  onSyncData: () => void;
}

export function RevenueProjectionHeader({
  filters,
  loading,
  syncing,
  lastSyncMessage,
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
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Revenue Projection</h1>
            <p className="text-sm text-gray-600 mt-1">
              Forecast future revenue based on contract billing schedules
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Date Range</h2>
          <div className="flex gap-2">
            <Button
              variant={filters.preset === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange('7days')}
              disabled={loading || syncing}
            >
              7 Days
            </Button>
            <Button
              variant={filters.preset === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange('30days')}
              disabled={loading || syncing}
            >
              30 Days
            </Button>
            <Button
              variant={filters.preset === '90days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange('90days')}
              disabled={loading || syncing}
            >
              90 Days
            </Button>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            <Button
              onClick={onGenerateReport}
              disabled={loading || syncing}
              className="flex items-center gap-2"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <TrendingUp className="h-4 w-4" />
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>

            <Button
              variant="outline"
              onClick={onSyncData}
              disabled={loading || syncing}
              className="flex items-center gap-2"
            >
              {syncing && <RefreshCw className="h-4 w-4 animate-spin" />}
              <Download className="h-4 w-4" />
              {syncing ? 'Syncing...' : 'Fetch New Data'}
            </Button>
          </div>

          {lastSyncMessage && (
            <p className="text-sm text-green-600 font-medium">
              {lastSyncMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
