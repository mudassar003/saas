import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { includeProducts, filters } = body
    
    console.log('CSV Export request:', { includeProducts, filters })
    
    // Build query based on filters
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        mx_invoice_id,
        invoice_number,
        customer_name,
        status,
        total_amount,
        invoice_date,
        data_sent_status,
        data_sent_by,
        data_sent_at,
        created_at
      `)
      .order('invoice_date', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (filters?.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,invoice_number.eq.${filters.search}`)
    }
    
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    
    if (filters?.dataSentStatus && filters.dataSentStatus !== 'all') {
      query = query.eq('data_sent_status', filters.dataSentStatus)
    }
    
    if (filters?.dateStart) {
      query = query.gte('invoice_date', filters.dateStart)
    }
    
    if (filters?.dateEnd) {
      query = query.lte('invoice_date', filters.dateEnd)
    }

    // Fetch all matching invoices
    const { data: invoices, error } = await query
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    // Prepare data for CSV export
    const csvData = invoices.map(invoice => {
      const row = {
        'ID': invoice.mx_invoice_id,
        'Invoice#': invoice.invoice_number,
        'Customer': invoice.customer_name || '',
        'Status': invoice.status || '',
        'Amount': `$${invoice.total_amount || 0}`,
        'Date': invoice.invoice_date || '',
        'Data Sent': invoice.data_sent_status === 'yes' ? 'YES' : 
                     invoice.data_sent_status === 'no' ? 'NO' : 'Pending',
        'Internal Link': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/invoices/${invoice.mx_invoice_id}`
      }
      
      if (includeProducts) {
        row['Products'] = 'Products not fetched in this version'
      }
      
      return row
    })
    
    // Generate CSV using papaparse
    const csvContent = Papa.unparse(csvData, {
      header: true,
      delimiter: ',',
      quotes: true
    })
    
    console.log(`Generated CSV with ${invoices.length} invoices`)
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
    
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}