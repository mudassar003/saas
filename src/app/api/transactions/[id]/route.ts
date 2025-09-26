import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params

    // Get current user's merchant access for security
    const merchantId = await getCurrentMerchantId(request)

    console.log('Fetching transaction details for ID:', transactionId, { merchantId })

    // Fetch transaction with merchant filtering for security
    let query = supabaseAdmin
      .from('transactions')
      .select(`*`)
      .eq('id', transactionId)

    // Apply merchant filtering
    query = applyMerchantFilter(query, merchantId)

    const { data: transaction, error } = await query.single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    if (!transaction) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction not found' 
      }, { status: 404 })
    }

    // If transaction has invoice number, fetch all invoices with that number (with merchant filtering)
    let invoices: Array<{
      id: string;
      invoice_number: number;
      customer_name?: string;
      total_amount: number;
      invoice_date?: string;
      data_sent_status?: string;
      ordered_by_provider_at?: string;
      created_at: string;
    }> = []
    if (transaction.mx_invoice_number) {
      let invoiceQuery = supabaseAdmin
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_name,
          total_amount,
          invoice_date,
          data_sent_status,
          ordered_by_provider_at,
          created_at
        `)
        .eq('invoice_number', transaction.mx_invoice_number)
        .order('created_at', { ascending: false })

      // Apply merchant filtering to invoices as well
      invoiceQuery = applyMerchantFilter(invoiceQuery, merchantId)

      const { data: invoiceData, error: invoiceError } = await invoiceQuery

      if (invoiceData && !invoiceError) {
        invoices = invoiceData
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...transaction,
        invoices
      }
    })

  } catch (error) {
    console.error('Transaction details API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}