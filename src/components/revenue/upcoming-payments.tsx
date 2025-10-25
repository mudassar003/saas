'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { DailyProjection } from '@/types/contract';
import { Button } from '@/components/ui/button';

interface UpcomingPaymentsProps {
  payments: DailyProjection[];
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export function UpcomingPayments({ payments, dateRange }: UpcomingPaymentsProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let label = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    if (dayDiff === 0) {
      label += ' (Today)';
    } else if (dayDiff === 1) {
      label += ' (Tomorrow)';
    } else if (dayDiff > 0 && dayDiff <= 7) {
      label += ` (In ${dayDiff} days)`;
    }

    return label;
  };

  const toggleExpanded = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Show first 10 payments by default
  const displayedPayments = showAll ? payments : payments.slice(0, 10);
  const hasMore = payments.length > 10;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Payments</h2>
          <span className="text-sm text-gray-500">({payments.length} days with payments)</span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No payments scheduled for this period</p>
          <p className="text-xs mt-1">Try selecting a different date range or syncing new data</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedPayments.map((payment) => {
            const isExpanded = expandedDates.has(payment.date);

            return (
              <div
                key={payment.date}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
              >
                {/* Payment Summary */}
                <button
                  onClick={() => toggleExpanded(payment.date)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(payment.date)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {payment.count} payment{payment.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Customer Details (Expanded) */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-white border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Customers:</p>
                    <div className="space-y-1">
                      {payment.customers.map((customer, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-700 pl-3 py-1 border-l-2 border-blue-300"
                        >
                          {customer}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show More / Show Less Button */}
          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-xs"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show All ({payments.length - 10} more)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
