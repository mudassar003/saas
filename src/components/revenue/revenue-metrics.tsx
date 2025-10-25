'use client';

import { DollarSign, TrendingUp, Calendar, Users, XCircle, CheckCircle } from 'lucide-react';

interface RevenueMetricsProps {
  currentRevenue: {
    total: number;
    transactionCount: number;
    averageTransaction: number;
  };
  projectedRevenue: {
    total: number;
    contractCount: number;
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
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export function RevenueMetrics({
  currentRevenue,
  projectedRevenue,
  metrics,
  dateRange
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
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Range Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Calendar className="h-5 w-5" />
          <p className="font-medium">
            Projection Period: {formatDate(dateRange.start)} - {formatDate(dateRange.end)} ({dateRange.days} days)
          </p>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Current Revenue</h3>
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(currentRevenue.total)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentRevenue.transactionCount} transactions
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Avg: {formatCurrency(currentRevenue.averageTransaction)}
          </p>
        </div>

        {/* Projected Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Projected Revenue</h3>
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(projectedRevenue.total)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {projectedRevenue.contractCount} upcoming payments
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Based on contract schedules
          </p>
        </div>

        {/* Monthly Recurring Revenue (MRR) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Recurring Revenue</h3>
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(metrics.monthlyRecurringRevenue)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            MRR from active contracts
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Normalized to 30 days
          </p>
        </div>
      </div>

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
