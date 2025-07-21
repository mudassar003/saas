/**
 * Centralized timezone utility for Texas/Central Time Zone
 * Handles CST/CDT conversion and provides consistent date/time operations
 */

export const TEXAS_TIMEZONE = 'America/Chicago';

/**
 * Get current date/time in Texas timezone
 */
export function getTexasNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TEXAS_TIMEZONE }));
}

/**
 * Convert any date to Texas timezone
 */
export function toTexasTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.toLocaleString('en-US', { timeZone: TEXAS_TIMEZONE }));
}

/**
 * Get ISO string in Texas timezone (for database storage)
 */
export function getTexasISOString(date?: Date): string {
  const texasDate = date ? toTexasTime(date) : getTexasNow();
  return texasDate.toISOString();
}

/**
 * Format date in Texas timezone
 */
export function formatTexasDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    timeZone: TEXAS_TIMEZONE,
    ...options
  });
}

/**
 * Format date and time in Texas timezone
 */
export function formatTexasDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    timeZone: TEXAS_TIMEZONE,
    ...options
  });
}

/**
 * Get start of day in Texas timezone
 */
export function getTexasStartOfDay(date?: Date): Date {
  const targetDate = date ? toTexasTime(date) : getTexasNow();
  const texasStart = new Date(targetDate);
  texasStart.setHours(0, 0, 0, 0);
  return texasStart;
}

/**
 * Get end of day in Texas timezone
 */
export function getTexasEndOfDay(date?: Date): Date {
  const targetDate = date ? toTexasTime(date) : getTexasNow();
  const texasEnd = new Date(targetDate);
  texasEnd.setHours(23, 59, 59, 999);
  return texasEnd;
}

/**
 * Get start of week in Texas timezone (Sunday)
 */
export function getTexasStartOfWeek(date?: Date): Date {
  const targetDate = date ? toTexasTime(date) : getTexasNow();
  const texasStart = new Date(targetDate);
  const day = texasStart.getDay();
  const diff = texasStart.getDate() - day;
  texasStart.setDate(diff);
  texasStart.setHours(0, 0, 0, 0);
  return texasStart;
}

/**
 * Get start of month in Texas timezone
 */
export function getTexasStartOfMonth(date?: Date): Date {
  const targetDate = date ? toTexasTime(date) : getTexasNow();
  const texasStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  return toTexasTime(texasStart);
}

/**
 * Get start of year in Texas timezone
 */
export function getTexasStartOfYear(date?: Date): Date {
  const targetDate = date ? toTexasTime(date) : getTexasNow();
  const texasStart = new Date(targetDate.getFullYear(), 0, 1);
  return toTexasTime(texasStart);
}

/**
 * Get next midnight in Texas timezone
 */
export function getTexasNextMidnight(): Date {
  const tomorrow = getTexasNow();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Format date for file naming (YYYY-MM-DD in Texas time)
 */
export function getTexasDateForFilename(date?: Date): string {
  const targetDate = date ? toTexasTime(date) : getTexasNow();
  return targetDate.toISOString().split('T')[0];
}

/**
 * Get 24 hours ago in Texas timezone
 */
export function getTexas24HoursAgo(): Date {
  const now = getTexasNow();
  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Check if a date is today in Texas timezone
 */
export function isTexasToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = getTexasNow();
  const targetDate = toTexasTime(dateObj);
  
  return today.toDateString() === targetDate.toDateString();
}

/**
 * Get relative time difference (for date-fns compatibility)
 */
export function getTexasRelativeTime(date: Date | string): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const targetDate = toTexasTime(dateObj);
  const now = getTexasNow();
  
  return now.getTime() - targetDate.getTime();
}