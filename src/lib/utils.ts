import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatTexasDate, formatTexasDateTime, getTexasRelativeTime } from '@/lib/timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Format date
export function formatDate(dateString: string): string {
  return formatTexasDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format date and time
export function formatDateTime(dateString: string): string {
  return formatTexasDateTime(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const diffInMs = getTexasRelativeTime(dateString);
  const diffInSeconds = Math.floor(diffInMs / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(dateString);
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'unpaid':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'partial':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'refunded':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'cancelled':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Get data sent status color
export function getDataSentStatusColor(status: 'pending' | 'yes' | 'no'): string {
  switch (status) {
    case 'yes':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'no':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'pending':
    default:
      return 'text-orange-600 bg-orange-50 border-orange-200';
  }
}

// Get data sent status label
export function getDataSentStatusLabel(status: 'pending' | 'yes' | 'no'): string {
  switch (status) {
    case 'yes':
      return 'Data Sent';
    case 'no':
      return 'Not Sent';
    case 'pending':
    default:
      return 'Pending';
  }
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Generate internal admin URL
export function getInternalInvoiceUrl(invoiceId: string): string {
  return `/dashboard/invoices/${invoiceId}`;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}