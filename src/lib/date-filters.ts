/**
 * Centralized date filtering utilities using Texas timezone (America/Chicago)
 * Replaces duplicated date logic across dashboards
 *
 * IMPORTANT: All date ranges are generated in Central Time (CST/CDT)
 * - Returns UTC timestamp boundaries for the requested Texas timezone date range
 * - Ensures consistent filtering regardless of user's location or server timezone
 * - Example: "Today" means "today in Texas" converted to UTC timestamp range
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface DateRange {
  start: string | undefined;
  end: string | undefined;
}

const TEXAS_TIMEZONE = 'America/Chicago';

/**
 * Get start of day (00:00:00) in Texas timezone, converted to UTC ISO string
 */
function getTexasStartOfDayUTC(date: Date = new Date()): string {
  // Convert current UTC time to Texas timezone
  const texasDate = toZonedTime(date, TEXAS_TIMEZONE);

  // Set to start of day in Texas timezone
  texasDate.setHours(0, 0, 0, 0);

  // Convert back to UTC
  const utcDate = fromZonedTime(texasDate, TEXAS_TIMEZONE);

  return utcDate.toISOString();
}

/**
 * Get end of day (23:59:59.999) in Texas timezone, converted to UTC ISO string
 */
function getTexasEndOfDayUTC(date: Date = new Date()): string {
  // Convert current UTC time to Texas timezone
  const texasDate = toZonedTime(date, TEXAS_TIMEZONE);

  // Set to end of day in Texas timezone
  texasDate.setHours(23, 59, 59, 999);

  // Convert back to UTC
  const utcDate = fromZonedTime(texasDate, TEXAS_TIMEZONE);

  return utcDate.toISOString();
}

/**
 * Get start of week (Sunday 00:00:00) in Texas timezone, converted to UTC
 */
function getTexasStartOfWeekUTC(date: Date = new Date()): string {
  const texasDate = toZonedTime(date, TEXAS_TIMEZONE);

  // Get to Sunday (start of week)
  const day = texasDate.getDay();
  texasDate.setDate(texasDate.getDate() - day);
  texasDate.setHours(0, 0, 0, 0);

  const utcDate = fromZonedTime(texasDate, TEXAS_TIMEZONE);
  return utcDate.toISOString();
}

/**
 * Get start of month (1st day 00:00:00) in Texas timezone, converted to UTC
 */
function getTexasStartOfMonthUTC(date: Date = new Date()): string {
  const texasDate = toZonedTime(date, TEXAS_TIMEZONE);

  // Set to first day of month
  texasDate.setDate(1);
  texasDate.setHours(0, 0, 0, 0);

  const utcDate = fromZonedTime(texasDate, TEXAS_TIMEZONE);
  return utcDate.toISOString();
}

/**
 * Get start of year (Jan 1st 00:00:00) in Texas timezone, converted to UTC
 */
function getTexasStartOfYearUTC(date: Date = new Date()): string {
  const texasDate = toZonedTime(date, TEXAS_TIMEZONE);

  // Set to Jan 1st
  texasDate.setMonth(0, 1);
  texasDate.setHours(0, 0, 0, 0);

  const utcDate = fromZonedTime(texasDate, TEXAS_TIMEZONE);
  return utcDate.toISOString();
}

/**
 * Convert date range filter to UTC timestamp boundaries for Texas timezone dates
 * Used by all dashboard APIs for consistent filtering
 *
 * Returns UTC ISO timestamp strings representing the start and end of the date range
 * in Texas timezone (America/Chicago). This allows Supabase to use simple timestamp
 * comparison instead of complex PostgreSQL AT TIME ZONE expressions.
 *
 * Example: "today" returns:
 *   start: "2025-12-11T06:00:00.000Z" (Dec 11 00:00:00 CST)
 *   end:   "2025-12-12T05:59:59.999Z" (Dec 11 23:59:59 CST)
 *
 * @param dateRange - Filter option: 'all' | 'today' | 'week' | 'month' | 'year'
 * @returns Object with start and end UTC ISO timestamp strings
 */
export function getDateRange(dateRange: string): DateRange {
  if (dateRange === 'all') {
    return { start: undefined, end: undefined };
  }

  const now = new Date();

  switch (dateRange) {
    case 'today':
      // Today in Texas timezone (00:00:00 to 23:59:59 CST/CDT)
      return {
        start: getTexasStartOfDayUTC(now),
        end: getTexasEndOfDayUTC(now)
      };

    case 'week':
      // This week in Texas timezone (Sunday 00:00:00 to today 23:59:59 CST/CDT)
      return {
        start: getTexasStartOfWeekUTC(now),
        end: getTexasEndOfDayUTC(now)
      };

    case 'month':
      // This month in Texas timezone (1st day 00:00:00 to today 23:59:59 CST/CDT)
      return {
        start: getTexasStartOfMonthUTC(now),
        end: getTexasEndOfDayUTC(now)
      };

    case 'year':
      // This year in Texas timezone (Jan 1 00:00:00 to today 23:59:59 CST/CDT)
      return {
        start: getTexasStartOfYearUTC(now),
        end: getTexasEndOfDayUTC(now)
      };

    default:
      return { start: undefined, end: undefined };
  }
}