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
      day: 'numeric'
    });
  };

  // Find max amount for scaling
  const maxAmount = Math.max(...upcomingPayments.map(p => p.amount), 1);

  // Group by week for better visualization (optional, can show daily)
  const showDaily = upcomingPayments.length <= 30;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Payment Schedule</h2>
      </div>

      {upcomingPayments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
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
                <div className="w-20 text-xs font-medium text-gray-600 text-right">
                  {formatDate(payment.date)}
                </div>

                {/* Bar */}
                <div className="flex-1 relative">
                  <div
                    className="bg-blue-500 hover:bg-blue-600 transition-colors rounded h-8 flex items-center justify-between px-3 cursor-pointer"
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
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="border-t border-gray-200 pt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600">Total Days</p>
              <p className="text-lg font-semibold text-gray-900">{upcomingPayments.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Payments</p>
              <p className="text-lg font-semibold text-gray-900">
                {upcomingPayments.reduce((sum, p) => sum + p.count, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Amount</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(upcomingPayments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
