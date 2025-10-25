import { Contract, MRRCalculation } from '@/types/contract';

/**
 * Calculate Monthly Recurring Revenue (MRR) for a single contract
 *
 * Based on actual production data analysis:
 * - 1 Week interval: 4.3333 payments/month (52 weeks ÷ 12 months)
 * - 4 Weeks interval: 1.0833 payments/month (13 payments ÷ 12 months)
 * - 10 Weeks interval: 0.4333 payments/month (5.2 payments ÷ 12 months)
 *
 * @param contract - Contract from database
 * @returns Monthly recurring revenue amount
 */
export function calculateContractMRR(contract: Contract): number {
  // Only active contracts contribute to MRR
  if (contract.status !== 'Active') return 0;

  // One-time payments don't contribute to recurring revenue
  if (contract.billing_interval === 'Once') return 0;

  // Weekly subscriptions (only interval type found in production)
  if (contract.billing_interval === 'Weekly') {
    const weeks = parseInt(contract.billing_frequency?.split(' ')[0] || '1');
    const paymentsPerMonth = 52 / 12 / weeks; // More precise: 4.3333 instead of 4.33
    return contract.amount * paymentsPerMonth;
  }

  // Monthly subscriptions (not found in production, but supported)
  if (contract.billing_interval === 'Monthly') {
    return contract.amount; // 1 payment per month
  }

  return 0;
}

/**
 * Calculate total MRR for all active contracts
 *
 * @param contracts - Array of contracts from database
 * @returns Total monthly recurring revenue
 */
export function calculateTotalMRR(contracts: Contract[]): number {
  return contracts.reduce((sum, contract) => {
    return sum + calculateContractMRR(contract);
  }, 0);
}

/**
 * Calculate detailed MRR breakdown for all contracts
 *
 * @param contracts - Array of contracts from database
 * @returns Array of MRR calculations with details
 */
export function calculateMRRBreakdown(contracts: Contract[]): MRRCalculation[] {
  return contracts
    .filter(c => c.status === 'Active' && c.billing_interval !== 'Once')
    .map(contract => {
      const weeks = contract.billing_interval === 'Weekly'
        ? parseInt(contract.billing_frequency?.split(' ')[0] || '1')
        : 0;
      const paymentsPerMonth = weeks > 0 ? 52 / 12 / weeks : 1;
      const mrr = calculateContractMRR(contract);

      return {
        contractId: contract.id,
        customerName: contract.customer_name,
        amount: contract.amount,
        billingInterval: contract.billing_interval || '',
        billingFrequency: contract.billing_frequency || '',
        paymentsPerMonth,
        mrr
      };
    });
}

/**
 * Calculate projected revenue for a specific date range
 * Based on next_bill_date field from contracts
 *
 * @param contracts - Array of contracts from database
 * @param startDate - Start date of projection period
 * @param endDate - End date of projection period
 * @returns Total projected revenue for the period
 */
export function calculateProjectedRevenue(
  contracts: Contract[],
  startDate: Date,
  endDate: Date
): number {
  return contracts
    .filter(c => c.status === 'Active')
    .filter(c => {
      if (!c.next_bill_date) return false;
      const nextBill = new Date(c.next_bill_date);
      // Payment due within selected date range
      return nextBill >= startDate && nextBill <= endDate;
    })
    .reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Get daily projection breakdown for upcoming payments
 *
 * @param contracts - Array of contracts from database
 * @param startDate - Start date of projection period
 * @param endDate - End date of projection period
 * @returns Array of daily projections with customer details
 */
export function getDailyProjections(
  contracts: Contract[],
  startDate: Date,
  endDate: Date
): Array<{
  date: string;
  amount: number;
  count: number;
  customers: string[];
}> {
  // Filter contracts billing within range
  const upcomingContracts = contracts
    .filter(c => c.status === 'Active')
    .filter(c => {
      if (!c.next_bill_date) return false;
      const nextBill = new Date(c.next_bill_date);
      return nextBill >= startDate && nextBill <= endDate;
    });

  // Group by date
  const dailyMap = new Map<string, {
    amount: number;
    count: number;
    customers: string[];
  }>();

  upcomingContracts.forEach(contract => {
    if (!contract.next_bill_date) return;

    const dateKey = contract.next_bill_date.split('T')[0]; // Get YYYY-MM-DD
    const existing = dailyMap.get(dateKey) || { amount: 0, count: 0, customers: [] };

    existing.amount += contract.amount;
    existing.count += 1;
    existing.customers.push(contract.customer_name);

    dailyMap.set(dateKey, existing);
  });

  // Convert to array and sort by date
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      ...data
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate revenue statistics for contracts
 *
 * @param contracts - Array of contracts from database
 * @returns Statistics object with counts by status
 */
export function calculateContractStatistics(contracts: Contract[]): {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  inactive: number;
  totalMRR: number;
  averageContractValue: number;
} {
  const active = contracts.filter(c => c.status === 'Active');
  const completed = contracts.filter(c => c.status === 'Completed');
  const cancelled = contracts.filter(c => c.status === 'Cancelled');
  const inactive = contracts.filter(c => c.status === 'Inactive');

  const totalMRR = calculateTotalMRR(contracts);
  const averageContractValue = active.length > 0
    ? active.reduce((sum, c) => sum + c.amount, 0) / active.length
    : 0;

  return {
    total: contracts.length,
    active: active.length,
    completed: completed.length,
    cancelled: cancelled.length,
    inactive: inactive.length,
    totalMRR,
    averageContractValue
  };
}

/**
 * Parse date range string to start and end dates
 * Handles common presets and custom ranges
 *
 * @param preset - Preset value ('7days', '30days', '90days') or null for custom
 * @param customStart - Custom start date (optional)
 * @param customEnd - Custom end date (optional)
 * @returns Object with start and end dates
 */
export function parseDateRange(
  preset: '7days' | '30days' | '90days' | null,
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date; days: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate: Date;
  let endDate: Date;

  if (preset) {
    startDate = new Date(today);
    endDate = new Date(today);

    switch (preset) {
      case '7days':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case '30days':
        endDate.setDate(endDate.getDate() + 30);
        break;
      case '90days':
        endDate.setDate(endDate.getDate() + 90);
        break;
    }
  } else if (customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
  } else {
    // Default: next 30 days
    startDate = new Date(today);
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
  }

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return { startDate, endDate, days };
}
