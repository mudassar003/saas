import { supabase, supabaseAdmin, Tables, Inserts } from './supabase'
import { MXInvoice, MXInvoiceDetail, MXPayment } from '@/types/invoice'
import { getTexasISOString, getTexasDateForFilename } from '@/lib/timezone'

// Data Access Layer for secure database operations
export class DAL {
  // Get user by Clerk ID
  static async getUserByClerkId(clerkUserId: string): Promise<Tables<'users'> | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return data
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<Tables<'users'> | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching user by email:', error)
      return null
    }

    return data
  }

  // Create or update user from Clerk webhook
  static async upsertUser(userData: {
    clerk_user_id: string
    email: string
    first_name?: string
    last_name?: string
  }): Promise<Tables<'users'> | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        clerk_user_id: userData.clerk_user_id,
        email: userData.email,
        first_name: userData.first_name || null,
        last_name: userData.last_name || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user:', error)
      return null
    }

    return data
  }

  // Get MX Merchant config - app protected by Clerk
  static async getMXMerchantConfig(): Promise<Tables<'mx_merchant_configs'> | null> {
    const { data, error } = await supabaseAdmin
      .from('mx_merchant_configs')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching MX Merchant config:', error)
      return null
    }

    return data
  }

  // Create sync log entry - app protected by Clerk
  static async createSyncLog(syncData: {
    sync_type: 'initial' | 'webhook' | 'manual' | 'scheduled' | 'transactions' | 'combined'
    status: 'started' | 'completed' | 'failed' | 'cancelled'
    records_processed?: number
    records_failed?: number
    error_message?: string
    api_calls_made?: number
    last_processed_invoice_id?: number
    last_processed_payment_id?: number
    transactions_processed?: number
    transactions_failed?: number
  }): Promise<Tables<'sync_logs'> | null> {
    const { data, error } = await supabaseAdmin
      .from('sync_logs')
      .insert({
        user_id: 'system', // App protected by Clerk - using system user
        sync_type: syncData.sync_type,
        status: syncData.status,
        records_processed: syncData.records_processed || 0,
        records_failed: syncData.records_failed || 0,
        error_message: syncData.error_message || null,
        api_calls_made: syncData.api_calls_made || 0,
        last_processed_invoice_id: syncData.last_processed_invoice_id || null,
        last_processed_payment_id: syncData.last_processed_payment_id || null,
        transactions_processed: syncData.transactions_processed || 0,
        transactions_failed: syncData.transactions_failed || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating sync log:', error)
      return null
    }

    return data
  }

  // Update sync log
  static async updateSyncLog(syncLogId: string, updates: {
    status?: 'started' | 'completed' | 'failed' | 'cancelled'
    records_processed?: number
    records_failed?: number
    error_message?: string
    completed_at?: string
    api_calls_made?: number
    last_processed_invoice_id?: number
    last_processed_payment_id?: number
    transactions_processed?: number
    transactions_failed?: number
  }): Promise<Tables<'sync_logs'> | null> {
    const { data, error } = await supabaseAdmin
      .from('sync_logs')
      .update({
        ...updates,
        completed_at: updates.completed_at || (updates.status === 'completed' || updates.status === 'failed' ? getTexasISOString() : undefined)
      })
      .eq('id', syncLogId)
      .select()
      .single()

    if (error) {
      console.error('Error updating sync log:', error)
      return null
    }

    return data
  }

  // Bulk insert invoices from MX Merchant API
  static async bulkInsertInvoices(invoices: MXInvoice[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Transform MX Merchant invoices to database format
    const invoiceInserts: Inserts<'invoices'>[] = invoices.map(invoice => ({
      mx_invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      customer_name: invoice.customerName,
      customer_number: invoice.customerNumber,
      invoice_date: invoice.invoiceDate ? getTexasDateForFilename(new Date(invoice.invoiceDate)) : null,
      due_date: invoice.dueDate ? getTexasDateForFilename(new Date(invoice.dueDate)) : null,
      api_created: invoice.created ? getTexasISOString(new Date(invoice.created)) : null,
      status: invoice.status,
      subtotal_amount: parseFloat(invoice.subTotalAmount || '0'),
      tax_amount: parseFloat(invoice.taxAmount || '0'),
      discount_amount: parseFloat(invoice.discountAmount || '0'),
      total_amount: parseFloat(invoice.totalAmount || '0'),
      balance: parseFloat(invoice.balance || '0'),
      paid_amount: parseFloat(invoice.paidAmount || '0'),
      currency: invoice.currency || 'USD',
      receipt_number: invoice.receiptNumber,
      quantity: parseInt(invoice.quantity || '0'),
      return_quantity: parseInt(invoice.returnQuantity || '0'),
      return_status: invoice.returnStatus,
      source_type: invoice.sourceType,
      type: invoice.type,
      terms: invoice.terms,
      memo: invoice.memo,
      is_tax_exempt: invoice.isTaxExempt || false,
      merchant_id: invoice.merchantId,
      raw_data: invoice as unknown as Record<string, unknown>,
      data_sent_status: 'pending'
    }))

    // Insert invoices in batches of 100
    const batchSize = 100
    for (let i = 0; i < invoiceInserts.length; i += batchSize) {
      const batch = invoiceInserts.slice(i, i + batchSize)
      
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .upsert(batch, { 
          onConflict: 'mx_invoice_id',
          ignoreDuplicates: false 
        })
        .select('id')

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        results.failed += batch.length
        results.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
      } else {
        results.success += data?.length || 0
      }
    }

    return results
  }

  // Get invoices with pagination - app protected by Clerk
  static async getInvoices(options: {
    limit?: number
    offset?: number
    search?: string
    status?: string
    dataSentStatus?: string
    dateRange?: { start?: string; end?: string }
  } = {}): Promise<{
    invoices: Tables<'invoices'>[]
    totalCount: number
  }> {
    let query = supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(count)', { count: 'exact' })

    // Apply filters
    if (options.search) {
      query = query.or(`customer_name.ilike.%${options.search}%,invoice_number.eq.${options.search},mx_invoice_id.eq.${options.search}`)
    }

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }

    if (options.dataSentStatus && options.dataSentStatus !== 'all') {
      query = query.eq('data_sent_status', options.dataSentStatus)
    }

    if (options.dateRange?.start) {
      query = query.gte('invoice_date', options.dateRange.start)
    }

    if (options.dateRange?.end) {
      query = query.lte('invoice_date', options.dateRange.end)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return { invoices: [], totalCount: 0 }
    }

    return {
      invoices: data || [],
      totalCount: count || 0
    }
  }

  // Update invoice data sent status - app protected by Clerk
  static async updateInvoiceDataSentStatus(invoiceId: string, status: 'yes' | 'no', notes?: string): Promise<Tables<'invoices'> | null> {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        data_sent_status: status,
        data_sent_at: getTexasISOString(),
        data_sent_notes: notes || null,
        ordered_by_provider_at: status === 'yes' ? getTexasISOString() : null
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice data sent status:', error)
      return null
    }

    return data
  }

  // Get invoice by ID with product details - app protected by Clerk
  static async getInvoiceById(invoiceId: string): Promise<{
    invoice: Tables<'invoices'> | null
    items: Tables<'invoice_items'>[]
  }> {
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError)
      return { invoice: null, items: [] }
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('product_name')

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError)
      return { invoice, items: [] }
    }

    return {
      invoice,
      items: items || []
    }
  }

  // Insert invoice items from MX Merchant detail API
  static async insertInvoiceItems(invoiceId: string, items: MXInvoiceDetail['purchases']): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    if (!items || items.length === 0) {
      return results
    }

    const itemInserts: Inserts<'invoice_items'>[] = items.map(item => ({
      invoice_id: invoiceId,
      mx_purchase_id: item.id,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: parseFloat(item.price || '0'),
      subtotal_amount: parseFloat(item.subTotalAmount || '0'),
      tax_amount: parseFloat(item.taxAmount || '0'),
      discount_amount: parseFloat(item.discountAmount || '0'),
      price_discount_amount: parseFloat(item.priceDiscountAmount || '0'),
      total_amount: parseFloat(item.totalAmount || '0'),
      quantity_returned: item.quantityReturned || 0,
      tracking_number: item.trackingNumber || null,
      api_created: item.created ? getTexasISOString(new Date(item.created)) : null
    }))

    const { data, error } = await supabaseAdmin
      .from('invoice_items')
      .upsert(itemInserts, { 
        onConflict: 'mx_purchase_id,invoice_id',
        ignoreDuplicates: false 
      })
      .select('id')

    if (error) {
      console.error('Error inserting invoice items:', error)
      results.failed = itemInserts.length
      results.errors.push(error.message)
    } else {
      results.success = data?.length || 0
    }

    return results
  }

  // Get invoices without product details (for lazy loading) - app protected by Clerk
  static async getInvoicesWithoutProducts(): Promise<number[]> {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('mx_invoice_id')
      .not('mx_invoice_id', 'in', `(
        SELECT DISTINCT i.mx_invoice_id 
        FROM invoices i 
        INNER JOIN invoice_items ii ON i.id = ii.invoice_id
      )`)

    if (error) {
      console.error('Error fetching invoices without products:', error)
      return []
    }

    return data?.map(invoice => invoice.mx_invoice_id) || []
  }
}

