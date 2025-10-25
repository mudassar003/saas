// Contract types matching MX Merchant Contract API structure

/**
 * Contract database record (stored in our database)
 */
export interface Contract {
  // Internal database fields
  id: string;
  created_at: string;
  updated_at: string;
  last_synced_at: string;

  // MX Merchant API fields
  mx_contract_id: number;
  mx_subscription_id: number | null;
  contract_name: string | null;
  merchant_id: number;
  customer_name: string;
  billing_interval: 'Weekly' | 'Monthly' | 'Once' | string | null;
  billing_frequency: string | null; // "1 Week", "4 Weeks", "10 Weeks", "Once"
  billing_day: string | null; // "Monday", "Saturday", or specific date
  amount: number;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Inactive' | string;
  type: string | null; // "Recurring"
  start_date: string | null;
  next_bill_date: string | null;
  last_invoice_date: string | null;
  has_declined_payment: boolean;
  grand_total_amount: number | null;
  currency_code: string;
  raw_data: Record<string, unknown> | null;
}

/**
 * Contract from MX Merchant API response
 */
export interface MXContract {
  id: number;
  subscriptionId: number;
  merchantId: number;
  name: string; // Contract number
  customerName: string;
  interval: 'Weekly' | 'Monthly' | 'Once' | string;
  every: string; // "1 Week", "4 Weeks", "10 Weeks", "Once"
  on: string; // Day of week or specific date
  amount: string;
  type: string;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Inactive' | string;
  startDate: string;
  nextBillDate: string;
  lastInvoiceDate?: string;
  hasDeclinedPayment: boolean;
  grandTotalAmount: string;
  currencyCode?: string;
  declinedInvoiceId?: number;
  declinedInvoiceNumber?: number;
  declinedReason?: string;
}

/**
 * Contract list response from MX Merchant API
 */
export interface MXContractListResponse {
  recordCount: number;
  records: MXContract[];
  totals: {
    grandTotalAmount: string;
  };
}

/**
 * Revenue projection request
 */
export interface ProjectionRequest {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  merchantId?: number; // Optional - will be determined from auth
}

/**
 * Revenue projection response
 */
export interface ProjectionResponse {
  success: boolean;
  data: {
    dateRange: {
      start: string;
      end: string;
      days: number;
    };
    currentRevenue: {
      total: number;
      transactionCount: number;
      averageTransaction: number;
    };
    projectedRevenue: {
      total: number;
      contractCount: number;
      upcomingPayments: DailyProjection[];
    };
    metrics: {
      totalTransactions: number;
      approvedTransactions: number;
      declinedTransactions: number;
      activeContracts: number;
      cancelledContracts: number;
      completedContracts: number;
      monthlyRecurringRevenue: number;
    };
    lastSyncedAt: string | null;
    dataSource: 'database';
  };
}

/**
 * Daily projection breakdown
 */
export interface DailyProjection {
  date: string;
  amount: number;
  count: number;
  customers: string[];
}

/**
 * Contract sync request
 */
export interface ContractSyncRequest {
  merchantId?: number; // Optional - will be determined from auth
  status?: 'Active' | 'Completed' | 'Cancelled'; // Optional filter
}

/**
 * Contract sync response
 */
export interface ContractSyncResponse {
  success: boolean;
  message: string;
  stats: {
    totalFetched: number;
    newRecords: number;
    updatedRecords: number;
    apiCalls: number;
    syncDuration: string;
  };
  lastSyncedAt: string;
}

/**
 * MRR calculation result
 */
export interface MRRCalculation {
  contractId: string;
  customerName: string;
  amount: number;
  billingInterval: string;
  billingFrequency: string;
  paymentsPerMonth: number;
  mrr: number;
}
