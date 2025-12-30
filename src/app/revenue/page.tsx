'use client';

import { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { Permission } from '@/lib/auth/permissions';
import { RevenueProjectionHeader } from '@/components/revenue/revenue-projection-header';
import { RevenueMetrics } from '@/components/revenue/revenue-metrics';
import { ProjectionChart } from '@/components/revenue/projection-chart';
import { UpcomingPayments } from '@/components/revenue/upcoming-payments';
import { DailyProjection, ProjectionResponse } from '@/types/contract';

type DatePreset = 'thisMonth' | 'nextMonth' | 'next30days' | 'custom';

interface FilterState {
  preset: DatePreset;
  startDate: string;
  endDate: string;
}

export default function RevenueProjectionPage() {
  // Permission checks
  const { hasPermission, isTenantAdmin, isSuperAdmin } = usePermission();
  const canViewRevenue = hasPermission(Permission.VIEW_REVENUE);
  const canGenerateReport = hasPermission(Permission.GENERATE_REVENUE_REPORT);
  const canSyncRevenue = hasPermission(Permission.TRIGGER_REVENUE_SYNC);

  // Only admins can see revenue totals/expected revenue (main requirement)
  const canViewRevenueTotals = isTenantAdmin || isSuperAdmin;

  const [loading, setLoading] = useState(true); // Start with loading=true for auto-load
  const [syncing, setSyncing] = useState(false);
  const [projectionData, setProjectionData] = useState<ProjectionResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  // Get default date range (today + 30 days) in UTC for consistency
  const getDefaultDates = () => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endDateUTC = new Date(todayUTC);
    endDateUTC.setUTCDate(endDateUTC.getUTCDate() + 30);

    return {
      start: todayUTC.toISOString().split('T')[0],
      end: endDateUTC.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [filters, setFilters] = useState<FilterState>({
    preset: 'thisMonth',
    startDate: defaultDates.start,
    endDate: defaultDates.end
  });

  /**
   * Handle preset button clicks (This Month, Next Month, Next 30 Days)
   */
  const handlePresetChange = (preset: 'thisMonth' | 'nextMonth' | 'next30days') => {
    // Simply update the preset - getDefaultDates() will be called on next render
    // The actual date calculation will happen in the API based on the preset
    setFilters(prev => ({
      ...prev,
      preset
    }));
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

  // Access control: Must have VIEW_REVENUE permission
  if (!canViewRevenue) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-3">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">Access Denied</h2>
              <p className="text-red-700 dark:text-red-300">
                You do not have permission to view revenue data. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <RevenueProjectionHeader
        filters={filters}
        loading={loading}
        syncing={syncing}
        lastSyncMessage={lastSyncMessage}
        canGenerateReport={canGenerateReport}
        canSyncRevenue={canSyncRevenue}
        onPresetChange={handlePresetChange}
        onDateChange={handleDateChange}
        onGenerateReport={handleGenerateReport}
        onSyncData={handleSyncData}
      />

      {/* User Guidance Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              How Revenue Projection Works
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">To get the latest data:</span> Click the <span className="font-semibold">&quot;Fetch New Data&quot;</span> button to sync contracts from MX Merchant.
              <span className="mx-2">•</span>
              <span className="font-medium">Actual Revenue:</span> Based on all completed transactions in the selected time period.
              <span className="mx-2">•</span>
              <span className="font-medium">Projected Revenue:</span> Based on active contracts with expected billing dates - this is an <span className="italic">approximate estimate</span>.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {projectionData && (
        <>
          {/* Revenue Metrics Cards - Admin Only */}
          {canViewRevenueTotals ? (
            <RevenueMetrics
              dateRange={projectionData.dateRange}
              actualRevenue={projectionData.actualRevenue}
              projectedRevenue={projectionData.projectedRevenue}
              monthlyTotal={projectionData.monthlyTotal}
              metrics={projectionData.metrics}
            />
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Revenue Totals (Admin Only)
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Total revenue metrics are only visible to administrators. You can view the projection chart and upcoming payments below.
                  </p>
                </div>
              </div>
            </div>
          )}

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
