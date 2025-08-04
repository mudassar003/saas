import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Optimized transaction with invoice data type - only the fields we actually fetch
interface TransactionWithInvoice {
  id: string
  mx_payment_id: number
  amount: number
  transaction_date: string
  status: string
  mx_invoice_number: number | null
  invoice_id: string | null
  customer_name: string | null
  auth_code: string | null
  reference_number: string | null
  card_type: string | null
  card_last4: string | null
  transaction_type: string | null
  source: string | null
  created_at: string
  ordered_by_provider: boolean | null
  ordered_by_provider_at: string | null
  invoice: {
    id: string
    mx_invoice_id: number
    invoice_number: number
    customer_name: string | null
    total_amount: number | null
    invoice_date: string | null
    data_sent_status: string
    ordered_by_provider_at: string | null
  } | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    console.log('Fetching transactions from database...')

    // Parse query parameters - optimized for initial load
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const isInitialLoad = offset === 0 && limit <= 50
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const showType = searchParams.get('showType') || 'all' // all, with_invoices, standalone
    const dateStart = searchParams.get('dateStart') || undefined
    const dateEnd = searchParams.get('dateEnd') || undefined

    // Fetch transactions first
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        mx_payment_id,
        amount,
        transaction_date,
        status,
        mx_invoice_number,
        invoice_id,
        customer_name,
        auth_code,
        reference_number,
        card_type,
        card_last4,
        transaction_type,
        source,
        created_at,
        ordered_by_provider,
        ordered_by_provider_at
      `, { count: 'exact' })
      .order('transaction_date', { ascending: false })

    // Apply smart search filters
    if (search) {
      const searchTerm = search.trim()
      const isNumeric = /^\d+$/.test(searchTerm)
      
      if (isNumeric) {
        // If search is numeric, search payment ID and reference number
        query = query.or(`customer_name.ilike.%${searchTerm}%,mx_payment_id.eq.${searchTerm},reference_number.ilike.%${searchTerm}%`)
      } else {
        // If search is text, only search customer name and reference number
        query = query.or(`customer_name.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`)
      }
    }
    
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by transaction type (with/without invoices)
    if (showType === 'with_invoices') {
      query = query.not('mx_invoice_number', 'is', null)
    } else if (showType === 'standalone') {
      query = query.is('mx_invoice_number', null)
    }
    
    // Date range filtering
    if (dateStart) {
      query = query.gte('transaction_date', dateStart)
    }
    if (dateEnd) {
      query = query.lte('transaction_date', dateEnd)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Smart optimization: Only fetch full stats on initial load, skip on pagination
    const shouldFetchStats = isInitialLoad || search || status !== 'all' || showType !== 'all' || dateStart || dateEnd
    
    // Optimize: Batch fetch all related invoice data in one query
    const transactionsWithInvoices: TransactionWithInvoice[] = []
    
    if (transactions && transactions.length > 0) {
      // Get all unique invoice IDs from transactions
      const invoiceIds = transactions
        .map(t => t.invoice_id)
        .filter((id): id is string => id !== null && id !== undefined)
      
      // Batch fetch all needed invoices in one query (much faster!)
      const invoicesMap = new Map()
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabaseAdmin
          .from('invoices')
          .select(`
            id,
            mx_invoice_id,
            invoice_number,
            customer_name,
            total_amount,
            invoice_date,
            data_sent_status,
            ordered_by_provider_at
          `)
          .in('id', invoiceIds)
        
        // Create a lookup map for O(1) access
        if (invoices) {
          invoices.forEach(invoice => {
            invoicesMap.set(invoice.id, invoice)
          })
        }
      }
      
      // Attach invoice data to transactions using the map
      transactions.forEach(transaction => {
        transactionsWithInvoices.push({
          ...transaction,
          invoice: transaction.invoice_id ? invoicesMap.get(transaction.invoice_id) || null : null
        })
      })
    }

    // Smart stats: Only calculate on initial load or when filtering
    let statistics = {
      total: count || 0,
      withInvoices: 0,
      standalone: 0,
      approved: 0,
      settled: 0,
      declined: 0
    }
    
    let totalAmount = 0
    
    if (shouldFetchStats) {
      const statsQuery = supabaseAdmin
        .from('transactions')
        .select('mx_invoice_number, status, amount', { count: 'exact' })

      const { data: allTransactions, count: totalCount } = await statsQuery
      
      statistics = {
        total: totalCount || 0,
        withInvoices: allTransactions?.filter(t => t.mx_invoice_number !== null).length || 0,
        standalone: allTransactions?.filter(t => t.mx_invoice_number === null).length || 0,
        approved: allTransactions?.filter(t => t.status === 'Approved').length || 0,
        settled: allTransactions?.filter(t => t.status === 'Settled').length || 0,
        declined: allTransactions?.filter(t => t.status === 'Declined').length || 0
      }
      
      totalAmount = allTransactions?.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0) || 0
    }

    return NextResponse.json({
      success: true,
      data: {
        records: transactionsWithInvoices,
        recordCount: count || 0,
        totals: {
          grandTotalAmount: totalAmount.toFixed(2)
        },
        statistics
      }
    })

  } catch (error) {
    console.error('Transaction API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}