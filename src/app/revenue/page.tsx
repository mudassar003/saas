'use client';

import { useState, useEffect } from 'react';
import { RevenueProjectionHeader } from '@/components/revenue/revenue-projection-header';
import { RevenueMetrics } from '@/components/revenue/revenue-metrics';
import { ProjectionChart } from '@/components/revenue/projection-chart';
import { UpcomingPayments } from '@/components/revenue/upcoming-payments';
import { DailyProjection, ProjectionResponse } from '@/types/contract';

type DatePreset = '7days' | '30days' | '90days' | 'custom';

interface FilterState {
  preset: DatePreset;
  startDate: string;
  endDate: string;
}

export default function RevenueProjectionPage() {
  const [loading, setLoading] = useState(true); // Start with loading=true for auto-load
  const [syncing, setSyncing] = useState(false);
  const [projectionData, setProjectionData] = useState<ProjectionResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  // Get default date range (today + 30 days)
  const getDefaultDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    return {
      start: today.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [filters, setFilters] = useState<FilterState>({
    preset: '30days',
    startDate: defaultDates.start,
    endDate: defaultDates.end
  });

  /**
   * Handle preset button clicks (7 days, 30 days, 90 days)
   */
  const handlePresetChange = (preset: '7days' | '30days' | '90days') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);

    const days = preset === '7days' ? 7 : preset === '30days' ? 30 : 90;
    endDate.setDate(endDate.getDate() + days);

    setFilters({
      preset,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  /**
   * Handle custom date range changes
   */
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({
      ...prev,
      preset: 'custom',
      [field]: value
    }));
  };

  /**
   * Generate Report - Query database for instant projection
   */
  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestBody = filters.preset === 'custom'
        ? { startDate: filters.startDate, endDate: filters.endDate, preset: null }
        : { preset: filters.preset };

      const response = await fetch('/api/revenue/projection/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to generate projection');
      }

      const result: ProjectionResponse = await response.json();

      if (result.success) {
        setProjectionData(result.data);
        console.log('[Revenue Projection] Report generated:', result.data);
      } else {
        throw new Error('API returned error');
      }
    } catch (err) {
      console.error('[Revenue Projection] Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      setProjectionData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch New Data - Sync contracts from MX Merchant API
   */
  const handleSyncData = async () => {
    setSyncing(true);
    setError(null);
    setLastSyncMessage(null);

    try {
      const response = await fetch('/api/revenue/projection/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' }) // Only sync active contracts
      });

      if (!response.ok) {
        throw new Error('Failed to sync contracts');
      }

      const result = await response.json();

      if (result.success) {
        setLastSyncMessage(
          `Synced ${result.stats.totalFetched} contracts (${result.stats.newRecords} new, ${result.stats.updatedRecords} updated) in ${result.stats.syncDuration}`
        );
        console.log('[Revenue Projection] Sync completed:', result.stats);

        // Auto-generate report after successful sync
        await handleGenerateReport();
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('[Revenue Projection] Error syncing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync data');
      setLastSyncMessage(null);
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Auto-load report on page mount with default 30-day range
   */
  useEffect(() => {
    console.log('[Revenue Projection] Page mounted - auto-loading 30-day report');
    handleGenerateReport();
  }, []); // Empty dependency array = run only on mount

  return (
    <div className="container mx-auto p-6 space-y-6">
      <RevenueProjectionHeader
        filters={filters}
        loading={loading}
        syncing={syncing}
        lastSyncMessage={lastSyncMessage}
        onPresetChange={handlePresetChange}
        onDateChange={handleDateChange}
        onGenerateReport={handleGenerateReport}
        onSyncData={handleSyncData}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {projectionData && (
        <>
          <RevenueMetrics
            currentRevenue={projectionData.currentRevenue}
            projectedRevenue={projectionData.projectedRevenue}
            metrics={projectionData.metrics}
            dateRange={projectionData.dateRange}
          />

          <ProjectionChart
            upcomingPayments={projectionData.projectedRevenue.upcomingPayments}
            dateRange={projectionData.dateRange}
          />

          <UpcomingPayments
            payments={projectionData.projectedRevenue.upcomingPayments}
            dateRange={projectionData.dateRange}
          />
        </>
      )}

      {!projectionData && !loading && !error && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-4 py-3 rounded text-center">
          <p className="font-medium">No data available</p>
          <p className="text-sm mt-1">
            Click &quot;Fetch New Data&quot; to sync contracts from MX Merchant API, then the report will be generated automatically
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading revenue projection...</p>
          </div>
        </div>
      )}
    </div>
  );
}
