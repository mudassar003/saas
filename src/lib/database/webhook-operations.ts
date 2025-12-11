import { createClient } from '@supabase/supabase-js';
import { MXPaymentDetail, MXInvoiceDetail, MXWebhookPayload } from '@/types/invoice';
import { toDate } from 'date-fns-tz';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookTransactionData {
  mx_payment_id: number;
  amount: number;
  transaction_date: string;
  status: string;
  customer_name: string | null;
  card_type: string | null;
  card_last4: string | null;
  auth_code: string | null;
  source: string | null;
  merchant_id: number;
  mx_invoice_number: number | null;
  mx_invoice_id: number | null;
  product_name: string | null;
  product_category: string | null;
  invoice_id: string | null;
  raw_data: Record<string, unknown>;
}

interface WebhookInvoiceData {
  mx_invoice_id: number;
  invoice_number: number;
  customer_name: string | null;
  customer_id: number | null;
  total_amount: number;
  status: string;
  invoice_date: string;
  merchant_id: number;
  billing_address: Record<string, unknown> | null;
  raw_data: Record<string, unknown>;
}

export async function saveTransactionFromWebhook(transactionData: WebhookTransactionData): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      mx_payment_id: transactionData.mx_payment_id,
      amount: transactionData.amount,
      transaction_date: transactionData.transaction_date,
      status: transactionData.status,
      customer_name: transactionData.customer_name,
      card_type: transactionData.card_type,
      card_last4: transactionData.card_last4,
      auth_code: transactionData.auth_code,
      source: transactionData.source,
      merchant_id: transactionData.merchant_id,
      mx_invoice_number: transactionData.mx_invoice_number,
      mx_invoice_id: transactionData.mx_invoice_id,
      product_name: transactionData.product_name,
      product_category: transactionData.product_category,
      invoice_id: transactionData.invoice_id,
      raw_data: transactionData.raw_data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Failed to save transaction: ${error.message}`);
  }
  
  return data;
}

export async function saveInvoiceFromWebhook(invoiceData: WebhookInvoiceData): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      mx_invoice_id: invoiceData.mx_invoice_id,
      invoice_number: invoiceData.invoice_number,
      customer_name: invoiceData.customer_name,
      customer_id: invoiceData.customer_id,
      total_amount: invoiceData.total_amount,
      status: invoiceData.status,
      invoice_date: invoiceData.invoice_date,
      merchant_id: invoiceData.merchant_id,
      billing_address: invoiceData.billing_address,
      raw_data: invoiceData.raw_data,
      data_sent_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Failed to save invoice: ${error.message}`);
  }
  
  return data;
}

export async function lookupProductCategory(productName: string, merchantId: string): Promise<string> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('category')
    .eq('merchant_id', parseInt(merchantId))
    .eq('product_name', productName)
    .eq('is_active', true)
    .single();
    
  if (error || !data) {
    // Return default category if no mapping found
    return 'Uncategorized';
  }
  
  return data.category;
}

export async function updateTransactionInvoiceLink(transactionId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ 
      invoice_id: invoiceId,
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId);
    
  if (error) {
    throw new Error(`Failed to link transaction to invoice: ${error.message}`);
  }
}

export async function logWebhookProcessing(
  merchantId: string,
  transactionId: number,
  status: 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  const { error } = await supabase
    .from('sync_logs')
    .insert({
      sync_type: 'webhook',
      status,
      records_processed: status === 'success' ? 1 : 0,
      records_failed: status === 'success' ? 0 : 1,
      error_message: errorMessage || null,
      started_at: timestamp,
      completed_at: timestamp,
      api_calls_made: status === 'success' ? 2 : 1, // Payment detail + invoice detail calls
      last_processed_payment_id: transactionId,
      transactions_processed: status === 'success' ? 1 : 0,
      transactions_failed: status === 'success' ? 0 : 1
    });
    
  if (error) {
    console.error('Failed to log webhook processing:', error);
    // Don't throw error here to avoid failing webhook processing
  }
}

/**
 * Parse MX Merchant date format "Aug 9 2018 6:21PM" to ISO string
 * with explicit timezone context (America/Chicago for GameDay Men's Health)
 *
 * MX Merchant provides two date fields in webhooks:
 * - transactionDate: Server/processing time (ambiguous timezone)
 * - localDate: Merchant's configured local timezone (preferred)
 *
 * @param dateString - Date string from MX Merchant webhook
 * @param timezone - IANA timezone identifier (default: America/Chicago)
 * @returns ISO 8601 date string in UTC
 */
