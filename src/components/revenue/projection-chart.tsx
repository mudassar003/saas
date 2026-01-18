'use client';

import { BarChart3 } from 'lucide-react';
import { DailyProjection } from '@/types/contract';

interface ProjectionChartProps {
  upcomingPayments: DailyProjection[];
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

// Category color mapping
const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'TRT':
      return 'bg-green-600 hover:bg-green-700';
    case 'Peptides':
      return 'bg-red-600 hover:bg-red-700';
    case 'ED':
      return 'bg-orange-600 hover:bg-orange-700';
    case 'Weight Loss':
      return 'bg-purple-600 hover:bg-purple-700';
    case 'Other':
      return 'bg-yellow-600 hover:bg-yellow-700';
    case 'Uncategorized':
      return 'bg-gray-500 hover:bg-gray-600';
    default:
      return 'bg-blue-600 hover:bg-blue-700';
  }
};

// Category text color for legend
const getCategoryTextColor = (category: string): string => {
  switch (category) {
    case 'TRT':
      return 'text-green-600 dark:text-green-400';
    case 'Peptides':
      return 'text-red-600 dark:text-red-400';
    case 'ED':
      return 'text-orange-600 dark:text-orange-400';
    case 'Weight Loss':
      return 'text-purple-600 dark:text-purple-400';
    case 'Other':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'Uncategorized':
      return 'text-gray-500 dark:text-gray-400';
    default:
      return 'text-blue-600 dark:text-blue-400';
  }
};

export function ProjectionChart({ upcomingPayments, dateRange }: ProjectionChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Find max amount for scaling
  const maxAmount = Math.max(...upcomingPayments.map(p => p.amount), 1);

  // Get unique categories for legend
  const allCategories = new Set<string>();
  upcomingPayments.forEach(payment => {
    if (payment.categoryBreakdown) {
      payment.categoryBreakdown.forEach(cat => allCategories.add(cat.category));
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Schedule by Product Category</h2>
      </div>

      {/* Legend */}
      {allCategories.size > 0 && (
        <div className="flex gap-4 mb-6 flex-wrap pb-4 border-b border-gray-200 dark:border-gray-700">
          {Array.from(allCategories).sort().map((category) => (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${getCategoryColor(category).split(' ')[0]}`}></div>
              <span className={`text-xs font-medium ${getCategoryTextColor(category)}`}>
                {category}
              </span>
            </div>
          ))}
        </div>
      )}

      {upcomingPayments.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No payments scheduled for this period</p>
          <p className="text-xs mt-1">Try selecting a different date range or syncing new data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart Visualization */}
          <div className="space-y-2">
            {upcomingPayments.map((payment) => (
              <div key={payment.date} className="flex items-center gap-3">
                {/* Date Label */}
                <div className="w-20 text-xs font-medium text-gray-600 dark:text-gray-300 text-right">
                  {formatDate(payment.date)}
                </div>

                {/* Stacked Bar */}
                <div className="flex-1 relative">
                  {payment.categoryBreakdown && payment.categoryBreakdown.length > 0 ? (
                    // Stacked bars by category
                    <div
                      className="flex rounded overflow-hidden h-8 border border-gray-200 dark:border-gray-700"
                      style={{ width: `${(payment.amount / maxAmount) * 100}%`, minWidth: '120px' }}
                    >
                      {payment.categoryBreakdown.map((category, index) => {
                        const widthPercent = (category.amount / payment.amount) * 100;
                        const showText = widthPercent > 15; // Only show text if segment is wide enough

                        return (
                          <div
                            key={index}
                            className={`${getCategoryColor(category.category)} flex items-center justify-center px-2 transition-colors relative group`}
                            style={{ width: `${widthPercent}%` }}
                            title={`${category.category}: ${category.count} payment${category.count !== 1 ? 's' : ''} - ${formatCurrency(category.amount)}`}
                          >
                            {showText && (
                              <span className="text-xs font-bold text-white truncate">
                                {formatCurrency(category.amount)}
                              </span>
                            )}
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              {category.category}: {formatCurrency(category.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Fallback to simple bar if no category breakdown
                    <div
                      className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors rounded h-8 flex items-center justify-between px-3 cursor-pointer"
                      style={{ width: `${(payment.amount / maxAmount) * 100}%`, minWidth: '120px' }}
                      title={`${payment.count} payment${payment.count !== 1 ? 's' : ''}: ${formatCurrency(payment.amount)}`}
                    >
                      <span className="text-xs font-medium text-white">
                        {payment.count} payment{payment.count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Amount Label */}
                <div className="w-24 text-xs font-bold text-gray-900 dark:text-white">
                  {formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300">Total Days</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{upcomingPayments.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300">Total Payments</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {upcomingPayments.reduce((sum, p) => sum + p.count, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300">Total Amount</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(upcomingPayments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </div>

          {/* Category Breakdown Summary */}
          {allCategories.size > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Revenue by Category</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from(allCategories).sort().map((category) => {
                  const categoryTotal = upcomingPayments.reduce((sum, payment) => {
                    const catBreakdown = payment.categoryBreakdown?.find(c => c.category === category);
                    return sum + (catBreakdown?.amount || 0);
                  }, 0);

                  return (
                    <div key={category} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded ${getCategoryColor(category).split(' ')[0]}`}></div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{category}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(categoryTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
