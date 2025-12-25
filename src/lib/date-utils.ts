/**
 * Date Utilities for Revenue Projection
 *
 * This module provides timezone-safe date handling utilities to ensure
 * consistent date comparisons across different timezones.
 *
 * All dates are handled in UTC to avoid timezone-related bugs.
 */

/**
 * Parse a date string and return a UTC Date object at midnight
 *
 * Handles both formats:
 * - ISO format: "2025-12-25T00:00:00Z"
 * - PostgreSQL format: "2025-12-25 00:00:00+00"
 *
 * @param dateString - Date string in YYYY-MM-DD or full timestamp format
 * @returns Date object set to midnight UTC
 *
 * @example
 * parseDateUTC("2025-12-25") // => Date(2025-12-25T00:00:00.000Z)
 * parseDateUTC("2025-12-25T12:00:00Z") // => Date(2025-12-25T00:00:00.000Z)
 * parseDateUTC("2025-12-25 00:00:00+00") // => Date(2025-12-25T00:00:00.000Z)
 */
export function parseDateUTC(dateString: string): Date {
  // Extract YYYY-MM-DD from various formats
  const dateOnly = dateString.split(/[T\s]/)[0];
  const parts = dateOnly.split('-');

  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD.`);
  }

  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
  const day = parseInt(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date components: ${dateString}`);
  }

  return new Date(Date.UTC(year, month, day));
}

/**
 * Get current date in UTC at midnight
 *
 * @returns Date object for today at midnight UTC
 *
 * @example
 * getTodayUTC() // => Date(2025-12-25T00:00:00.000Z) if today is Dec 25
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
}

/**
 * Add days to a UTC date
 *
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object with days added
 *
 * @example
 * addDaysUTC(getTodayUTC(), 30) // => 30 days from today
 * addDaysUTC(getTodayUTC(), -7) // => 7 days ago
 */
export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Format a Date object to YYYY-MM-DD string
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateYMD(new Date("2025-12-25")) // => "2025-12-25"
 */
export function formatDateYMD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate difference in days between two dates (in UTC)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates (positive if date2 is after date1)
 *
 * @example
 * const today = getTodayUTC();
 * const tomorrow = addDaysUTC(today, 1);
 * diffDaysUTC(today, tomorrow) // => 1
 */
export function diffDaysUTC(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Check if a date is within a range (inclusive)
 *
 * @param date - Date to check
 * @param startDate - Range start (inclusive)
 * @param endDate - Range end (inclusive)
 * @returns True if date is within range
 *
 * @example
 * const today = getTodayUTC();
 * const tomorrow = addDaysUTC(today, 1);
 * const nextWeek = addDaysUTC(today, 7);
 * isWithinRange(tomorrow, today, nextWeek) // => true
 */
export function isWithinRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Parse date range preset to start and end dates
 *
 * @param preset - Preset value ('7days', '30days', '90days')
 * @returns Object with start and end dates
 *
 * @example
 * parseDateRangePreset('30days')
 * // => { startDate: <today>, endDate: <today + 30 days> }
 */
export function parseDateRangePreset(
  preset: '7days' | '30days' | '90days'
): { startDate: Date; endDate: Date; days: number } {
  const startDate = getTodayUTC();
  const days = preset === '7days' ? 7 : preset === '30days' ? 30 : 90;
  const endDate = addDaysUTC(startDate, days);

  return { startDate, endDate, days };
}

/**
 * Validate YYYY-MM-DD date string format
 *
 * @param dateString - Date string to validate
 * @returns True if valid YYYY-MM-DD format
 *
 * @example
 * isValidDateString("2025-12-25") // => true
 * isValidDateString("25-12-2025") // => false
 * isValidDateString("not-a-date") // => false
 */
export function isValidDateString(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  try {
    const date = parseDateUTC(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Extract YYYY-MM-DD from various date string formats
 *
 * Supports:
 * - ISO format: "2025-12-25T00:00:00Z"
 * - PostgreSQL format: "2025-12-25 00:00:00+00"
 * - Simple format: "2025-12-25"
 *
 * @param dateString - Date string in any supported format
 * @returns YYYY-MM-DD string
 *
 * @example
 * extractDateOnly("2025-12-25T12:00:00Z") // => "2025-12-25"
 * extractDateOnly("2025-12-25 00:00:00+00") // => "2025-12-25"
 * extractDateOnly("2025-12-25") // => "2025-12-25"
 */
export function extractDateOnly(dateString: string): string {
  // Handle both ISO format (YYYY-MM-DDTHH:mm:ssZ) and PostgreSQL format (YYYY-MM-DD HH:mm:ss+00)
  return dateString.split(/[T\s]/)[0];
}
