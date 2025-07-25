import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    console.log('Fetching transactions from database...')

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
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

    // Apply filters
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,mx_payment_id.eq.${search},reference_number.ilike.%${search}%`)
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

    // Fetch related invoice data for transactions that have invoice_id
    const transactionsWithInvoices = []
    
    if (transactions) {
      for (const transaction of transactions) {
        let invoiceData = null
        
        // If transaction has invoice_id, fetch the invoice details
        if (transaction.invoice_id) {
          const { data: invoice } = await supabaseAdmin
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
            .eq('id', transaction.invoice_id)
            .single()
          
          invoiceData = invoice
        }
        
        transactionsWithInvoices.push({
          ...transaction,
          invoice: invoiceData
        })
      }
    }

    // Calculate statistics
    const statsQuery = supabaseAdmin
      .from('transactions')
      .select('mx_invoice_number, status, amount', { count: 'exact' })

    const { data: allTransactions, count: totalCount } = await statsQuery

    const statistics = {
      total: totalCount || 0,
      withInvoices: allTransactions?.filter(t => t.mx_invoice_number !== null).length || 0,
      standalone: allTransactions?.filter(t => t.mx_invoice_number === null).length || 0,
      approved: allTransactions?.filter(t => t.status === 'Approved').length || 0,
      settled: allTransactions?.filter(t => t.status === 'Settled').length || 0,
      declined: allTransactions?.filter(t => t.status === 'Declined').length || 0
    }

    // Calculate totals
    const totalAmount = allTransactions?.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0) || 0

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