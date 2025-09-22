import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request)

    console.log('Fetching invoices from database...', { merchantId })

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const dataSentStatus = searchParams.get('dataSentStatus') || 'all'
    const dateStart = searchParams.get('dateStart') || undefined
    const dateEnd = searchParams.get('dateEnd') || undefined

    // Build database query with merchant filtering
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        mx_invoice_id,
        invoice_number,
        customer_name,
        status,
        total_amount,
        invoice_date,
        data_sent_status,
        data_sent_at,
        data_sent_notes,
        ordered_by_provider_at,
        created_at,
        updated_at
      `)
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply merchant filtering
    query = applyMerchantFilter(query, merchantId)

    // Apply smart search filters
    if (search) {
      const searchTerm = search.trim()
      const isNumeric = /^\d+$/.test(searchTerm)
      
      if (isNumeric) {
        // If search is numeric, search invoice numbers and MX invoice ID
        query = query.or(`customer_name.ilike.%${searchTerm}%,invoice_number.eq.${searchTerm},mx_invoice_id.eq.${searchTerm}`)
      } else {
        // If search is text, only search customer name
        query = query.ilike('customer_name', `%${searchTerm}%`)
      }
    }
    
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (dataSentStatus !== 'all') {
      query = query.eq('data_sent_status', dataSentStatus)
    }
    
    if (dateStart) {
      query = query.gte('invoice_date', dateStart)
    }
    
    if (dateEnd) {
      query = query.lte('invoice_date', dateEnd)
    }

    // Get total count and statistics with the same filters
    let statsQuery = supabaseAdmin
      .from('invoices')
      .select('data_sent_status, total_amount', { count: 'exact' })

    // Apply merchant filtering to stats query
    statsQuery = applyMerchantFilter(statsQuery, merchantId)

    // Apply same filters to stats query
    if (search) {
      statsQuery = statsQuery.or(`customer_name.ilike.%${search}%,invoice_number.eq.${search}`)
    }
    
    if (status !== 'all') {
      statsQuery = statsQuery.eq('status', status)
    }
    
    if (dataSentStatus !== 'all') {
      statsQuery = statsQuery.eq('data_sent_status', dataSentStatus)
    }
    
    if (dateStart) {
      statsQuery = statsQuery.gte('invoice_date', dateStart)
    }
    
    if (dateEnd) {
      statsQuery = statsQuery.lte('invoice_date', dateEnd)
    }
    
    // Apply same ordering to stats query
    statsQuery = statsQuery.order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: statsData, count: totalCount, error: statsError } = await statsQuery

    if (statsError) {
      console.error('Error getting invoice stats:', statsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Apply pagination
    const { data: invoices, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Calculate statistics from filtered data
    const grandTotal = statsData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
    const dataSentCount = statsData?.filter(inv => inv.data_sent_status === 'yes').length || 0
    const dataNotSentCount = statsData?.filter(inv => inv.data_sent_status === 'no').length || 0
    const pendingCount = statsData?.filter(inv => inv.data_sent_status === 'pending').length || 0

    console.log(`Fetched ${invoices.length} invoices from database (${totalCount} total)`)

    return NextResponse.json({
      success: true,
      data: {
        records: invoices,
        recordCount: totalCount || 0,
        totals: {
          grandTotalAmount: grandTotal.toString()
        },
        statistics: {
          total: totalCount || 0,
          dataSent: dataSentCount,
          dataNotSent: dataNotSentCount,
          pending: pendingCount
        }
      }
    })

  } catch (error) {
    console.error('Invoice API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}