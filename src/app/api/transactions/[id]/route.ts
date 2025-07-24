import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id
    
    console.log('Fetching transaction details for ID:', transactionId)

    // Fetch transaction with all linked invoices
    let query = supabaseAdmin
      .from('transactions')
      .select(`*`)
      .eq('id', transactionId)
      .single()

    const { data: transaction, error } = await query

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

    // If transaction has invoice number, fetch all invoices with that number
    let invoices = []
    if (transaction.mx_invoice_number) {
      const { data: invoiceData, error: invoiceError } = await supabaseAdmin
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