import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    console.log('Setup API called with action:', action)
    
    if (action === 'setup') {
      // Test database connection
      console.log('Testing database connection...')
      const { error: testError } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('Database connection test failed:', testError)
        return NextResponse.json({ 
          error: 'Database connection failed', 
          details: testError 
        }, { status: 500 })
      }
      
      console.log('Database connection successful')

      // Check environment variables
      const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY
      const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET

      if (!consumerKey || !consumerSecret) {
        return NextResponse.json({ 
          error: 'Missing MX Merchant credentials in environment variables'
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Setup completed - ready to sync invoices'
      })
    }

    if (action === 'sync') {
      // Get MX Merchant credentials from environment
      const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY
      const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET
      // const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'production'

      if (!consumerKey || !consumerSecret) {
        return NextResponse.json({ 
          error: 'Missing MX Merchant credentials' 
        }, { status: 400 })
      }

      // Direct API call with pagination to get ALL invoices
      const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
      
      let totalProcessed = 0
      let totalFailed = 0
      const errors: string[] = []
      const allInvoices: unknown[] = []
      
      try {
        // First, get total count
        const firstResponse = await fetch('https://api.mxmerchant.com/checkout/v3/invoice?limit=1&offset=0', {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json'
          }
        })

        if (!firstResponse.ok) {
          const errorText = await firstResponse.text()
          return NextResponse.json({
            success: false,
            error: `API request failed: ${firstResponse.status}`,
            details: errorText
          }, { status: 500 })
        }

        const firstData = await firstResponse.json()
        const totalCount = firstData.recordCount
        console.log(`Total invoices available: ${totalCount}`)

        // Fetch all invoices with pagination
        const batchSize = 100
        let offset = 0
        
        while (offset < totalCount) {
          const apiUrl = `https://api.mxmerchant.com/checkout/v3/invoice?limit=${batchSize}&offset=${offset}`
          console.log(`Fetching batch: ${offset + 1} to ${Math.min(offset + batchSize, totalCount)} of ${totalCount}`)
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Accept': 'application/json'
            }
          })

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text()
            console.error(`Batch failed at offset ${offset}:`, errorText)
            offset += batchSize
            continue
          }

          const data = await apiResponse.json()
          
          if (data.records && data.records.length > 0) {
            allInvoices.push(...data.records)
            console.log(`Batch completed. Total fetched so far: ${allInvoices.length}`)
          }
          
          // If we got fewer records than requested, we're done
          if (!data.records || data.records.length < batchSize) {
            break
          }
          
          offset += batchSize
        }

        console.log(`Successfully fetched ${allInvoices.length} invoices from MX Merchant`)

        // Get existing invoices from database for comparison
        console.log('Fetching existing invoices from database...')
        const { data: existingInvoices, error: fetchError } = await supabaseAdmin
          .from('invoices')
          .select('mx_invoice_id, status, total_amount, api_created, data_sent_status, data_sent_by, data_sent_at, data_sent_notes')

        if (fetchError) {
          console.error('Error fetching existing invoices:', fetchError)
          return NextResponse.json({ success: false, error: 'Database fetch failed' }, { status: 500 })
        }

        // Create a map of existing invoices for quick lookup
        const existingInvoicesMap = new Map()
        existingInvoices?.forEach(invoice => {
          existingInvoicesMap.set(invoice.mx_invoice_id, invoice)
        })

        console.log(`Found ${existingInvoices?.length || 0} existing invoices in database`)

        // Categorize invoices: new, updated, unchanged
        let newInvoices = 0
        let updatedInvoices = 0
        let unchangedInvoices = 0
        let preservedWorkflowData = 0

        // Process invoices with intelligent sync
        for (const invoice of allInvoices) {
          try {
            const existingInvoice = existingInvoicesMap.get(invoice.id)
            
            // Prepare new invoice data
            const newInvoiceData = {
              mx_invoice_id: invoice.id,
              invoice_number: invoice.invoiceNumber,
              customer_name: invoice.customerName,
              customer_number: invoice.customerNumber || null,
              invoice_date: invoice.invoiceDate,
              due_date: invoice.dueDate,
              api_created: invoice.created,
              status: invoice.status,
              subtotal_amount: parseFloat(invoice.subTotalAmount),
              tax_amount: parseFloat(invoice.taxAmount || '0'),
              discount_amount: parseFloat(invoice.discountAmount || '0'),
              total_amount: parseFloat(invoice.totalAmount),
              balance: parseFloat(invoice.balance),
              paid_amount: parseFloat(invoice.paidAmount),
              currency: invoice.currency || 'USD',
              receipt_number: invoice.receiptNumber,
              quantity: parseInt(invoice.quantity),
              return_quantity: parseInt(invoice.returnQuantity || '0'),
              return_status: invoice.returnStatus,
              source_type: invoice.sourceType,
              type: invoice.type,
              terms: invoice.terms,
              memo: invoice.memo,
              is_tax_exempt: invoice.isTaxExempt,
              merchant_id: invoice.merchantId,
              raw_data: invoice
            }

            if (!existingInvoice) {
              // New invoice - set default nurse workflow status
              newInvoiceData.data_sent_status = 'pending'
              newInvoiceData.data_sent_by = null
              newInvoiceData.data_sent_at = null
              newInvoiceData.data_sent_notes = null
              newInvoices++
            } else {
              // Check if invoice has changed
              const hasChanged = 
                existingInvoice.status !== invoice.status ||
                existingInvoice.total_amount !== parseFloat(invoice.totalAmount) ||
                existingInvoice.api_created !== invoice.created

              if (hasChanged) {
                // Preserve nurse workflow data for existing invoices
                newInvoiceData.data_sent_status = existingInvoice.data_sent_status
                newInvoiceData.data_sent_by = existingInvoice.data_sent_by
                newInvoiceData.data_sent_at = existingInvoice.data_sent_at
                newInvoiceData.data_sent_notes = existingInvoice.data_sent_notes
                updatedInvoices++
                preservedWorkflowData++
              } else {
                // No changes - preserve everything
                newInvoiceData.data_sent_status = existingInvoice.data_sent_status
                newInvoiceData.data_sent_by = existingInvoice.data_sent_by
                newInvoiceData.data_sent_at = existingInvoice.data_sent_at
                newInvoiceData.data_sent_notes = existingInvoice.data_sent_notes
                unchangedInvoices++
                preservedWorkflowData++
              }
            }

            // Upsert the invoice
            const { error } = await supabaseAdmin
              .from('invoices')
              .upsert(newInvoiceData, {
                onConflict: 'mx_invoice_id',
                ignoreDuplicates: false
              })

            if (error) {
              console.error('Failed to upsert invoice:', invoice.id, error)
              errors.push(`Invoice ${invoice.id}: ${error.message}`)
              totalFailed++
            } else {
              totalProcessed++
            }
          } catch (err) {
            console.error('Error processing invoice:', invoice.id, err)
            errors.push(`Invoice ${invoice.id}: ${err}`)
            totalFailed++
          }
        }

        console.log(`Sync completed:`)
        console.log(`- New invoices: ${newInvoices}`)
        console.log(`- Updated invoices: ${updatedInvoices}`)
        console.log(`- Unchanged invoices: ${unchangedInvoices}`)
        console.log(`- Preserved workflow data: ${preservedWorkflowData}`)
        console.log(`- Failed: ${totalFailed}`)

        return NextResponse.json({
          success: true,
          message: `Intelligent sync completed successfully`,
          summary: {
            totalProcessed: totalProcessed,
            totalFailed: totalFailed,
            totalFetched: allInvoices.length,
            totalAvailable: totalCount,
            newInvoices: newInvoices,
            updatedInvoices: updatedInvoices,
            unchangedInvoices: unchangedInvoices,
            preservedWorkflowData: preservedWorkflowData
          },
          errors: errors.slice(0, 10) // Limit error messages
        })

      } catch (error) {
        console.error('Sync error:', error)
        return NextResponse.json({
          success: false,
          error: 'Sync failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=setup or ?action=sync' }, { status: 400 })

  } catch (error) {
    console.error('Setup/Sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get sync status from database
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('id, data_sent_status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
    }

    const totalInvoices = invoices.length
    const pendingCount = invoices.filter(i => i.data_sent_status === 'pending').length
    const yesCount = invoices.filter(i => i.data_sent_status === 'yes').length
    const noCount = invoices.filter(i => i.data_sent_status === 'no').length

    return NextResponse.json({
      success: true,
      data: {
        totalInvoices,
        pendingCount,
        yesCount,
        noCount,
        lastSync: invoices[0]?.created_at || null
      }
    })

  } catch (error) {
    console.error('Setup sync status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}