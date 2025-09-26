import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils'

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
  product_name: string | null
  product_category: string | null
  membership_status: string | null
  fulfillment_type: string | null
  google_review_submitted: boolean | null
  referral_source: string | null
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

    // CRITICAL SECURITY FIX: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request)

    console.log('Fetching transactions from database...', { merchantId })

    // Parse query parameters - optimized for initial load
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const isInitialLoad = offset === 0 && limit <= 50
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const showType = searchParams.get('showType') || 'all' // all, with_invoices, standalone
    const category = searchParams.get('category') || 'all' // all, TRT, Weight Loss, Peptides, ED, Other
    const membershipStatus = searchParams.get('membershipStatus') || 'all' // all, active, canceled, paused
    const googleReview = searchParams.get('googleReview') || 'all' // all, true, false
    const referralSource = searchParams.get('referralSource') || 'all' // all, online, refer_a_friend, other
    const fulfillmentType = searchParams.get('fulfillmentType') || 'all' // all, in_office, mail_out
    const dateStart = searchParams.get('dateStart') || undefined
    const dateEnd = searchParams.get('dateEnd') || undefined
    const activeTab = searchParams.get('activeTab') || 'all' // all, trt, weight_loss, peptides, ed, cancellations

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
        product_name,
        product_category,
        membership_status,
        fulfillment_type,
        google_review_submitted,
        referral_source,
        created_at,
        ordered_by_provider,
        ordered_by_provider_at
      `, { count: 'exact' })
      .order('transaction_date', { ascending: false })

    // CRITICAL SECURITY FIX: Apply merchant filtering
    query = applyMerchantFilter(query, merchantId)

    // Apply customer name search only (no live search, server-friendly)
    if (search) {
      const searchTerm = search.trim()
      // Only search by customer name to reduce database load
      query = query.ilike('customer_name', `%${searchTerm}%`)
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

    // Filter by product category
    if (category !== 'all') {
      query = query.eq('product_category', category)
    }

    // Filter by membership status
    if (membershipStatus !== 'all') {
      query = query.eq('membership_status', membershipStatus)
    }

    // Filter by Google Review status
    if (googleReview !== 'all') {
      query = query.eq('google_review_submitted', googleReview === 'true')
    }

    // Filter by referral source
    if (referralSource !== 'all') {
      query = query.eq('referral_source', referralSource)
    }

    // Filter by fulfillment type
    if (fulfillmentType !== 'all') {
      query = query.eq('fulfillment_type', fulfillmentType)
    }
    
    // Date range filtering
    if (dateStart) {
      query = query.gte('transaction_date', dateStart)
    }
    if (dateEnd) {
      query = query.lte('transaction_date', dateEnd)
    }

    // Tab-based filtering (Patient Census Dashboard)
    if (activeTab !== 'all') {
      if (activeTab === 'trt') {
        query = query.eq('product_category', 'TRT')
        query = query.eq('source', 'Recurring')
        query = query.eq('membership_status', 'active')
      } else if (activeTab === 'weight_loss') {
        query = query.eq('product_category', 'Weight Loss')
        query = query.eq('source', 'Recurring')
        query = query.eq('membership_status', 'active')
      } else if (activeTab === 'peptides') {
        query = query.eq('product_category', 'Peptides')
        query = query.eq('source', 'Recurring')
        query = query.eq('membership_status', 'active')
      } else if (activeTab === 'ed') {
        query = query.eq('product_category', 'ED')
        query = query.eq('source', 'Recurring')
        query = query.eq('membership_status', 'active')
      } else if (activeTab === 'cancellations') {
        query = query.eq('source', 'Recurring')
        query = query.in('membership_status', ['canceled', 'paused'])
      } else {
        // All tab - active recurring patients
        query = query.eq('source', 'Recurring')
        query = query.eq('membership_status', 'active')
      }
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
    const shouldFetchStats = isInitialLoad || search || status !== 'all' || showType !== 'all' || category !== 'all' || membershipStatus !== 'all' || googleReview !== 'all' || referralSource !== 'all' || fulfillmentType !== 'all' || dateStart || dateEnd
    
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
      declined: 0,
      categories: {
        TRT: 0,
        'Weight Loss': 0,
        Peptides: 0,
        ED: 0,
        Other: 0,
        Uncategorized: 0
      },
      tabCounts: {
        all: 0,
        trt: 0,
        weight_loss: 0,
        peptides: 0,
        ed: 0,
        cancellations: 0
      },
      membershipStatus: {
        active: 0,
        canceled: 0,
        paused: 0
      }
    }
    
    let totalAmount = 0
    
    if (shouldFetchStats) {
      let statsQuery = supabaseAdmin
        .from('transactions')
        .select('mx_invoice_number, status, amount, product_category, membership_status', { count: 'exact' })

      // CRITICAL SECURITY FIX: Apply merchant filtering to stats query
      statsQuery = applyMerchantFilter(statsQuery, merchantId)

      const { data: allTransactions, count: totalCount } = await statsQuery
      
      const categories = {
        TRT: allTransactions?.filter(t => t.product_category === 'TRT').length || 0,
        'Weight Loss': allTransactions?.filter(t => t.product_category === 'Weight Loss').length || 0,
        Peptides: allTransactions?.filter(t => t.product_category === 'Peptides').length || 0,
        ED: allTransactions?.filter(t => t.product_category === 'ED').length || 0,
        Other: allTransactions?.filter(t => t.product_category === 'Other').length || 0,
        Uncategorized: allTransactions?.filter(t => !t.product_category || t.product_category === 'Uncategorized').length || 0
      }

      const membershipStatus = {
        active: allTransactions?.filter(t => t.membership_status === 'active').length || 0,
        canceled: allTransactions?.filter(t => t.membership_status === 'canceled').length || 0,
        paused: allTransactions?.filter(t => t.membership_status === 'paused').length || 0
      }

      // Calculate tab counts for patient census dashboard
      const recurringTransactions = allTransactions?.filter(t => t.status !== 'Declined') || []
      const tabCounts = {
        all: recurringTransactions.filter(t => t.membership_status === 'active').length || 0,
        trt: recurringTransactions.filter(t => t.product_category === 'TRT' && t.membership_status === 'active').length || 0,
        weight_loss: recurringTransactions.filter(t => t.product_category === 'Weight Loss' && t.membership_status === 'active').length || 0,
        peptides: recurringTransactions.filter(t => t.product_category === 'Peptides' && t.membership_status === 'active').length || 0,
        ed: recurringTransactions.filter(t => t.product_category === 'ED' && t.membership_status === 'active').length || 0,
        cancellations: recurringTransactions.filter(t => t.membership_status === 'canceled' || t.membership_status === 'paused').length || 0
      }
      
      statistics = {
        total: totalCount || 0,
        withInvoices: allTransactions?.filter(t => t.mx_invoice_number !== null).length || 0,
        standalone: allTransactions?.filter(t => t.mx_invoice_number === null).length || 0,
        approved: allTransactions?.filter(t => t.status === 'Approved').length || 0,
        settled: allTransactions?.filter(t => t.status === 'Settled').length || 0,
        declined: allTransactions?.filter(t => t.status === 'Declined').length || 0,
        categories,
        tabCounts,
        membershipStatus
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

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('id')

    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID is required'
      }, { status: 400 })
    }

    // CRITICAL SECURITY FIX: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request)

    const body = await request.json()
    
    // Validate allowed fields
    const allowedFields = ['membership_status', 'ordered_by_provider', 'product_category', 'fulfillment_type', 'google_review_submitted']
    const updates: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        if (key === 'membership_status' && !['active', 'canceled', 'paused'].includes(value as string)) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid membership status' 
          }, { status: 400 })
        }
        if (key === 'product_category' && !['TRT', 'Weight Loss', 'Peptides', 'ED', 'Other', 'Uncategorized'].includes(value as string)) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid product category' 
          }, { status: 400 })
        }
        if (key === 'fulfillment_type' && !['in_office', 'mail_out'].includes(value as string)) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid fulfillment type' 
          }, { status: 400 })
        }
        if (key === 'google_review_submitted' && typeof value !== 'boolean') {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid google review value' 
          }, { status: 400 })
        }
        updates[key] = value
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid fields to update' 
      }, { status: 400 })
    }
    
    updates.updated_at = new Date().toISOString()

    // CRITICAL SECURITY FIX: Apply merchant filtering to update query
    let updateQuery = supabaseAdmin
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)

    updateQuery = applyMerchantFilter(updateQuery, merchantId)

    const { data, error } = await updateQuery
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update transaction' 
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Transaction update API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}