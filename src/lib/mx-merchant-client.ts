import {
  MXInvoiceListResponse,
  MXInvoiceDetail,
  MXInvoice,
  MXPurchase,
  InvoiceItem,
  MXPaymentListResponse,
  MXPaymentDetail,
  MXPayment,
  Transaction
} from '@/types/invoice';
import {
  MXContractListResponse,
  MXContract,
  Contract
} from '@/types/contract';
import { getTexasISOString, getTexasDateForFilename } from '@/lib/timezone';
import { getMerchantCredentials } from '@/lib/database/merchant-credentials';

export class MXMerchantClient {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(
    consumerKey: string,
    consumerSecret: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ) {
    this.baseUrl = environment === 'sandbox' 
      ? 'https://sandbox.api.mxmerchant.com' 
      : 'https://api.mxmerchant.com';
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MX Merchant API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get list of invoices with pagination
   */
  async getInvoices(params: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    created?: string;
  } = {}): Promise<MXInvoiceListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.merchantId) queryParams.append('merchantId', params.merchantId);
    if (params.created) queryParams.append('created', params.created);

    const endpoint = `/checkout/v3/invoice${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.makeRequest<MXInvoiceListResponse>(endpoint);
  }

  /**
   * Get detailed invoice information with products
   */
  async getInvoiceDetail(invoiceId: number, merchantId?: string): Promise<MXInvoiceDetail> {
    const queryParams = merchantId ? `?merchantId=${merchantId}` : '';
    const endpoint = `/checkout/v3/invoice/${invoiceId}${queryParams}`;
    return this.makeRequest<MXInvoiceDetail>(endpoint);
  }

  /**
   * Get all invoices with pagination handling
   */
  async getAllInvoices(merchantId?: string): Promise<MXInvoiceListResponse> {
    const limit = 100;
    let offset = 0;
    const allInvoices: MXInvoice[] = [];
    let totalCount = 0;
    let grandTotalAmount = '0';

    while (true) {
      const response = await this.getInvoices({ limit, offset, merchantId });
      
      allInvoices.push(...response.records);
      totalCount = response.recordCount;
      grandTotalAmount = response.totals.grandTotalAmount;

      // If we got fewer records than requested, we've reached the end
      if (response.records.length < limit) {
        break;
      }

      offset += limit;

      // Safety check to avoid infinite loops
      if (offset > totalCount) {
        break;
      }
    }

    return {
      recordCount: totalCount,
      records: allInvoices,
      totals: {
        grandTotalAmount
      }
    };
  }

  /**
   * Get invoices with detailed product information
   */
  async getInvoicesWithDetails(invoiceIds: number[]): Promise<MXInvoiceDetail[]> {
    const detailPromises = invoiceIds.map(id => this.getInvoiceDetail(id));
    return Promise.all(detailPromises);
  }

  /**
   * Get list of payments/transactions with pagination
   */
  async getPayments(params: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    created?: string;
  } = {}): Promise<MXPaymentListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.merchantId) queryParams.append('merchantId', params.merchantId);
    if (params.created) queryParams.append('created', params.created);

    const endpoint = `/checkout/v3/payment${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.makeRequest<MXPaymentListResponse>(endpoint);
  }

  /**
   * Get detailed payment/transaction information
   */
  async getPaymentDetail(paymentId: number, merchantId?: string): Promise<MXPaymentDetail> {
    const queryParams = merchantId ? `?merchantId=${merchantId}` : '';
    const endpoint = `/checkout/v3/payment/${paymentId}${queryParams}`;
    return this.makeRequest<MXPaymentDetail>(endpoint);
  }

  /**
   * Get all payments/transactions with pagination handling
   */
  async getAllPayments(merchantId?: string): Promise<MXPaymentListResponse> {
    const limit = 100;
    let offset = 0;
    const allPayments: MXPayment[] = [];
    let totalCount = 0;

    while (true) {
      const response = await this.getPayments({ limit, offset, merchantId });
      
      allPayments.push(...response.records);
      totalCount = response.recordCount;

      // If we got fewer records than requested, we've reached the end
      if (response.records.length < limit) {
        break;
      }

      offset += limit;

      // Safety check to avoid infinite loops
      if (offset > totalCount) {
        break;
      }
    }

    return {
      recordCount: totalCount,
      records: allPayments
    };
  }

  /**
   * Get payments/transactions with detailed information
   */
  async getPaymentsWithDetails(paymentIds: number[]): Promise<MXPaymentDetail[]> {
    const detailPromises = paymentIds.map(id => this.getPaymentDetail(id));
    return Promise.all(detailPromises);
  }

  /**
   * Get all transactions and invoices (combined data)
   */
  async getAllTransactionsAndInvoices(merchantId?: string): Promise<{
    transactions: MXPayment[];
    invoices: MXInvoice[];
  }> {
    const [paymentsResponse, invoicesResponse] = await Promise.all([
      this.getAllPayments(merchantId),
      this.getAllInvoices(merchantId)
    ]);

    return {
      transactions: paymentsResponse.records,
      invoices: invoicesResponse.records
    };
  }

  /**
   * Get contracts with pagination
   *
   * @param params.merchantId - Merchant ID (required for tenant isolation)
   * @param params.limit - Records per page (default: 100, max: 100)
   * @param params.offset - Pagination offset (0, 100, 200, etc.)
   * @param params.status - Filter by status: 'Active', 'Completed', 'Cancelled', 'Inactive'
   *
   * @returns Contract list with pagination info
   *
   * @note Date filtering NOT supported by API - filter in database after fetching
   */
  async getContracts(params: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    status?: 'Active' | 'Completed' | 'Cancelled' | 'Inactive';
  } = {}): Promise<MXContractListResponse> {
    const queryParams = new URLSearchParams();

    if (params.merchantId) queryParams.append('merchantId', params.merchantId);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.status) queryParams.append('status', params.status);

    const endpoint = `/checkout/v3/contract${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<MXContractListResponse>(endpoint);
  }

  /**
   * Get all contracts with automatic pagination
   * Fetches ALL contracts from API (recommended: fetch only Active contracts)
   *
   * @param merchantId - Merchant ID (required)
   * @param status - Optional status filter ('Active' recommended to reduce data volume)
   *
   * @returns All contracts with totals
   *
   * @example
   * // Recommended: Fetch only Active contracts
   * const activeContracts = await getAllContracts('1000095245', 'Active');
   *
   * // Fetch all contracts (Active, Completed, Cancelled)
   * const allContracts = await getAllContracts('1000095245');
   */
  async getAllContracts(
    merchantId?: string,
    status?: 'Active' | 'Completed' | 'Cancelled' | 'Inactive'
  ): Promise<MXContractListResponse> {
    const limit = 100; // Max allowed by API
    let offset = 0;
    const allContracts: MXContract[] = [];
    let totalCount = 0;
    let grandTotalAmount = '0';

    while (true) {
      const response = await this.getContracts({
        limit,
        offset,
        merchantId,
        status // Filter by status to reduce data volume
      });

      allContracts.push(...response.records);
      totalCount = response.recordCount;
      grandTotalAmount = response.totals?.grandTotalAmount || '0';

      // Break if we got fewer records than requested (last page)
      if (response.records.length < limit) {
        break;
      }

      offset += limit;

      // Safety check to prevent infinite loop
      if (offset >= totalCount) {
        break;
      }
    }

    return {
      recordCount: totalCount,
      records: allContracts,
      totals: { grandTotalAmount }
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getInvoices({ limit: 1 });
      return response.recordCount >= 0;
    } catch (error) {
      console.error('MX Merchant API connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance with environment credentials (legacy support)
export const mxMerchantClient = new MXMerchantClient(
  process.env.MX_MERCHANT_CONSUMER_KEY || '',
  process.env.MX_MERCHANT_CONSUMER_SECRET || '',
  (process.env.MX_MERCHANT_ENVIRONMENT as 'sandbox' | 'production') || 'production'
);

// Create MX Merchant client instance with dynamic credentials for specific merchant
export async function createMXClientForMerchant(merchantId: string): Promise<MXMerchantClient> {
  const credentials = await getMerchantCredentials(merchantId);
  
  return new MXMerchantClient(
    credentials.username,
    credentials.password,
    credentials.environment
  );
}

// Simplified function for invoice detail page
export async function getMXInvoiceDetail(invoiceId: number): Promise<MXInvoiceDetail> {
  return mxMerchantClient.getInvoiceDetail(invoiceId);
}

// Utility functions for transforming MX Merchant data to our internal format
export function transformMXInvoiceToInvoice(mxInvoice: Record<string, unknown>, userId: string): Record<string, unknown> {
  return {
    id: `mx-${mxInvoice.id}`, // Will be replaced with UUID when saving to database
    user_id: userId,
    created_at: getTexasISOString(),
    updated_at: getTexasISOString(),
    
    // MX Merchant fields
    mx_invoice_id: mxInvoice.id,
    invoice_number: mxInvoice.invoiceNumber,
    customer_name: mxInvoice.customerName || '',
    customer_number: mxInvoice.customerNumber || '',
    invoice_date: mxInvoice.invoiceDate && typeof mxInvoice.invoiceDate === 'string' ? getTexasDateForFilename(new Date(mxInvoice.invoiceDate)) : getTexasDateForFilename(),
    due_date: mxInvoice.dueDate && typeof mxInvoice.dueDate === 'string' ? getTexasDateForFilename(new Date(mxInvoice.dueDate)) : getTexasDateForFilename(),
    api_created: mxInvoice.created && typeof mxInvoice.created === 'string' ? getTexasISOString(new Date(mxInvoice.created)) : getTexasISOString(),
    status: mxInvoice.status || 'Unknown',
    subtotal_amount: parseFloat(typeof mxInvoice.subTotalAmount === 'string' ? mxInvoice.subTotalAmount : '0'),
    tax_amount: parseFloat(typeof mxInvoice.taxAmount === 'string' ? mxInvoice.taxAmount : '0'),
    discount_amount: parseFloat(typeof mxInvoice.discountAmount === 'string' ? mxInvoice.discountAmount : '0'),
    total_amount: parseFloat(typeof mxInvoice.totalAmount === 'string' ? mxInvoice.totalAmount : '0'),
    balance: parseFloat(typeof mxInvoice.balance === 'string' ? mxInvoice.balance : '0'),
    paid_amount: parseFloat(typeof mxInvoice.paidAmount === 'string' ? mxInvoice.paidAmount : '0'),
    currency: mxInvoice.currency || 'USD',
    receipt_number: mxInvoice.receiptNumber || '',
    quantity: parseInt(typeof mxInvoice.quantity === 'string' ? mxInvoice.quantity : '1'),
    return_quantity: parseInt(typeof mxInvoice.returnQuantity === 'string' ? mxInvoice.returnQuantity : '0'),
    return_status: mxInvoice.returnStatus || 'None',
    source_type: mxInvoice.sourceType || '',
    type: mxInvoice.type || 'Sale',
    terms: mxInvoice.terms || '',
    memo: mxInvoice.memo || '',
    is_tax_exempt: mxInvoice.isTaxExempt || false,
    merchant_id: mxInvoice.merchantId || 0,
    raw_data: mxInvoice,
    
    // Nurse workflow fields (defaults)
    data_sent_status: 'pending' as const,
    data_sent_by: undefined,
    data_sent_at: undefined,
    data_sent_notes: undefined,
  };
}

export function transformMXPurchaseToInvoiceItem(mxPurchase: MXPurchase, invoiceId: string): InvoiceItem {
  return {
    id: `mx-purchase-${mxPurchase.id}`, // Will be replaced with UUID when saving to database
    invoice_id: invoiceId,
    mx_purchase_id: mxPurchase.id,
    product_name: mxPurchase.productName || 'Unknown Product',
    quantity: mxPurchase.quantity || 1,
    unit_price: parseFloat(mxPurchase.price || '0'),
    subtotal_amount: parseFloat(mxPurchase.subTotalAmount || '0'),
    tax_amount: parseFloat(mxPurchase.taxAmount || '0'),
    discount_amount: parseFloat(mxPurchase.discountAmount || '0'),
    price_discount_amount: parseFloat(mxPurchase.priceDiscountAmount || '0'),
    total_amount: parseFloat(mxPurchase.totalAmount || '0'),
    quantity_returned: mxPurchase.quantityReturned || 0,
    tracking_number: mxPurchase.trackingNumber || 0,
    api_created: mxPurchase.created || getTexasISOString(),
    created_at: getTexasISOString(),
  };
}

export function transformMXPaymentToTransaction(mxPayment: MXPayment): Omit<Transaction, 'id'> {
  return {
    created_at: getTexasISOString(),
    updated_at: getTexasISOString(),

    // MX Merchant Payment fields
    mx_payment_id: mxPayment.id,
    amount: parseFloat(mxPayment.amount || '0'),
    transaction_date: mxPayment.created ? getTexasISOString(new Date(mxPayment.created)) : getTexasISOString(),
    status: mxPayment.status || 'Unknown',

    // Invoice Linking
    mx_invoice_number: mxPayment.invoice ? parseInt(mxPayment.invoice) : null,
    mx_invoice_id: mxPayment.invoiceIds?.length ? mxPayment.invoiceIds[0] : null, // NEW: Direct API access
    invoice_id: null, // Will be populated during sync when linking to existing invoices
    client_reference: mxPayment.clientReference || null,

    // Customer Info
    customer_name: mxPayment.customerName || null,
    customer_code: mxPayment.customerCode || null,

    // Payment Details
    auth_code: mxPayment.authCode || null,
    auth_message: mxPayment.authMessage || null,
    response_code: mxPayment.responseCode || null,
    reference_number: mxPayment.reference || null,

    // Card Details
    card_type: mxPayment.cardAccount?.cardType || null,
    card_last4: mxPayment.cardAccount?.last4 || null,
    card_token: mxPayment.cardAccount?.token || null,

    // Financial Details
    currency: mxPayment.currency || 'USD',
    tax_amount: mxPayment.tax ? parseFloat(mxPayment.tax) : null,
    surcharge_amount: mxPayment.surchargeAmount ? parseFloat(mxPayment.surchargeAmount) : null,
    surcharge_label: mxPayment.surchargeLabel || null,
    refunded_amount: mxPayment.refundedAmount ? parseFloat(mxPayment.refundedAmount) : 0,
    settled_amount: mxPayment.settledAmount ? parseFloat(mxPayment.settledAmount) : 0,

    // Transaction Metadata
    tender_type: mxPayment.tenderType || null,
    transaction_type: mxPayment.type || null,
    source: mxPayment.source || null,
    batch: mxPayment.batch || null,
    merchant_id: mxPayment.merchantId || null,

    // System Fields
    raw_data: mxPayment as unknown as Record<string, unknown>,
  };
}

/**
 * Transform MX Contract to internal Contract format
 */
export function transformMXContractToContract(mxContract: MXContract): Omit<Contract, 'id' | 'created_at' | 'updated_at'> {
  return {
    last_synced_at: getTexasISOString(),

    // MX Merchant Contract fields
    mx_contract_id: mxContract.id,
    mx_subscription_id: mxContract.subscriptionId,
    contract_name: mxContract.name,
    merchant_id: mxContract.merchantId,
    customer_name: mxContract.customerName,
    billing_interval: mxContract.interval,
    billing_frequency: mxContract.every,
    billing_day: mxContract.on,
    amount: parseFloat(mxContract.amount),
    status: mxContract.status,
    type: mxContract.type,
    start_date: mxContract.startDate,
    next_bill_date: mxContract.nextBillDate,
    last_invoice_date: mxContract.lastInvoiceDate || null,
    has_declined_payment: mxContract.hasDeclinedPayment,
    grand_total_amount: parseFloat(mxContract.grandTotalAmount),
    currency_code: mxContract.currencyCode || 'USD',
    raw_data: mxContract as unknown as Record<string, unknown>,
  };
}