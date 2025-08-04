// Invoice types matching MX Merchant API structure
export interface Invoice {
  // Internal database fields
  id: string;
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
  invoice_id?: string;
  transaction_id?: string;
  status: 'yes' | 'no';
  notes?: string;
}

// Transaction/Payment types for MX Merchant Payment API
export interface Transaction {
  // Internal database fields
  id: string;
  created_at: string;
  updated_at: string;
  
  // MX Merchant Payment API fields
  mx_payment_id: number;
  amount: number;
  transaction_date: string;
  status: 'Approved' | 'Declined' | string;
  
  // Invoice Linking
  mx_invoice_number?: number | null;
  invoice_id?: string | null;
  client_reference?: string | null;
  
  // Customer Info
  customer_name?: string | null;
  customer_code?: string | null;
  
  // Payment Details
  auth_code?: string | null;
  auth_message?: string | null;
  response_code?: number | null;
  reference_number?: string | null;
  
  // Card Details
  card_type?: string | null;
  card_last4?: string | null;
  card_token?: string | null;
  
  // Financial Details
  currency: string;
  tax_amount?: number | null;
  surcharge_amount?: number | null;
  surcharge_label?: string | null;
  refunded_amount: number;
  settled_amount: number;
  
  // Transaction Metadata
  tender_type?: string | null;
  transaction_type?: string | null;
  source?: string | null;
  batch?: string | null;
  merchant_id?: number | null;
  
  // System Fields
  raw_data: Record<string, unknown> | null;
}

// MX Merchant Payment API response types
export interface MXPaymentListResponse {
  recordCount: number;
  records: MXPayment[];
}

export interface MXPayment {
  id: number;
  amount: string;
  created: string;
  status: 'Approved' | 'Declined' | string;
  invoice?: string | null; // Links to invoice number
  clientReference?: string | null;
  customerName?: string | null;
  customerCode?: string | null;
  merchantId: number;
  authCode?: string | null;
  authMessage?: string | null;
  responseCode?: number | null;
  reference?: string | null;
  cardAccount?: {
    cardType: string;
    last4: string;
    token: string;
  } | null;
  currency?: string;
  tax?: string | null;
  surchargeAmount?: string | null;
  surchargeLabel?: string | null;
  tenderType?: string | null;
  type?: string | null;
  source?: string | null;
  batch?: string | null;
  refundedAmount?: string | null;
  settledAmount?: string | null;
}

export interface MXPaymentDetail extends MXPayment {
  // Additional fields that might be in detail view
  fullCardNumber?: string;
  billingAddress?: Record<string, unknown>;
  shippingAddress?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}