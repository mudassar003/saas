import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { headers } from 'next/headers'

// MX Merchant webhook endpoint for real-time invoice updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('MX Merchant webhook received:', body)

    // Verify webhook signature (add your webhook secret verification here)
    const headersList = headers()
    const signature = headersList.get('x-mx-signature')
    
    // TODO: Implement signature verification
    // const isValid = verifyWebhookSignature(body, signature, process.env.MX_MERCHANT_WEBHOOK_SECRET)
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    // }

    // Process different webhook event types
    const eventType = body.eventType || body.type
    
    switch (eventType) {
      case 'Successful Payments':
        await handleSuccessfulPayment(body)
        break
        
      case 'Failed Payments':
        await handleFailedPayment(body)
        break
        
      case 'Refund Created':
        await handleRefundCreated(body)
        break
        
      case 'Chargebacks':
        await handleChargeback(body)
        break
        
      default:
        console.log('Unhandled webhook event type:', eventType)
    }

    // Log webhook event for debugging
    await logWebhookEvent(body, eventType)

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' })

  } catch (error) {
    console.error('MX Merchant webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleSuccessfulPayment(webhookData: any) {
  try {
    // Check if this is a new invoice or payment update
    const invoiceId = webhookData.invoiceId || webhookData.id
    
    if (!invoiceId) {
      console.log('No invoice ID in webhook data')
      return
    }

    // Check if invoice exists in database
    const { data: existingInvoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, mx_invoice_id')
      .eq('mx_invoice_id', invoiceId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing invoice:', fetchError)
      return
    }

    if (existingInvoice) {
      // Update existing invoice
      const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({
          status: 'Paid',
          paid_amount: parseFloat(webhookData.amount || webhookData.totalAmount || '0'),
          balance: 0,
          updated_at: new Date().toISOString()
        })
        .eq('mx_invoice_id', invoiceId)

      if (updateError) {
        console.error('Error updating invoice:', updateError)
      } else {
        console.log(`Invoice ${invoiceId} updated successfully`)
      }
    } else {
      // New invoice - fetch full details and insert
      await syncNewInvoice(invoiceId)
    }
  } catch (error) {
    console.error('Error handling successful payment:', error)
  }
}

async function handleFailedPayment(webhookData: any) {
  try {
    const invoiceId = webhookData.invoiceId || webhookData.id
    
    if (!invoiceId) return

    // Update invoice status to failed/unpaid
    const { error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'Unpaid',
        updated_at: new Date().toISOString()
      })
      .eq('mx_invoice_id', invoiceId)

    if (error) {
      console.error('Error updating failed payment:', error)
    } else {
      console.log(`Invoice ${invoiceId} marked as failed payment`)
    }
  } catch (error) {
    console.error('Error handling failed payment:', error)
  }
}

async function handleRefundCreated(webhookData: any) {
  try {
    const invoiceId = webhookData.invoiceId || webhookData.id
    const refundAmount = parseFloat(webhookData.refundAmount || webhookData.amount || '0')
    
    if (!invoiceId) return

    // Update invoice with refund information
    const { error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'Refunded',
        balance: refundAmount,
        updated_at: new Date().toISOString()
      })
      .eq('mx_invoice_id', invoiceId)

    if (error) {
      console.error('Error updating refund:', error)
    } else {
      console.log(`Invoice ${invoiceId} refund processed: $${refundAmount}`)
    }
  } catch (error) {
    console.error('Error handling refund:', error)
  }
}

async function handleChargeback(webhookData: any) {
  try {
    const invoiceId = webhookData.invoiceId || webhookData.id
    
    if (!invoiceId) return

    // Update invoice with chargeback status
    const { error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'Cancelled', // or create new status 'Chargeback'
        updated_at: new Date().toISOString()
      })
      .eq('mx_invoice_id', invoiceId)

    if (error) {
      console.error('Error updating chargeback:', error)
    } else {
      console.log(`Invoice ${invoiceId} marked as chargeback`)
    }
  } catch (error) {
    console.error('Error handling chargeback:', error)
  }
}

async function syncNewInvoice(invoiceId: number) {
  try {
    // Fetch invoice details from MX Merchant API
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET
    
    if (!consumerKey || !consumerSecret) {
      console.error('Missing MX Merchant credentials')
      return
    }

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    const apiUrl = `https://api.mxmerchant.com/checkout/v3/invoice/${invoiceId}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch invoice ${invoiceId}:`, response.status)
      return
    }

    const invoice = await response.json()
    
    // Insert new invoice into database
    const { error } = await supabaseAdmin
      .from('invoices')
      .insert({
        mx_invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        customer_name: invoice.customerName,
        customer_number: invoice.customerNumber || null,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate,
        api_created: invoice.created,
        status: invoice.status,
        subtotal_amount: parseFloat(invoice.subTotalAmount || '0'),
        tax_amount: parseFloat(invoice.taxAmount || '0'),
        discount_amount: parseFloat(invoice.discountAmount || '0'),
        total_amount: parseFloat(invoice.totalAmount || '0'),
        balance: parseFloat(invoice.balance || '0'),
        paid_amount: parseFloat(invoice.paidAmount || '0'),
        currency: invoice.currency || 'USD',
        receipt_number: invoice.receiptNumber,
        quantity: parseInt(invoice.quantity || '0'),
        return_quantity: parseInt(invoice.returnQuantity || '0'),
        return_status: invoice.returnStatus,
        source_type: invoice.sourceType,
        type: invoice.type,
        terms: invoice.terms,
        memo: invoice.memo,
        is_tax_exempt: invoice.isTaxExempt,
        merchant_id: invoice.merchantId,
        raw_data: invoice,
        data_sent_status: 'pending'
      })

    if (error) {
      console.error('Error inserting new invoice:', error)
    } else {
      console.log(`New invoice ${invoiceId} inserted successfully`)
    }
  } catch (error) {
    console.error('Error syncing new invoice:', error)
  }
}

async function logWebhookEvent(webhookData: any, eventType: string) {
  try {
    // Log webhook events for debugging and monitoring
    console.log(`Webhook Event: ${eventType}`, {
      timestamp: new Date().toISOString(),
      eventType,
      invoiceId: webhookData.invoiceId || webhookData.id,
      amount: webhookData.amount || webhookData.totalAmount,
      data: webhookData
    })
    
    // Optionally store in database for audit trail
    // await supabaseAdmin.from('webhook_logs').insert({
    //   event_type: eventType,
    //   payload: webhookData,
    //   processed_at: new Date().toISOString()
    // })
  } catch (error) {
    console.error('Error logging webhook event:', error)
  }
}

// Webhook signature verification function
function verifyWebhookSignature(payload: any, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  
  // Implement signature verification logic based on MX Merchant's specification
  // This would typically involve HMAC-SHA256 verification
  
  return true // Placeholder - implement actual verification
}