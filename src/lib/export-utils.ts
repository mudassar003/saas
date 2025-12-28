/**
 * CSV Export Utilities
 * Low-code, high-quality utilities for exporting data to CSV
 */

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | boolean | null);
  formatter?: (value: unknown) => string;
}

/**
 * Convert data to CSV format
 */
export function convertToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  if (!data.length) return '';

  // Create header row
  const headers = columns.map((col) => escapeCSV(col.header)).join(',');

  // Create data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value: unknown;

        // Get value using accessor
        if (typeof col.accessor === 'function') {
          value = col.accessor(row);
        } else {
          value = row[col.accessor];
        }

        // Apply formatter if provided
        if (col.formatter && value !== null && value !== undefined) {
          value = col.formatter(value);
        }

        // Convert to string and escape
        return escapeCSV(String(value ?? ''));
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Escape CSV values (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV with one function call
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const csv = convertToCSV(data, columns);
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.csv`;

  downloadCSV(csv, fullFilename);
}

/**
 * Common formatters for CSV export
 */
export const formatters = {
  date: (value: unknown): string => {
    if (!value) return '';
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  },

  dateTime: (value: unknown): string => {
    if (!value) return '';
    try {
      return new Date(String(value)).toLocaleString();
    } catch {
      return String(value);
    }
  },

  currency: (value: unknown): string => {
    if (!value) return '$0.00';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return `$${num.toFixed(2)}`;
  },

  boolean: (value: unknown): string => {
    return value ? 'Yes' : 'No';
  },

  truncate: (maxLength: number) => (value: unknown): string => {
    const str = String(value ?? '');
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  },
};