// Simplified functions for invoice detail page
export async function getInvoiceById(mxInvoiceId: number): Promise<Tables<'invoices'> | null> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('mx_invoice_id', mxInvoiceId)
    .single()

  if (error) {
    console.error('Error fetching invoice by MX ID:', error)
    return null
  }

  return data
}

export async function getInvoiceItems(invoiceId: string): Promise<Tables<'invoice_items'>[]> {
  const { data, error } = await supabaseAdmin
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('product_name')

  if (error) {
    console.error('Error fetching invoice items:', error)
    return []
  }

  return data || []
}

// Transaction-related DAL methods
export class TransactionDAL {
  // Bulk insert transactions from MX Merchant Payment API
  static async bulkInsertTransactions(payments: MXPayment[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    if (!payments || payments.length === 0) {
      return results
    }

    // Transform MX Merchant payments to database format
    const transactionInserts: Inserts<'transactions'>[] = payments.map(payment => ({
      mx_payment_id: payment.id,
      amount: parseFloat(payment.amount || '0'),
      transaction_date: payment.created ? getTexasISOString(new Date(payment.created)) : getTexasISOString(),
      status: payment.status || 'Unknown',
      
      // Invoice Linking
      mx_invoice_number: payment.invoice ? parseInt(payment.invoice) : null,
      invoice_id: null, // Will be populated by trigger
      client_reference: payment.clientReference || null,
      
      // Customer Info
      customer_name: payment.customerName || null,
      customer_code: payment.customerCode || null,
      
      // Payment Details
      auth_code: payment.authCode || null,
      auth_message: payment.authMessage || null,
      response_code: payment.responseCode || null,
      reference_number: payment.reference || null,
      
      // Card Details
      card_type: payment.cardAccount?.cardType || null,
      card_last4: payment.cardAccount?.last4 || null,
      card_token: payment.cardAccount?.token || null,
      
      // Financial Details
      currency: payment.currency || 'USD',
      tax_amount: payment.tax ? parseFloat(payment.tax) : null,
      surcharge_amount: payment.surchargeAmount ? parseFloat(payment.surchargeAmount) : null,
      surcharge_label: payment.surchargeLabel || null,
      refunded_amount: payment.refundedAmount ? parseFloat(payment.refundedAmount) : 0,
      settled_amount: payment.settledAmount ? parseFloat(payment.settledAmount) : 0,
      
      // Transaction Metadata
      tender_type: payment.tenderType || null,
      transaction_type: payment.type || null,
      source: payment.source || null,
      batch: payment.batch || null,
      merchant_id: payment.merchantId || null,
      
      // System Fields
      raw_data: payment as unknown as Record<string, unknown>
    }))

    // Insert transactions in batches of 100
    const batchSize = 100
    for (let i = 0; i < transactionInserts.length; i += batchSize) {
      const batch = transactionInserts.slice(i, i + batchSize)
      
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .upsert(batch, { 
          onConflict: 'mx_payment_id',
          ignoreDuplicates: false 
        })
        .select('id')

      if (error) {
        console.error(`Error inserting transaction batch ${i / batchSize + 1}:`, error)
        results.failed += batch.length
        results.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
      } else {
        results.success += data?.length || 0
      }
    }

    return results
  }

  // Get transactions with pagination - app protected by Clerk
  static async getTransactions(options: {
    limit?: number
    offset?: number
    search?: string
    status?: string
    dateRange?: { start?: string; end?: string }
    includeInvoiceData?: boolean
  } = {}): Promise<{
    transactions: Tables<'transactions'>[]
    totalCount: number
  }> {
    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })

