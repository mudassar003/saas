// Invoice types matching MX Merchant API structure
export interface Invoice {
  // Internal database fields
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // MX Merchant API fields
  mx_invoice_id: number | null;
  invoice_number: number | null;
  customer_name: string | null;
  customer_number?: string | null;
  customer_email?: string | null;
  invoice_date: string | null;
  due_date: string | null;
  api_created: string | null;
  status: 'Paid' | 'Unpaid' | 'Partial' | 'Refunded' | 'Cancelled' | 'PastDue' | string | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  balance: number | null;
  paid_amount: number | null;
  currency: string | null;
  receipt_number: string | null;
  quantity: number | null;
  return_quantity: number | null;
  return_status: string | null;
  source_type: string | null;
  type: string | null;
  terms: string | null;
  memo?: string | null;
  is_tax_exempt: boolean | null;
  merchant_id: number | null;
  raw_data: Record<string, unknown> | null;
  
  // Nurse workflow fields
  data_sent_status: 'pending' | 'yes' | 'no' | string;
  data_sent_by?: string | null;
  data_sent_at?: string | null;
  data_sent_notes?: string | null;
  ordered_by_provider_at?: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  mx_purchase_id: number | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  price_discount_amount: number | null;
  total_amount: number | null;
  quantity_returned: number | null;
  tracking_number?: number | null;
  api_created: string | null;
  created_at: string | null;
}

// MX Merchant API response types
export interface MXInvoiceListResponse {
  recordCount: number;
  records: MXInvoice[];
  totals: {
    grandTotalAmount: string;
  };
}

export interface MXInvoice {
  id: number;
  invoiceNumber: number;
  customerName: string;
  customerNumber?: string;
  status: string;
  totalAmount: string;
  subTotalAmount: string;
  balance: string;
  paidAmount: string;
  invoiceDate: string;
  dueDate: string;
  created: string;
  receiptNumber: string;
  quantity: string;
  merchantId: number;
  sourceType: string;
  type: string | null;
  terms: string | null;
  taxAmount?: string;
  discountAmount: string;
  returnQuantity: string;
  returnStatus: string;
  memo?: string;
  isTaxExempt: boolean;
  currency?: string;
}

export interface MXInvoiceDetail extends MXInvoice {
  purchases: MXPurchase[];
  customer: {
    id: number;
    name: string;
  };
  payments: Record<string, unknown>[];
  taxes: Record<string, unknown>[];
}

export interface MXPurchase {
  id: number;
  productName: string;
  quantity: number | null;
  price: string;
  subTotalAmount: string;
  taxAmount: string;
  discountAmount: string;
  priceDiscountAmount: string;
  totalAmount: string;
  quantityReturned: number;
  trackingNumber: number;
  created: string;
}

// Table and UI types
export interface InvoiceTableRow {
  id: string;
  invoice_number: number;
  customer_name: string;
  status: string;
  total_amount: number | null;
  invoice_date: string;
  data_sent_status: 'pending' | 'yes' | 'no' | string;
  data_sent_by?: string;
  data_sent_at?: string;
  ordered_by_provider_at?: string;
}

export interface DataSentUpdate {
  invoice_id: string;
  status: 'yes' | 'no';
  notes?: string;
}

export interface ExportOptions {
  format: 'excel' | 'csv';
  include_products: boolean;
  export_scope: 'filtered' | 'all';
  date_range?: {
    from: string;
    to: string;
  };
  status_filter?: string[];
  data_sent_filter?: ('pending' | 'yes' | 'no')[];
}