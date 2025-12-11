import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils'

// Patient census record - enterprise-grade type definition
interface PatientCensusRecord {
  id: string
  customer_name: string
  product_name: string | null
  product_category: string | null
  membership_status: string
  amount: number
  last_payment_date: string
  transaction_count: number
  source: string | null
  fulfillment_type: string | null
  google_review_submitted: boolean | null
  referral_source: string | null
  ordered_by_provider: boolean | null
  ordered_by_provider_at: string | null
  created_at: string
}

interface CensusStatistics {
  total: number
  byCategory: Record<string, number>
  byMembershipStatus: Record<string, number>
  tabCounts: Record<string, number>
}

interface CensusApiResponse {
  success: boolean
  data: {
    records: PatientCensusRecord[]
    recordCount: number
    statistics: CensusStatistics
  }
}

type TabKey = 'all' | 'trt' | 'weight_loss' | 'peptides' | 'ed' | 'cancellations'

export async function GET(request: NextRequest): Promise<NextResponse<CensusApiResponse | { success: false; error: string }>> {
  try {
    const { searchParams } = new URL(request.url)

    // CRITICAL SECURITY FIX: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request)

    // Parse and validate query parameters with strict typing
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 for performance
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category') || 'all'
    const membershipStatus = searchParams.get('membershipStatus') || 'all'
    const googleReview = searchParams.get('googleReview') || 'all'
    const referralSource = searchParams.get('referralSource') || 'all'
    const fulfillmentType = searchParams.get('fulfillmentType') || 'all'
    const dateStart = searchParams.get('dateStart') || undefined
    const dateEnd = searchParams.get('dateEnd') || undefined
    const activeTab = (searchParams.get('activeTab') || 'all') as TabKey

    // Performance optimization: Use optimized index-aware query
    // Following database_schema.md performance patterns
    let baseQuery = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        customer_name,
        product_name,
        product_category,
        membership_status,
        amount,
        transaction_date,
        source,
        fulfillment_type,
        google_review_submitted,
        referral_source,
        ordered_by_provider,
        ordered_by_provider_at,
        created_at
      `)

    // CRITICAL SECURITY FIX: Apply merchant filtering
    baseQuery = applyMerchantFilter(baseQuery, merchantId)

    // Apply search filter with proper indexing (customer name search index)
    if (search) {
      baseQuery = baseQuery.ilike('customer_name', `%${search}%`)
    }

    // Apply category filter using optimized category index
    if (category !== 'all') {
      baseQuery = baseQuery.eq('product_category', category)
    }

    // Apply membership status filter
    if (membershipStatus !== 'all') {
      baseQuery = baseQuery.eq('membership_status', membershipStatus)
    }

    // Apply additional filters
    if (googleReview !== 'all') {
      baseQuery = baseQuery.eq('google_review_submitted', googleReview === 'true')
    }

    if (referralSource !== 'all') {
      baseQuery = baseQuery.eq('referral_source', referralSource)
    }

    if (fulfillmentType !== 'all') {
      baseQuery = baseQuery.eq('fulfillment_type', fulfillmentType)
    }

    // Date range filtering - TIMEZONE FIX: Use UTC timestamp boundaries
    // The getDateRange() function converts Texas timezone dates to UTC timestamp ranges
    // Example: "Today" in Texas (Dec 11) becomes:
    //   start: "2025-12-11T06:00:00.000Z" (Dec 11 00:00:00 CST)
    //   end:   "2025-12-12T05:59:59.999Z" (Dec 11 23:59:59 CST)
    if (dateStart) {
      baseQuery = baseQuery.gte('transaction_date', dateStart)
    }
    if (dateEnd) {
      baseQuery = baseQuery.lte('transaction_date', dateEnd)
    }

    // Tab-based filtering using optimized membership view indexes
    switch (activeTab) {
      case 'trt':
        baseQuery = baseQuery
          .eq('product_category', 'TRT')
          .eq('source', 'Recurring')
          .eq('membership_status', 'active')
        break
      case 'weight_loss':
        baseQuery = baseQuery
          .eq('product_category', 'Weight Loss')
          .eq('source', 'Recurring')
          .eq('membership_status', 'active')
        break
      case 'peptides':
        baseQuery = baseQuery
          .eq('product_category', 'Peptides')
          .eq('source', 'Recurring')
          .eq('membership_status', 'active')
        break
      case 'ed':
        baseQuery = baseQuery
          .eq('product_category', 'ED')
          .eq('source', 'Recurring')
          .eq('membership_status', 'active')
        break
      case 'cancellations':
        baseQuery = baseQuery
          .eq('source', 'Recurring')
          .in('membership_status', ['canceled', 'paused'])
        break
      default: // 'all'
        baseQuery = baseQuery
          .eq('source', 'Recurring')
          .eq('membership_status', 'active')
        break
    }

    // Order by transaction date DESC for DISTINCT ON to get most recent per patient+product
    baseQuery = baseQuery.order('transaction_date', { ascending: false })

    const { data: transactions, error } = await baseQuery

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Client-side aggregation for patient census (most recent transaction per patient+product)
    // Using Map for O(1) lookup performance
    const censusMap = new Map<string, PatientCensusRecord>()
    const transactionCountMap = new Map<string, number>()

    if (transactions) {
      for (const transaction of transactions) {
        const key = `${transaction.customer_name}|${transaction.product_name || 'No Product'}`
        
        // Count transactions per patient+product
        transactionCountMap.set(key, (transactionCountMap.get(key) || 0) + 1)

        // Keep only the most recent transaction (already ordered by date DESC)
        if (!censusMap.has(key)) {
          censusMap.set(key, {
            ...transaction,
            last_payment_date: transaction.transaction_date,
            transaction_count: 0 // Will be set after counting
          })
        }
      }

      // Set transaction counts
      for (const [key, record] of censusMap) {
        record.transaction_count = transactionCountMap.get(key) || 1
      }
    }

    // Convert Map to Array and apply pagination - sorted by latest payment date
    const censusRecords = Array.from(censusMap.values())
      .sort((a, b) => new Date(b.last_payment_date).getTime() - new Date(a.last_payment_date).getTime())
      .slice(offset, offset + limit)

    // Calculate statistics efficiently using the existing data
    const statistics: CensusStatistics = {
      total: censusMap.size,
      byCategory: {
        'TRT': 0,
        'Weight Loss': 0,
        'Peptides': 0,
        'ED': 0,
        'Other': 0,
        'Uncategorized': 0
      },
      byMembershipStatus: {
        active: 0,
        canceled: 0,
        paused: 0
      },
      tabCounts: {
        all: 0,
        trt: 0,
        weight_loss: 0,
        peptides: 0,
        ed: 0,
        cancellations: 0
      }
    }

    // Calculate statistics in single pass
    for (const record of censusMap.values()) {
      // Category statistics
      const category = record.product_category || 'Uncategorized'
      if (statistics.byCategory[category] !== undefined) {
        statistics.byCategory[category]++
      }

      // Membership status statistics
      if (statistics.byMembershipStatus[record.membership_status]) {
        statistics.byMembershipStatus[record.membership_status]++
      }

      // Tab counts for patient census dashboard
      if (record.source === 'Recurring') {
        if (record.membership_status === 'active') {
          statistics.tabCounts.all++
          
          if (record.product_category === 'TRT') statistics.tabCounts.trt++
          if (record.product_category === 'Weight Loss') statistics.tabCounts.weight_loss++
          if (record.product_category === 'Peptides') statistics.tabCounts.peptides++
          if (record.product_category === 'ED') statistics.tabCounts.ed++
        }
        
        if (['canceled', 'paused'].includes(record.membership_status)) {
          statistics.tabCounts.cancellations++
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        records: censusRecords,
        recordCount: censusMap.size,
        statistics
      }
    })

  } catch (error) {
    console.error('Census API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// PATCH endpoint for updating patient census records (membership status, etc.)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user's merchant access for security
    const merchantId = await getCurrentMerchantId(request)

    const { searchParams } = new URL(request.url)
    const patientName = searchParams.get('patient')
    const productName = searchParams.get('product')

    if (!patientName || !productName) {
      return NextResponse.json({
        success: false,
        error: 'Patient name and product name are required'
      }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate allowed fields for patient census updates
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

    // Update all transactions for this patient+product combination with merchant filtering
    // This ensures consistent census data and proper tenant isolation
    let updateQuery = supabaseAdmin
      .from('transactions')
      .update(updates)
      .eq('customer_name', patientName)
      .eq('product_name', productName)
      .select()

    // Apply merchant filtering for security
    updateQuery = applyMerchantFilter(updateQuery, merchantId)

    const { data, error } = await updateQuery

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update patient census record' 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient census record not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedRecords: data.length,
        sampleRecord: data[0] // Return most recent transaction as sample
      }
    })

  } catch (error) {
    console.error('Census update API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}