    // Apply filters
    if (options.search) {
      query = query.or(`customer_name.ilike.%${options.search}%,mx_payment_id.eq.${options.search},reference_number.eq.${options.search}`)
    }

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }

    if (options.dateRange?.start) {
      query = query.gte('transaction_date', options.dateRange.start)
    }

    if (options.dateRange?.end) {
      query = query.lte('transaction_date', options.dateRange.end)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    // Order by most recent first
    query = query.order('transaction_date', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      return { transactions: [], totalCount: 0 }
    }

    return {
      transactions: data || [],
      totalCount: count || 0
    }
  }

  // Get combined transaction and invoice data for dashboard - app protected by Clerk
  static async getCombinedTransactionData(options: {
    limit?: number
    offset?: number
    search?: string
    status?: string
    dateRange?: { start?: string; end?: string }
    showType?: 'all' | 'with_invoices' | 'standalone'
  } = {}): Promise<{
    records: Array<{
      type: 'transaction'
      transaction: Tables<'transactions'>
      invoice?: Tables<'invoices'> | null
      date: string
      amount: number
      status: string
      customer_name: string | null
      reference?: string | null
    }>
    totalCount: number
  }> {
    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })

    // Apply filters based on showType
    if (options.showType === 'with_invoices') {
      query = query.not('invoice_id', 'is', null)
    } else if (options.showType === 'standalone') {
      query = query.is('invoice_id', null)
    }

    // Apply search and other filters
    if (options.search) {
      query = query.or(`customer_name.ilike.%${options.search}%,mx_payment_id.eq.${options.search}`)
    }

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status)
    }

    if (options.dateRange?.start) {
      query = query.gte('transaction_date', options.dateRange.start)
    }

    if (options.dateRange?.end) {
      query = query.lte('transaction_date', options.dateRange.end)
    }

    // Apply pagination and ordering
    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    query = query.order('transaction_date', { ascending: false })

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Error fetching combined transaction data:', error)
      return { records: [], totalCount: 0 }
    }

    // Transform to unified format (without invoice join for now)
    const records = transactions?.map(transaction => ({
      type: 'transaction' as const,
      transaction,
      invoice: null, // Remove complex join for now
      date: transaction.transaction_date,
      amount: transaction.amount,
      status: transaction.status,
      customer_name: transaction.customer_name,
      reference: transaction.reference_number
    })) || []

    return {
      records,
      totalCount: count || 0
    }
  }
}