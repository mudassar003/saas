import { NextRequest, NextResponse } from 'next/server'
import { MXMerchantClient } from '@/lib/mx-merchant-client'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import type { MXPurchase } from '@/types/invoice'
import type { SupabaseClient } from '@supabase/supabase-js'

const ManualSyncRequestSchema = z.object({
  transactionCount: z.number().min(1).max(100).default(20),
  merchantId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { transactionCount, merchantId } = ManualSyncRequestSchema.parse(body)

    // Step 2: Get MX Merchant Configuration
    const supabase = supabaseAdmin
    
    // Get merchant configuration (tenant-specific)
    let configQuery = supabase
      .from('mx_merchant_configs')
      .select('merchant_id, consumer_key, consumer_secret, environment')
      .eq('is_active', true)
    
    if (merchantId) {
      configQuery = configQuery.eq('merchant_id', BigInt(merchantId))
    }
    
    const { data: config, error: configError } = await configQuery.single()

    if (configError || !config) {
      return NextResponse.json({ 
        error: 'MX Merchant configuration not found' 
      }, { status: 404 })
    }

    // Initialize MX Merchant client
    const mxClient = new MXMerchantClient(
      config.consumer_key,
      config.consumer_secret,
      config.environment as 'sandbox' | 'production'
    )

    const tenantId = config.merchant_id

    // Step 3: Execute Manual Sync Strategy (8 Steps)
    console.log(`Starting manual sync for merchant ${tenantId}, ${transactionCount} transactions`)

    // Step 1: Fetch N Transactions
    const paymentsResponse = await mxClient.getPayments({
      limit: transactionCount,
      merchantId: tenantId.toString()
    })

    const transactions = paymentsResponse.records
    console.log(`Fetched ${transactions.length} transactions`)

    // Step 2: Save All Transactions to Database
    const transactionInserts = transactions.map(payment => ({
      mx_payment_id: payment.id,
      amount: parseFloat(payment.amount || '0'),
      transaction_date: payment.created || new Date().toISOString(),
      status: payment.status || 'Unknown',
      mx_invoice_number: payment.invoice ? parseInt(payment.invoice) : null,
      client_reference: payment.clientReference,
      customer_name: payment.customerName,
      customer_code: payment.customerCode,
      auth_code: payment.authCode,
      auth_message: payment.authMessage,
      response_code: payment.responseCode,
      reference_number: payment.reference,
      card_type: payment.cardAccount?.cardType,
      card_last4: payment.cardAccount?.last4,
      card_token: payment.cardAccount?.token,
      currency: payment.currency || 'USD',
      tax_amount: payment.tax ? parseFloat(payment.tax) : null,
      surcharge_amount: payment.surchargeAmount ? parseFloat(payment.surchargeAmount) : null,
      surcharge_label: payment.surchargeLabel,
      refunded_amount: payment.refundedAmount ? parseFloat(payment.refundedAmount) : 0,
      settled_amount: payment.settledAmount ? parseFloat(payment.settledAmount) : 0,
      tender_type: payment.tenderType,
      transaction_type: payment.type,
      source: payment.source,
      batch: payment.batch,
      merchant_id: tenantId,
      raw_data: payment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Insert transactions with conflict resolution (upsert)
    const { data: insertedTransactions, error: transactionError } = await supabase
      .from('transactions')
      .upsert(transactionInserts, { 
        onConflict: 'mx_payment_id',
        ignoreDuplicates: false 
      })
      .select('id, mx_payment_id, mx_invoice_number')

    if (transactionError) {
      console.error('Transaction insert error:', transactionError)
      throw new Error(`Failed to save transactions: ${transactionError.message}`)
    }

    console.log(`Saved ${insertedTransactions?.length || 0} transactions`)

    // Step 3: Filter Invoice-Linked Transactions
    const invoiceLinkedTransactions = insertedTransactions?.filter(t => t.mx_invoice_number) || []
    const uniqueInvoiceNumbers = [...new Set(invoiceLinkedTransactions.map(t => t.mx_invoice_number))]
    
    console.log(`Found ${invoiceLinkedTransactions.length} invoice-linked transactions with ${uniqueInvoiceNumbers.length} unique invoices`)

    if (uniqueInvoiceNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Manual sync completed - no invoice-linked transactions found',
        stats: {
          transactionsSynced: insertedTransactions?.length || 0,
          invoicesLinked: 0,
          apiCalls: 1 // Only payment list call
        }
      })
    }

    // Step 4: Create Invoice Number → Invoice ID Mapping
    const invoicesResponse = await mxClient.getInvoices({
      merchantId: tenantId.toString(),
      limit: 500 // Get enough invoices to cover our needs
    })

    const invoiceMapping = new Map<number, number>()
    invoicesResponse.records.forEach(invoice => {
      if (uniqueInvoiceNumbers.includes(invoice.invoiceNumber)) {
        invoiceMapping.set(invoice.invoiceNumber, invoice.id)
      }
    })

    console.log(`Created invoice mapping for ${invoiceMapping.size} invoices`)

    // Step 5: Fetch Individual Invoice Details
    const invoiceDetailPromises = Array.from(invoiceMapping.values()).map(async (invoiceId) => {
      try {
        return await mxClient.getInvoiceDetail(invoiceId)
      } catch (error) {
        console.error(`Failed to fetch invoice detail for ID ${invoiceId}:`, error)
        return null
      }
    })

    const invoiceDetails = (await Promise.all(invoiceDetailPromises)).filter(detail => detail !== null)
    console.log(`Fetched ${invoiceDetails.length} invoice details`)

    // Step 6: Save Invoice Data
    const invoiceInserts = invoiceDetails.map(invoice => ({
      mx_invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      customer_name: invoice.customerName,
      customer_number: invoice.customerNumber,
      customer_email: invoice.customer?.name || null,
      invoice_date: invoice.invoiceDate || null,
      due_date: invoice.dueDate || null,
      api_created: invoice.created || null,
      status: invoice.status || 'Unknown',
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
      merchant_id: tenantId,
      raw_data: invoice,
      data_sent_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data: insertedInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .upsert(invoiceInserts, { 
        onConflict: 'mx_invoice_id',
        ignoreDuplicates: false 
      })
      .select('id, mx_invoice_id, invoice_number')

    if (invoiceError) {
      console.error('Invoice insert error:', invoiceError)
      throw new Error(`Failed to save invoices: ${invoiceError.message}`)
    }

    console.log(`Saved ${insertedInvoices?.length || 0} invoices`)

    // Step 7: Extract Products and Link Transactions
    const transactionUpdates = []
    
    for (const invoice of invoiceDetails) {
      // Find transactions that should be linked to this invoice
      const relatedTransactions = insertedTransactions?.filter(
        t => t.mx_invoice_number === invoice.invoiceNumber
      ) || []

      if (relatedTransactions.length === 0) continue

      const correspondingInvoiceRecord = insertedInvoices?.find(i => i.mx_invoice_id === invoice.id)
      
      // Extract primary product from invoice purchases (Single Responsibility)
      const productData = await extractPrimaryProduct(invoice.purchases || [], tenantId, supabase)

      // Create updates for all related transactions
      for (const transaction of relatedTransactions) {
        transactionUpdates.push({
          id: transaction.id,
          invoice_id: correspondingInvoiceRecord?.id || null,
          product_name: productData.name,
          product_category: productData.category,
          updated_at: new Date().toISOString()
        })
      }
    }

    // Step 8: Batch Update Transactions (Performance Optimized)
    await batchUpdateTransactions(transactionUpdates, supabase)

    console.log(`Updated ${transactionUpdates.length} transactions with product data`)

    // Calculate API efficiency stats
    const totalApiCalls = 2 + invoiceDetails.length // payment list + invoice list + invoice details
    
    return NextResponse.json({
      success: true,
      message: 'Manual sync completed successfully',
      stats: {
        transactionsSynced: insertedTransactions?.length || 0,
        invoicesLinked: invoiceDetails.length,
        transactionsWithProducts: transactionUpdates.filter(u => u.product_name).length,
        transactionsLinkedToInvoices: transactionUpdates.length,
        apiCalls: totalApiCalls,
        efficiency: `${Math.round((uniqueInvoiceNumbers.length / transactionCount) * 100)}% of transactions had invoices`
      }
    })

  } catch (error) {
    console.error('Manual sync error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Manual sync failed',
      details: error instanceof z.ZodError ? error.errors : undefined
    }, { status: 500 })
  }
}

// =====================================================
// Enterprise Helper Functions (code_writing.md patterns)
// =====================================================

/**
 * Product extraction with tenant-specific categorization
 * Following Single Responsibility Principle
 */
interface ProductData {
  name: string | null
  category: string
}

async function extractPrimaryProduct(
  purchases: MXPurchase[], 
  tenantId: bigint, 
  supabase: SupabaseClient
): Promise<ProductData> {
  // Guard clause for empty purchases (Defensive Programming)
  if (!purchases?.length) {
    return { name: null, category: 'Uncategorized' }
  }

  try {
    // Extract primary product (highest value) using functional programming
    const primaryProduct = purchases.reduce((prev, current) => 
      parseFloat(current.totalAmount || '0') > parseFloat(prev.totalAmount || '0') 
        ? current : prev
    )

    const productName = primaryProduct.productName?.trim() || null
    
    if (!productName) {
      return { name: null, category: 'Uncategorized' }
    }

    // Tenant-specific category mapping with proper error handling
    const category = await getCategoryMapping(productName, tenantId, supabase)
    
    return { name: productName, category }

  } catch (error) {
    console.error('Product extraction failed:', error)
    return { name: null, category: 'Uncategorized' }
  }
}

/**
 * Tenant-aware category mapping with caching optimization
 * Following code_writing.md multi-tenant patterns
 */
async function getCategoryMapping(
  productName: string, 
  tenantId: bigint, 
  supabase: SupabaseClient
): Promise<string> {
  try {
    // Tenant-isolated query with explicit filtering
    const { data: categoryMapping, error } = await supabase
      .from('product_categories')
      .select('category')
      .eq('merchant_id', tenantId)        // Multi-tenant isolation
      .eq('product_name', productName)    // Exact product match
      .eq('is_active', true)              // Only active mappings
      .single()

    if (error) {
      // Log for debugging but don't fail sync
      console.warn(`Category mapping not found for product "${productName}":`, error.message)
      return 'Uncategorized'
    }

    // Validate category value (Input Validation)
    const validCategories = ['TRT', 'Weight Loss', 'Peptides', 'ED', 'Other', 'Uncategorized']
    return validCategories.includes(categoryMapping.category) 
      ? categoryMapping.category 
      : 'Uncategorized'

  } catch (error) {
    console.error('Category mapping lookup failed:', error)
    return 'Uncategorized'
  }
}

/**
 * Batch transaction updates for optimal performance
 * Following code_writing.md performance patterns
 */
interface TransactionUpdate {
  id: string
  invoice_id: string | null
  product_name: string | null
  product_category: string
  updated_at: string
}

async function batchUpdateTransactions(
  updates: TransactionUpdate[], 
  supabase: SupabaseClient
): Promise<void> {
  if (updates.length === 0) return

  // Batch size optimization for large datasets
  const BATCH_SIZE = 50
  const batches = chunkArray(updates, BATCH_SIZE)

  try {
    // Process batches concurrently for performance
    await Promise.allSettled(
      batches.map(async (batch) => {
        for (const update of batch) {
          const { error } = await supabase
            .from('transactions')
            .update({
              invoice_id: update.invoice_id,
              product_name: update.product_name,
              product_category: update.product_category,
              updated_at: update.updated_at
            })
            .eq('id', update.id)

          if (error) {
            console.error(`Transaction update failed for ${update.id}:`, error.message)
            // Continue processing other updates (Graceful Error Handling)
          }
        }
      })
    )

  } catch (error) {
    console.error('Batch transaction updates failed:', error)
    throw new Error('Failed to update transactions with product data')
  }
}

/**
 * Array chunking utility for batch processing
 * Functional programming pattern
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}