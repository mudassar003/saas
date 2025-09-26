/**
 * Centralized date filtering utilities using Texas timezone
 * Replaces duplicated date logic across dashboards
 */

import {
  getTexasNow,
  getTexasStartOfDay,
  getTexasStartOfWeek,
  getTexasStartOfMonth,
  getTexasStartOfYear
} from '@/lib/timezone';

export interface DateRange {
  start: string | undefined;
  end: string | undefined;
}

/**
 * Convert date range filter to actual dates in Texas timezone
 * Used by all dashboard APIs for consistent filtering
 */
export function getDateRange(dateRange: string): DateRange {
  if (dateRange === 'all') {
    return { start: undefined, end: undefined };
  }

  const now = getTexasNow();
  const today = getTexasStartOfDay(now);
  const todayStr = today.toISOString().split('T')[0];

  switch (dateRange) {
    case 'today':
      return { start: todayStr, end: todayStr };

    case 'week':
      const weekStart = getTexasStartOfWeek(now);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: todayStr
      };

    case 'month':
      // FIXED: From 1st of current month to today (exactly what user requested)
      const monthStart = getTexasStartOfMonth(now);
      return {
        start: monthStart.toISOString().split('T')[0],
        end: todayStr
      };

    case 'year':
      const yearStart = getTexasStartOfYear(now);
      return {
        start: yearStart.toISOString().split('T')[0],
        end: todayStr
      };

    default:
      return { start: undefined, end: undefined };
  }
}