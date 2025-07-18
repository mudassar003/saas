// Invoice types matching MX Merchant API structure
export interface Invoice {
  // Internal database fields
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // MX Merchant API fields
  mx_invoice_id: number;
  invoice_number: number;
  customer_name: string;
  customer_number?: string;
  invoice_date: string;
  due_date: string;
  api_created: string;
  status: 'Paid' | 'Unpaid' | 'Partial' | 'Refunded' | 'Cancelled';
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  balance: number;
  paid_amount: number;
  currency: string;
  receipt_number: string;
  quantity: number;
  return_quantity: number;
  return_status: string;
  source_type: string;
  type: string;
  terms: string;
  memo?: string;
  is_tax_exempt: boolean;
  merchant_id: number;
  raw_data: Record<string, unknown>;
  
  // Nurse workflow fields
  data_sent_status: 'pending' | 'yes' | 'no';
  data_sent_by?: string;
  data_sent_at?: string;
  data_sent_notes?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  mx_purchase_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal_amount: number;
  tax_amount: number;
  discount_amount: number;
  price_discount_amount: number;
  total_amount: number;
  quantity_returned: number;
  tracking_number?: number;
  api_created: string;
  created_at: string;
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
  type: string;
  terms: string;
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
  quantity: number;
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
  total_amount: number;
  invoice_date: string;
  data_sent_status: 'pending' | 'yes' | 'no';
  data_sent_by?: string;
  data_sent_at?: string;
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