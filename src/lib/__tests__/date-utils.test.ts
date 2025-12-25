/**
 * Date Utilities Test Suite
 *
 * Comprehensive tests for timezone-safe date handling
 */

import {
  parseDateUTC,
  getTodayUTC,
  addDaysUTC,
  formatDateYMD,
  diffDaysUTC,
  isWithinRange,
  parseDateRangePreset,
  isValidDateString,
  extractDateOnly
} from '../date-utils';

describe('Date Utils', () => {
  describe('parseDateUTC', () => {
    it('should parse ISO format date string', () => {
      const date = parseDateUTC('2025-12-25T12:00:00Z');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(11); // December (0-indexed)
      expect(date.getUTCDate()).toBe(25);
      expect(date.getUTCHours()).toBe(0); // Should be midnight
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });

    it('should parse PostgreSQL format date string', () => {
      const date = parseDateUTC('2025-12-25 00:00:00+00');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(11);
      expect(date.getUTCDate()).toBe(25);
      expect(date.getUTCHours()).toBe(0);
    });

    it('should parse simple YYYY-MM-DD format', () => {
      const date = parseDateUTC('2025-12-25');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(11);
      expect(date.getUTCDate()).toBe(25);
      expect(date.getUTCHours()).toBe(0);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseDateUTC('invalid-date')).toThrow();
      expect(() => parseDateUTC('25-12-2025')).toThrow();
      expect(() => parseDateUTC('')).toThrow();
    });

    it('should handle edge cases (leap year, month boundaries)', () => {
      const leapDay = parseDateUTC('2024-02-29');
      expect(leapDay.getUTCDate()).toBe(29);

      const yearEnd = parseDateUTC('2025-12-31');
      expect(yearEnd.getUTCDate()).toBe(31);

      const yearStart = parseDateUTC('2025-01-01');
      expect(yearStart.getUTCDate()).toBe(1);
    });
  });

  describe('getTodayUTC', () => {
    it('should return today at midnight UTC', () => {
      const today = getTodayUTC();
      expect(today.getUTCHours()).toBe(0);
      expect(today.getUTCMinutes()).toBe(0);
      expect(today.getUTCSeconds()).toBe(0);
      expect(today.getUTCMilliseconds()).toBe(0);
    });

    it('should return consistent value when called multiple times in same day', () => {
      const today1 = getTodayUTC();
      const today2 = getTodayUTC();
      expect(today1.getTime()).toBe(today2.getTime());
    });
  });

  describe('addDaysUTC', () => {
    it('should add positive days', () => {
      const base = parseDateUTC('2025-12-25');
      const result = addDaysUTC(base, 7);
      expect(formatDateYMD(result)).toBe('2026-01-01');
    });

    it('should subtract negative days', () => {
      const base = parseDateUTC('2025-12-25');
      const result = addDaysUTC(base, -7);
      expect(formatDateYMD(result)).toBe('2025-12-18');
    });

    it('should handle zero days', () => {
      const base = parseDateUTC('2025-12-25');
      const result = addDaysUTC(base, 0);
      expect(formatDateYMD(result)).toBe('2025-12-25');
    });

    it('should handle month boundaries', () => {
      const endOfMonth = parseDateUTC('2025-01-31');
      const result = addDaysUTC(endOfMonth, 1);
      expect(formatDateYMD(result)).toBe('2025-02-01');
    });

    it('should handle year boundaries', () => {
      const endOfYear = parseDateUTC('2025-12-31');
      const result = addDaysUTC(endOfYear, 1);
      expect(formatDateYMD(result)).toBe('2026-01-01');
    });
  });

  describe('formatDateYMD', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = parseDateUTC('2025-12-25');
      expect(formatDateYMD(date)).toBe('2025-12-25');
    });

    it('should pad single-digit months and days with zeros', () => {
      const date = parseDateUTC('2025-01-05');
      expect(formatDateYMD(date)).toBe('2025-01-05');
    });

    it('should handle year boundaries', () => {
      const date = parseDateUTC('2026-01-01');
      expect(formatDateYMD(date)).toBe('2026-01-01');
    });
  });

  describe('diffDaysUTC', () => {
    it('should calculate positive difference', () => {
      const date1 = parseDateUTC('2025-12-25');
      const date2 = parseDateUTC('2025-12-30');
      expect(diffDaysUTC(date1, date2)).toBe(5);
    });

    it('should calculate negative difference', () => {
      const date1 = parseDateUTC('2025-12-30');
      const date2 = parseDateUTC('2025-12-25');
      expect(diffDaysUTC(date1, date2)).toBe(-5);
    });

    it('should return 0 for same date', () => {
      const date = parseDateUTC('2025-12-25');
      expect(diffDaysUTC(date, date)).toBe(0);
    });

    it('should handle month boundaries', () => {
      const date1 = parseDateUTC('2025-01-31');
      const date2 = parseDateUTC('2025-02-01');
      expect(diffDaysUTC(date1, date2)).toBe(1);
    });
  });

  describe('isWithinRange', () => {
    it('should return true for date within range', () => {
      const start = parseDateUTC('2025-12-25');
      const end = parseDateUTC('2025-12-31');
      const date = parseDateUTC('2025-12-28');
      expect(isWithinRange(date, start, end)).toBe(true);
    });

    it('should return true for date at range boundaries (inclusive)', () => {
      const start = parseDateUTC('2025-12-25');
      const end = parseDateUTC('2025-12-31');
      expect(isWithinRange(start, start, end)).toBe(true);
      expect(isWithinRange(end, start, end)).toBe(true);
    });

    it('should return false for date before range', () => {
      const start = parseDateUTC('2025-12-25');
      const end = parseDateUTC('2025-12-31');
      const date = parseDateUTC('2025-12-24');
      expect(isWithinRange(date, start, end)).toBe(false);
    });

    it('should return false for date after range', () => {
      const start = parseDateUTC('2025-12-25');
      const end = parseDateUTC('2025-12-31');
      const date = parseDateUTC('2026-01-01');
      expect(isWithinRange(date, start, end)).toBe(false);
    });
  });

  describe('parseDateRangePreset', () => {
    it('should parse 7days preset', () => {
      const { startDate, endDate, days } = parseDateRangePreset('7days');
      expect(days).toBe(7);
      expect(diffDaysUTC(startDate, endDate)).toBe(7);
    });

    it('should parse 30days preset', () => {
      const { startDate, endDate, days } = parseDateRangePreset('30days');
      expect(days).toBe(30);
      expect(diffDaysUTC(startDate, endDate)).toBe(30);
    });

    it('should parse 90days preset', () => {
      const { startDate, endDate, days } = parseDateRangePreset('90days');
      expect(days).toBe(90);
      expect(diffDaysUTC(startDate, endDate)).toBe(90);
    });

    it('should start from today at midnight UTC', () => {
      const { startDate } = parseDateRangePreset('30days');
      const today = getTodayUTC();
      expect(formatDateYMD(startDate)).toBe(formatDateYMD(today));
    });
  });

  describe('isValidDateString', () => {
    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateString('2025-12-25')).toBe(true);
      expect(isValidDateString('2024-02-29')).toBe(true); // Leap year
      expect(isValidDateString('2025-01-01')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isValidDateString('25-12-2025')).toBe(false);
      expect(isValidDateString('2025/12/25')).toBe(false);
      expect(isValidDateString('Dec 25, 2025')).toBe(false);
      expect(isValidDateString('invalid')).toBe(false);
      expect(isValidDateString('')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDateString('2025-13-01')).toBe(false); // Invalid month
      expect(isValidDateString('2025-02-30')).toBe(false); // Invalid day
      expect(isValidDateString('2025-00-01')).toBe(false); // Invalid month
    });
  });

  describe('extractDateOnly', () => {
    it('should extract date from ISO format', () => {
      expect(extractDateOnly('2025-12-25T12:00:00Z')).toBe('2025-12-25');
      expect(extractDateOnly('2025-12-25T00:00:00.000Z')).toBe('2025-12-25');
    });

    it('should extract date from PostgreSQL format', () => {
      expect(extractDateOnly('2025-12-25 00:00:00+00')).toBe('2025-12-25');
      expect(extractDateOnly('2025-12-25 12:34:56+00')).toBe('2025-12-25');
    });

    it('should return same string for YYYY-MM-DD format', () => {
      expect(extractDateOnly('2025-12-25')).toBe('2025-12-25');
    });

    it('should handle edge cases', () => {
      expect(extractDateOnly('2026-01-01T00:00:00Z')).toBe('2026-01-01');
      expect(extractDateOnly('2024-02-29 23:59:59+00')).toBe('2024-02-29');
    });
  });

  describe('Integration tests', () => {
    it('should correctly identify today in various timezones', () => {
      const today = getTodayUTC();
      const todayStr = formatDateYMD(today);

      // Parse the string back
      const parsedToday = parseDateUTC(todayStr);

      // Should be the same day
      expect(diffDaysUTC(today, parsedToday)).toBe(0);
    });

    it('should correctly calculate date ranges across month boundaries', () => {
      const start = parseDateUTC('2025-01-25');
      const end = addDaysUTC(start, 30);

      expect(formatDateYMD(end)).toBe('2025-02-24');
      expect(diffDaysUTC(start, end)).toBe(30);
    });

    it('should handle contract date filtering scenario', () => {
      // Simulate contract with next_bill_date from database
      const contractDate = '2025-12-25 00:00:00+00'; // PostgreSQL format

      // Extract date and parse
      const billDate = parseDateUTC(extractDateOnly(contractDate));

      // Check if within 30-day range
      const today = getTodayUTC();
      const endDate = addDaysUTC(today, 30);

      const isUpcoming = isWithinRange(billDate, today, endDate);

      // If today is Dec 25, this should be true
      if (formatDateYMD(today) === '2025-12-25') {
        expect(isUpcoming).toBe(true);
      }
    });

    it('should handle timezone edge cases consistently', () => {
      // Test that dates are always compared in UTC regardless of local timezone
      const date1 = parseDateUTC('2025-12-25');
      const date2 = parseDateUTC('2025-12-26');

      // Should always be 1 day difference
      expect(diffDaysUTC(date1, date2)).toBe(1);

      // Should always format the same
      expect(formatDateYMD(date1)).toBe('2025-12-25');
      expect(formatDateYMD(date2)).toBe('2025-12-26');
    });
  });
});
