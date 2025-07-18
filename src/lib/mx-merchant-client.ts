import { MXInvoiceListResponse, MXInvoiceDetail } from '@/types/invoice';

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
      ? 'https://api.mxmerchant.com' 
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
  } = {}): Promise<MXInvoiceListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.merchantId) queryParams.append('merchantId', params.merchantId);

    const endpoint = `/checkout/v3/invoice${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.makeRequest<MXInvoiceListResponse>(endpoint);
  }

  /**
   * Get detailed invoice information with products
   */
  async getInvoiceDetail(invoiceId: number): Promise<MXInvoiceDetail> {
    const endpoint = `/checkout/v3/invoice/${invoiceId}`;
    return this.makeRequest<MXInvoiceDetail>(endpoint);
  }

  /**
   * Get all invoices with pagination handling
   */
  async getAllInvoices(merchantId?: string): Promise<MXInvoiceListResponse> {
    const limit = 100;
    let offset = 0;
    let allInvoices: any[] = [];
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

// Create a singleton instance with environment credentials
export const mxMerchantClient = new MXMerchantClient(
  process.env.MX_MERCHANT_CONSUMER_KEY || '',
  process.env.MX_MERCHANT_CONSUMER_SECRET || '',
  (process.env.MX_MERCHANT_ENVIRONMENT as 'sandbox' | 'production') || 'production'
);

// Simplified function for invoice detail page
export async function getMXInvoiceDetail(invoiceId: number): Promise<MXInvoiceDetail> {
  return mxMerchantClient.getInvoiceDetail(invoiceId);
}

// Utility functions for transforming MX Merchant data to our internal format
export function transformMXInvoiceToInvoice(mxInvoice: any, userId: string): any {
  return {
    id: `mx-${mxInvoice.id}`, // Will be replaced with UUID when saving to database
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    // MX Merchant fields
    mx_invoice_id: mxInvoice.id,
    invoice_number: mxInvoice.invoiceNumber,
    customer_name: mxInvoice.customerName || '',
    customer_number: mxInvoice.customerNumber || '',
    invoice_date: mxInvoice.invoiceDate ? new Date(mxInvoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    due_date: mxInvoice.dueDate ? new Date(mxInvoice.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    api_created: mxInvoice.created || new Date().toISOString(),
    status: mxInvoice.status || 'Unknown',
    subtotal_amount: parseFloat(mxInvoice.subTotalAmount || '0'),
    tax_amount: parseFloat(mxInvoice.taxAmount || '0'),
    discount_amount: parseFloat(mxInvoice.discountAmount || '0'),
    total_amount: parseFloat(mxInvoice.totalAmount || '0'),
    balance: parseFloat(mxInvoice.balance || '0'),
    paid_amount: parseFloat(mxInvoice.paidAmount || '0'),
    currency: mxInvoice.currency || 'USD',
    receipt_number: mxInvoice.receiptNumber || '',
    quantity: parseInt(mxInvoice.quantity || '1'),
    return_quantity: parseInt(mxInvoice.returnQuantity || '0'),
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

export function transformMXPurchaseToInvoiceItem(mxPurchase: any, invoiceId: string): any {
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
    api_created: mxPurchase.created || new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}