import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
const xl = require('excel4node')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { includeProducts, filters } = body
    
    console.log('Excel Export request:', { includeProducts, filters })
    
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
    
    // Create a new workbook
    const wb = new xl.Workbook()
    const ws = wb.addWorksheet('Invoices')
    
    // Create comprehensive styles
    const headerStyle = wb.createStyle({
      font: {
        bold: true,
        color: 'FFFFFF',
        size: 12
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '2F5F8F'
      },
      border: {
        left: { style: 'thin', color: '000000' },
        right: { style: 'thin', color: '000000' },
        top: { style: 'thin', color: '000000' },
        bottom: { style: 'thin', color: '000000' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    })
    
    const currencyStyle = wb.createStyle({
      numberFormat: '$#,##0.00',
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'right'
      }
    })
    
    const currencyStyleAlt = wb.createStyle({
      numberFormat: '$#,##0.00',
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'F8F9FA'
      },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'right'
      }
    })
    
    const dateStyle = wb.createStyle({
      numberFormat: 'yyyy-mm-dd',
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'center'
      }
    })
    
    const dateStyleAlt = wb.createStyle({
      numberFormat: 'yyyy-mm-dd',
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'F8F9FA'
      },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'center'
      }
    })
    
    const cellStyle = wb.createStyle({
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        vertical: 'center'
      }
    })
    
    const cellStyleAlt = wb.createStyle({
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'F8F9FA'
      },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        vertical: 'center'
      }
    })
    
    const yesStyle = wb.createStyle({
      font: { bold: true, color: '00B050' },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    })
    
    const yesStyleAlt = wb.createStyle({
      font: { bold: true, color: '00B050' },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'F8F9FA'
      },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    })
    
    const noStyle = wb.createStyle({
      font: { bold: true, color: 'C00000' },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    })
    
    const noStyleAlt = wb.createStyle({
      font: { bold: true, color: 'C00000' },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'F8F9FA'
      },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    })
    
    const numberStyle = wb.createStyle({
      numberFormat: '#,##0',
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'right'
      }
    })
    
    const numberStyleAlt = wb.createStyle({
      numberFormat: '#,##0',
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'F8F9FA'
      },
      border: {
        left: { style: 'thin', color: 'D3D3D3' },
        right: { style: 'thin', color: 'D3D3D3' },
        top: { style: 'thin', color: 'D3D3D3' },
        bottom: { style: 'thin', color: 'D3D3D3' }
      },
      alignment: {
        horizontal: 'right'
      }
    })
    
    // Define headers
    const headers = [
      'ID',
      'Invoice#',
      'Customer',
      'Status',
      'Amount',
      'Date',
      'Data Sent',
      'Internal Link'
    ]
    
    if (includeProducts) {
      headers.push('Products')
    }
    
    // Add title row
    const titleStyle = wb.createStyle({
      font: {
        bold: true,
        color: '2F5F8F',
        size: 16
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    })
    
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    ws.cell(1, 1, 1, headers.length, true).string(`GameDay Men's Health - Invoice Export (${currentDate})`).style(titleStyle)
    ws.row(1).setHeight(25)
    
    // Add headers
    headers.forEach((header, index) => {
      ws.cell(2, index + 1).string(header).style(headerStyle)
    })
    ws.row(2).setHeight(20)
    
    // Add data rows with alternating styles
    invoices.forEach((invoice, rowIndex) => {
      const row = rowIndex + 3 // Start from row 3 now (after title and headers)
      const isEvenRow = rowIndex % 2 === 0
      
      // ID
      ws.cell(row, 1).number(invoice.mx_invoice_id).style(isEvenRow ? numberStyle : numberStyleAlt)
      
      // Invoice#
      ws.cell(row, 2).number(invoice.invoice_number).style(isEvenRow ? numberStyle : numberStyleAlt)
      
      // Customer
      ws.cell(row, 3).string(invoice.customer_name || '').style(isEvenRow ? cellStyle : cellStyleAlt)
      
      // Status
      ws.cell(row, 4).string(invoice.status || '').style(isEvenRow ? cellStyle : cellStyleAlt)
      
      // Amount
      ws.cell(row, 5).number(invoice.total_amount || 0).style(isEvenRow ? currencyStyle : currencyStyleAlt)
      
      // Date
      if (invoice.invoice_date) {
        ws.cell(row, 6).date(new Date(invoice.invoice_date)).style(isEvenRow ? dateStyle : dateStyleAlt)
      } else {
        ws.cell(row, 6).string('').style(isEvenRow ? cellStyle : cellStyleAlt)
      }
      
      // Data Sent
      const dataSentStatus = invoice.data_sent_status === 'yes' ? 'YES' : 
                            invoice.data_sent_status === 'no' ? 'NO' : 'Pending'
      let dataSentStyle = isEvenRow ? cellStyle : cellStyleAlt
      
      if (invoice.data_sent_status === 'yes') {
        dataSentStyle = isEvenRow ? yesStyle : yesStyleAlt
      } else if (invoice.data_sent_status === 'no') {
        dataSentStyle = isEvenRow ? noStyle : noStyleAlt
      }
      
      ws.cell(row, 7).string(dataSentStatus).style(dataSentStyle)
      
      // Internal Link
      const internalLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/invoices/${invoice.mx_invoice_id}`
      ws.cell(row, 8).string(internalLink).style(isEvenRow ? cellStyle : cellStyleAlt)
      
      // Products (if requested)
      if (includeProducts) {
        ws.cell(row, 9).string('Products not fetched in this version').style(isEvenRow ? cellStyle : cellStyleAlt)
      }
    })
    
    // Set column widths for better readability
    ws.column(1).setWidth(12)  // ID
    ws.column(2).setWidth(15)  // Invoice#
    ws.column(3).setWidth(25)  // Customer
    ws.column(4).setWidth(15)  // Status
    ws.column(5).setWidth(15)  // Amount
    ws.column(6).setWidth(15)  // Date
    ws.column(7).setWidth(15)  // Data Sent
    ws.column(8).setWidth(60)  // Internal Link
    
    if (includeProducts) {
      ws.column(9).setWidth(35)  // Products
    }
    
    // Note: Freeze panes syntax needs to be verified for excel4node
    // Removing for now to ensure export works
    
    // Set row height for all data rows
    for (let i = 3; i <= invoices.length + 2; i++) {
      ws.row(i).setHeight(18)
    }
    
    // Generate Excel buffer
    const buffer = await wb.writeToBuffer()
    
    console.log(`Generated Excel file with ${invoices.length} invoices`)
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })
    
  } catch (error) {
    console.error('Excel export error:', error)
    return NextResponse.json({
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}