function parseMXMerchantLocalDate(
  dateString: string,
  timezone: string = 'America/Chicago'
): string {
  if (!dateString) return new Date().toISOString();

  try {
    // MX Merchant format: "Aug 9 2018 6:21PM"
    // Parse date string first (JavaScript will use system timezone)
    const parsedDate = new Date(dateString);

    if (isNaN(parsedDate.getTime())) {
      console.warn(`[Webhook] Failed to parse MX Merchant date: ${dateString}`);
      return new Date().toISOString();
    }

    // Format the parsed date to a timezone-naive string
    // This represents the date/time as shown in MX Merchant (merchant's local time)
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    const seconds = String(parsedDate.getSeconds()).padStart(2, '0');

    // Create date string in format: "2018-08-09 18:21:00"
    const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Convert from merchant's timezone (America/Chicago) to UTC
    // toDate interprets the date string as being in the specified timezone
    const utcDate = toDate(dateTimeString, { timeZone: timezone });

    return utcDate.toISOString();
  } catch (error) {
    console.warn(`[Webhook] Error parsing MX Merchant date: ${dateString}`, error);
    return new Date().toISOString();
  }
}

export function transformPaymentDetailToTransaction(
  paymentDetail: MXPaymentDetail,
  webhookPayload: MXWebhookPayload,
  productName: string | null = null,
  productCategory: string | null = null,
  invoiceId: string | null = null
): WebhookTransactionData {
  // ✅ UPDATED: Prefer localDate (merchant's timezone), fallback to transactionDate
  // MX Merchant provides localDate in the merchant's configured timezone (America/Chicago)
  // This ensures consistent timezone handling regardless of server location
  const merchantTimezone = 'America/Chicago';

  let authenticTransactionDate: string;
  let dateSource: string;

  if (webhookPayload.localDate) {
    // Preferred: Use merchant's local timezone date
    authenticTransactionDate = parseMXMerchantLocalDate(webhookPayload.localDate, merchantTimezone);
    dateSource = 'localDate';
  } else if (webhookPayload.transactionDate) {
    // Fallback: Use transaction date (assuming it's also in merchant's timezone)
    authenticTransactionDate = parseMXMerchantLocalDate(webhookPayload.transactionDate, merchantTimezone);
    dateSource = 'transactionDate';
  } else if (paymentDetail.created) {
    // Last resort: Use API created timestamp (already in ISO format)
    authenticTransactionDate = paymentDetail.created;
    dateSource = 'paymentDetail.created';
  } else {
    // Ultimate fallback: Current time
    authenticTransactionDate = new Date().toISOString();
    dateSource = 'current_time';
  }

  // Log date source for debugging
  console.log(`[Webhook] Date source: ${dateSource}`);
  console.log(`[Webhook] Original: ${webhookPayload.localDate || webhookPayload.transactionDate || paymentDetail.created}`);
  console.log(`[Webhook] Converted to UTC: ${authenticTransactionDate}`);

  return {
    mx_payment_id: paymentDetail.id,
    amount: parseFloat(paymentDetail.amount || '0'),
    transaction_date: authenticTransactionDate, // ✅ Now correctly in UTC from merchant's local time
    status: paymentDetail.status || 'Unknown',
    customer_name: paymentDetail.customerName || webhookPayload.customer || null,
    card_type: paymentDetail.cardAccount?.cardType || webhookPayload.card || null,
    card_last4: paymentDetail.cardAccount?.last4 || webhookPayload.pan4 || null,
    auth_code: paymentDetail.authCode || webhookPayload.authorizationCode || null,
    source: paymentDetail.source || webhookPayload.source || null,
    merchant_id: paymentDetail.merchantId || parseInt(webhookPayload.merchantId),
    mx_invoice_number: paymentDetail.invoice ? parseInt(paymentDetail.invoice) : null,
    mx_invoice_id: paymentDetail.invoiceIds?.[0] || null,
    product_name: productName,
    product_category: productCategory,
    invoice_id: invoiceId,
    raw_data: paymentDetail as unknown as Record<string, unknown>
  };
}

export function transformInvoiceDetailToInvoice(
  invoiceDetail: MXInvoiceDetail,
  merchantId: string
): WebhookInvoiceData {
  return {
    mx_invoice_id: invoiceDetail.id,
    invoice_number: invoiceDetail.invoiceNumber,
    customer_name: invoiceDetail.customer?.name || null,
    customer_id: invoiceDetail.customer?.id || null,
    total_amount: parseFloat(invoiceDetail.totalAmount || '0'),
    status: invoiceDetail.status || 'Unknown',
    invoice_date: invoiceDetail.invoiceDate || new Date().toISOString(),
    merchant_id: parseInt(merchantId),
    billing_address: invoiceDetail.billingAddress || null,
    raw_data: invoiceDetail as unknown as Record<string, unknown>
  };
}