import { supabaseAdmin } from './supabase'
import { MXMerchantClient } from './mx-merchant-client'
import { MXPayment, MXInvoiceDetail } from '@/types/invoice'

interface SyncResult {
  success: boolean
  transactionsProcessed: number
  invoicesProcessed: number
  productsProcessed: number
  errors: string[]
}

/**
 * Simple sync implementation following database schema
 * 1. Get N transactions from user input
 * 2. Save transactions to database
 * 3. Extract mx_invoice_id from transactions
 * 4. Fetch invoice details for those invoice IDs
 * 5. Map products from invoice details
 */
export class SimpleSyncService {
  private mxClient: MXMerchantClient

  constructor(consumerKey: string, consumerSecret: string, environment: 'sandbox' | 'production') {
    this.mxClient = new MXMerchantClient(consumerKey, consumerSecret, environment)
  }

  /**
   * Main sync function - exactly what you requested
   */
  async syncTransactions(count: number, dateFilter?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      transactionsProcessed: 0,
      invoicesProcessed: 0,
      productsProcessed: 0,
      errors: []
    }

    try {
      console.log(`Starting simple sync for ${count} transactions`)

      // Step 1: Fetch transactions from MX Merchant (with optional date filter)
      const params: { limit: number; created?: string } = { limit: count }
      if (dateFilter) {
        params.created = dateFilter
      }
      
      const paymentsResponse = await this.mxClient.getPayments(params)
      const transactions = paymentsResponse.records || []
      
      if (transactions.length === 0) {
        result.errors.push('No transactions found')
        return result
      }

      // Step 2: Save transactions to database
      const savedTransactions = await this.saveTransactions(transactions)
      result.transactionsProcessed = savedTransactions.success
      result.errors.push(...savedTransactions.errors)

      // Step 3: Extract mx_invoice_id from transactions that have invoiceIds
      const invoiceIds = this.extractInvoiceIds(transactions)
      
      if (invoiceIds.length === 0) {
        console.log('No invoice IDs found in transactions')
        result.success = result.errors.length === 0
        return result
      }

      // Step 4: Fetch and save invoices
      const invoiceResult = await this.fetchAndSaveInvoices(invoiceIds)
      result.invoicesProcessed = invoiceResult.success
      result.errors.push(...invoiceResult.errors)

      // Step 5: Map products to transactions (NEW - this was missing!)
      const productMappingResult = await this.mapProductsToTransactions()
      result.productsProcessed = productMappingResult.success
      result.errors.push(...productMappingResult.errors)

      result.success = result.errors.length === 0
      console.log(`Sync completed: ${result.transactionsProcessed} transactions, ${result.invoicesProcessed} invoices, ${result.productsProcessed} products mapped`)

      return result

    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Save transactions to database
   */
  private async saveTransactions(payments: MXPayment[]): Promise<{ success: number; errors: string[] }> {
    const result = { success: 0, errors: [] as string[] }

    // Transform to database format
    const transactionInserts = payments.map(payment => ({
      mx_payment_id: payment.id,
      amount: parseFloat(payment.amount || '0'),
      transaction_date: payment.created || new Date().toISOString(),
      status: payment.status || 'Unknown',
      
      // Store mx_invoice_id directly from invoiceIds array (NEW FIELD)
      mx_invoice_id: payment.invoiceIds?.length ? payment.invoiceIds[0] : null,
      mx_invoice_number: payment.invoice ? parseInt(payment.invoice) : null,
      client_reference: payment.clientReference || null,
      
      customer_name: payment.customerName || null,
      customer_code: payment.customerCode || null,
      auth_code: payment.authCode || null,
      auth_message: payment.authMessage || null,
      response_code: payment.responseCode || null,
      reference_number: payment.reference || null,
      
      card_type: payment.cardAccount?.cardType || null,
      card_last4: payment.cardAccount?.last4 || null,
      card_token: payment.cardAccount?.token || null,
      
      currency: payment.currency || 'USD',
      tax_amount: payment.tax ? parseFloat(payment.tax) : null,
      surcharge_amount: payment.surchargeAmount ? parseFloat(payment.surchargeAmount) : null,
      surcharge_label: payment.surchargeLabel || null,
      refunded_amount: payment.refundedAmount ? parseFloat(payment.refundedAmount) : 0,
      settled_amount: payment.settledAmount ? parseFloat(payment.settledAmount) : 0,
      
      tender_type: payment.tenderType || null,
      transaction_type: payment.type || null,
      source: payment.source || null,
      batch: payment.batch || null,
      merchant_id: payment.merchantId || null,
      
      raw_data: payment
    }))

    // Filter out existing transactions
    const existingIds = await this.getExistingTransactionIds(payments.map(p => p.id))
    const newTransactions = transactionInserts.filter(t => !existingIds.has(t.mx_payment_id))

    if (newTransactions.length === 0) {
      console.log('All transactions already exist in database')
      result.success = payments.length
      return result
    }

    // Insert new transactions
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert(newTransactions)
      .select('id')

    if (error) {
      result.errors.push(`Failed to save transactions: ${error.message}`)
    } else {
      result.success = data?.length || 0
      console.log(`Saved ${result.success} new transactions`)
    }

    return result
  }

  /**
   * Extract invoice IDs from transactions
   */
  private extractInvoiceIds(transactions: MXPayment[]): number[] {
    const invoiceIds: number[] = []
    
    for (const transaction of transactions) {
      // Use invoiceIds array (direct API access) - this is the key improvement
      if (transaction.invoiceIds && transaction.invoiceIds.length > 0) {
        invoiceIds.push(...transaction.invoiceIds)
      }
    }

    // Return unique invoice IDs
    return [...new Set(invoiceIds)]
  }

  /**
   * Fetch invoices by ID and save to database
   */
  private async fetchAndSaveInvoices(invoiceIds: number[]): Promise<{ success: number; errors: string[] }> {
    const result = { success: 0, errors: [] as string[] }

    // Filter out existing invoices
    const existingInvoiceIds = await this.getExistingInvoiceIds(invoiceIds)
    const newInvoiceIds = invoiceIds.filter(id => !existingInvoiceIds.has(id))

    if (newInvoiceIds.length === 0) {
      console.log('All invoices already exist in database')
      result.success = invoiceIds.length
      return result
    }

    console.log(`Fetching ${newInvoiceIds.length} new invoices`)

    // Fetch invoice details from MX Merchant API
    for (const invoiceId of newInvoiceIds) {
      try {
        const invoiceDetail = await this.mxClient.getInvoiceDetail(invoiceId)
        
        if (invoiceDetail) {
          await this.saveInvoice(invoiceDetail)
          result.success++
        }
      } catch (error) {
        result.errors.push(`Failed to fetch invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return result
  }

  /**
   * Save single invoice to database
   */
  private async saveInvoice(invoice: MXInvoiceDetail): Promise<void> {
    const invoiceInsert = {
      mx_invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      customer_name: invoice.customerName || null,
      customer_number: invoice.customerNumber || null,
      customer_email: null, // Not available in MX API
      customer_id: invoice.customer?.id || null,
      invoice_date: invoice.invoiceDate || null,
      due_date: invoice.dueDate || null,
      api_created: invoice.created || null,
      status: invoice.status || null,
      subtotal_amount: parseFloat(invoice.subTotalAmount || '0'),
      tax_amount: parseFloat(invoice.taxAmount || '0'),
      discount_amount: parseFloat(invoice.discountAmount || '0'),
      total_amount: parseFloat(invoice.totalAmount || '0'),
      balance: parseFloat(invoice.balance || '0'),
      paid_amount: parseFloat(invoice.paidAmount || '0'),
      currency: invoice.currency || 'USD',
      receipt_number: invoice.receiptNumber || null,
      quantity: parseInt(invoice.quantity || '0'),
      return_quantity: parseInt(invoice.returnQuantity || '0'),
      return_status: invoice.returnStatus || null,
      source_type: invoice.sourceType || null,
      type: invoice.type || null,
      terms: invoice.terms || null,
      memo: invoice.memo || null,
      is_tax_exempt: invoice.isTaxExempt || false,
      merchant_id: invoice.merchantId || null,
      billing_address: null, // Not available in MX API
      raw_data: invoice, // Products are embedded in raw_data.purchases array
      data_sent_status: 'pending'
    }

    const { error } = await supabaseAdmin
      .from('invoices')
      .upsert(invoiceInsert, { onConflict: 'mx_invoice_id' })

    if (error) {
      throw new Error(`Failed to save invoice ${invoice.id}: ${error.message}`)
    }
  }

  /**
   * Get existing transaction IDs from database
   */
  private async getExistingTransactionIds(paymentIds: number[]): Promise<Set<number>> {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('mx_payment_id')
      .in('mx_payment_id', paymentIds)

    if (error) {
      console.error('Error checking existing transactions:', error)
      return new Set()
    }

    return new Set(data?.map(t => t.mx_payment_id) || [])
  }

  /**
   * Get existing invoice IDs from database
   */
  private async getExistingInvoiceIds(invoiceIds: number[]): Promise<Set<number>> {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('mx_invoice_id')
      .in('mx_invoice_id', invoiceIds)

    if (error) {
      console.error('Error checking existing invoices:', error)
      return new Set()
    }

    return new Set(data?.map(i => i.mx_invoice_id) || [])
  }

  /**
   * Map products to transactions (Step 5 - the missing piece!)
   */
  private async mapProductsToTransactions(): Promise<{ success: number; errors: string[] }> {
    const result = { success: 0, errors: [] as string[] }

    try {
      // Find transactions that have invoice_id but no product mapping yet
      const { data: transactionsNeedingProducts, error } = await supabaseAdmin
        .from('transactions')
        .select(`
          id,
          mx_payment_id,
          invoice_id,
          invoices!inner(mx_invoice_id, raw_data)
        `)
        .not('invoice_id', 'is', null)
        .is('product_name', null)
        .limit(100)

      if (error) {
        result.errors.push(`Error finding transactions needing products: ${error.message}`)
        return result
      }

      if (!transactionsNeedingProducts || transactionsNeedingProducts.length === 0) {
        console.log('No transactions need product mapping')
        return result
      }

      console.log(`Mapping products for ${transactionsNeedingProducts.length} transactions`)

      // Process each transaction
      for (const transaction of transactionsNeedingProducts) {
        try {
          const invoice = Array.isArray(transaction.invoices) ? transaction.invoices[0] : transaction.invoices
          const purchases = invoice?.raw_data?.purchases

          if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
            continue
          }

          // Get first product from invoice
          const firstProduct = purchases[0]
          const productName = firstProduct?.productName

          if (!productName) {
            continue
          }

          // Look up product category
          const { data: categoryData } = await supabaseAdmin
            .from('product_categories')
            .select('category')
            .eq('product_name', productName)
            .eq('is_active', true)
            .single()

          const productCategory = categoryData?.category || 'Uncategorized'

          // Update transaction with product info
          const { error: updateError } = await supabaseAdmin
            .from('transactions')
            .update({
              product_name: productName,
              product_category: productCategory,
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id)

          if (!updateError) {
            result.success++
          } else {
            result.errors.push(`Failed to update transaction ${transaction.mx_payment_id}: ${updateError.message}`)
          }

        } catch (error) {
          result.errors.push(`Error processing transaction ${transaction.mx_payment_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Product mapping completed: ${result.success} transactions updated`)
      return result

    } catch (error) {
      result.errors.push(`Product mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Create instance from MX Merchant config
   */
  static async createFromConfig(): Promise<SimpleSyncService | null> {
    const { data: config, error } = await supabaseAdmin
      .from('mx_merchant_configs')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error || !config) {
      console.error('No active MX Merchant config found')
      return null
    }

    return new SimpleSyncService(
      config.consumer_key,
      config.consumer_secret,
      config.environment as 'sandbox' | 'production'
    )
  }
}