'use client';

import { DollarSign, TrendingUp, Calendar, Users, XCircle, CheckCircle, Target } from 'lucide-react';

interface RevenueMetricsProps {
  dateRange: {
    start: string;
    end: string;
    days: number;
    cutoffDate: string;
    daysCompleted: number;
    daysRemaining: number;
    isHistoricalRange?: boolean;
  };
  actualRevenue: {
    total: number;
    transactionCount: number;
    averageTransaction: number;
  };
  projectedRevenue: {
    total: number;
    contractCount: number;
  };
  monthlyTotal: {
    expected: number;
    actualPercentage: number;
    projectedPercentage: number;
  };
  metrics: {
    totalTransactions: number;
    approvedTransactions: number;
    declinedTransactions: number;
    activeContracts: number;
    cancelledContracts: number;
    completedContracts: number;
    monthlyRecurringRevenue: number;
  };
}

export function RevenueMetrics({
  dateRange,
  actualRevenue,
  projectedRevenue,
  monthlyTotal,
  metrics
}: RevenueMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Range Info - Adapts based on Historical vs Current/Future */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-foreground">
              {dateRange.isHistoricalRange ? 'Revenue History' : 'Revenue Overview'}
            </h3>
          </div>
          {!dateRange.isHistoricalRange && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">As of today</p>
            </div>
          )}
        </div>

        {dateRange.isHistoricalRange ? (
          /* Historical Data - Single simplified card */
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">Historical Period</p>
                <p className="text-lg font-semibold text-green-900 dark:text-green-100 mt-1">
                  {formatDate(dateRange.start)} → {formatDate(dateRange.end)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dateRange.days}</p>
                <p className="text-xs text-green-600 dark:text-green-400">days</p>
              </div>
            </div>
          </div>
        ) : (
          /* Current/Future Data - Three column layout */
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">Actual Period</p>
              <p className="text-sm font-semibold text-green-900 dark:text-green-100 mt-1">
                {formatDate(dateRange.start)} - {formatDate(dateRange.cutoffDate)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {dateRange.daysCompleted} days completed
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Projection Period</p>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-1">
                {formatDate(dateRange.cutoffDate)} - {formatDate(dateRange.end)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {dateRange.daysRemaining} days remaining
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Full Period</p>
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mt-1">
                {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {dateRange.days} total days
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Primary Revenue Metrics - Adapts for Historical vs Current/Future */}
      {dateRange.isHistoricalRange ? (
        /* Historical Data - Single Total Revenue Card */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Revenue */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-green-600"></div>
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                Total Revenue
              </h3>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(actualRevenue.total)}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-green-700 dark:text-green-300">
                {actualRevenue.transactionCount} transactions
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Avg: {formatCurrency(actualRevenue.averageTransaction)}
              </p>
            </div>
          </div>

          {/* MRR Info */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-purple-600"></div>
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Contract Stats
              </h3>
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.activeContracts}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                active contracts
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                MRR: {formatCurrency(metrics.monthlyRecurringRevenue)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Current/Future Data - Three column layout */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Actual Revenue (Past) */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-green-600"></div>
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                Actual Revenue
              </h3>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(actualRevenue.total)}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-green-700 dark:text-green-300">
                {actualRevenue.transactionCount} transactions
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Avg: {formatCurrency(actualRevenue.averageTransaction)}
              </p>
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                {monthlyTotal.actualPercentage.toFixed(1)}% of total
              </p>
            </div>
          </div>

          {/* Projected Revenue (Future) */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-blue-600"></div>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Projected Revenue
              </h3>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(projectedRevenue.total)}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {projectedRevenue.contractCount} expected payments
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                MRR: {formatCurrency(metrics.monthlyRecurringRevenue)}
              </p>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                {monthlyTotal.projectedPercentage.toFixed(1)}% of total
              </p>
            </div>
          </div>

          {/* Total Expected */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-purple-600"></div>
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Total Expected
              </h3>
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(monthlyTotal.expected)}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {metrics.activeContracts} active contracts
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Actual + Projected
              </p>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                100% of period
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contract & Transaction Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Contracts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Active Contracts</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeContracts}</p>
        </div>

        {/* Cancelled Contracts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Cancelled</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.cancelledContracts}</p>
        </div>

        {/* Approved Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Approved</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.approvedTransactions}</p>
        </div>

        {/* Declined Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Declined</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.declinedTransactions}</p>
        </div>
      </div>
    </div>
  );
}
