import { NextRequest, NextResponse } from 'next/server'
import { createMXClientForMerchant } from '@/lib/mx-merchant-client'
import { MXWebhookPayload } from '@/types/invoice'
import {
  saveTransactionFromWebhook,
  saveInvoiceFromWebhook,
  lookupProductCategory,
  updateTransactionInvoiceLink,
  logWebhookProcessing,
  transformPaymentDetailToTransaction,
  transformInvoiceDetailToInvoice
} from '@/lib/database/webhook-operations'

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log(`🚀 [${timestamp}] MX Merchant webhook received`)
  
  try {
    const rawBody = await request.text()
    const payload: MXWebhookPayload = JSON.parse(rawBody)
    
    console.log(`📥 [${timestamp}] Processing transaction ${payload.id} for merchant ${payload.merchantId}`)
    
    const { merchantId } = payload
    const transactionId = parseInt(payload.id)
    
    // 1. Get merchant-specific MX Client with credentials
    const mxClient = await createMXClientForMerchant(merchantId)
    
    // 2. Fetch enhanced transaction details from MX Merchant API
    const transactionDetail = await mxClient.getPaymentDetail(transactionId, merchantId)
    
    let invoiceId: string | null = null
    let productName: string | null = null
    let productCategory: string | null = null
    
    // 3. Process invoices if they exist
    if (transactionDetail.invoiceIds && transactionDetail.invoiceIds.length > 0) {
      const mxInvoiceId = transactionDetail.invoiceIds[0]
      
      try {
        // Fetch invoice details
        const invoiceDetail = await mxClient.getInvoiceDetail(mxInvoiceId, merchantId)
        
        // Extract product information
        if (invoiceDetail.purchases && invoiceDetail.purchases.length > 0) {
          productName = invoiceDetail.purchases[0].productName
          productCategory = await lookupProductCategory(productName, merchantId)
        }
        
        // Save invoice to database
        const invoiceData = transformInvoiceDetailToInvoice(invoiceDetail, merchantId)
        const savedInvoice = await saveInvoiceFromWebhook(invoiceData)
        invoiceId = savedInvoice.id
        
        console.log(`💰 [${timestamp}] Invoice ${mxInvoiceId} processed with product: ${productName}`)
        
      } catch (invoiceError) {
        console.error(`⚠️ [${timestamp}] Invoice processing failed for ${mxInvoiceId}:`, invoiceError)
        // Continue with transaction processing even if invoice fails
      }
    }
    
    // 4. Save transaction with all collected data
    const transactionData = transformPaymentDetailToTransaction(
      transactionDetail,
      payload,
      productName,
      productCategory,
      invoiceId
    )
    
    const savedTransaction = await saveTransactionFromWebhook(transactionData)
    
    // 5. Link transaction to invoice if both exist
    if (invoiceId && savedTransaction.id) {
      await updateTransactionInvoiceLink(savedTransaction.id, invoiceId)
    }
    
    // 6. Log successful processing
    await logWebhookProcessing(merchantId, transactionId, 'success')
    
    console.log(`✅ [${timestamp}] Transaction ${transactionId} processed successfully`)
    
    return NextResponse.json({
      success: true,
      transactionId: savedTransaction.id,
      invoiceId,
      productCategory,
      timestamp
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`💥 [${timestamp}] Webhook processing failed:`, error)
    
    // Log failed processing if we have merchant info
    try {
      const payload = JSON.parse(await request.clone().text())
      if (payload.merchantId && payload.id) {
        await logWebhookProcessing(
          payload.merchantId,
          parseInt(payload.id),
          'error',
          errorMessage
        )
      }
    } catch (logError) {
      console.error(`Failed to log error:`, logError)
    }
    
    return NextResponse.json(
      { error: 'Webhook processing failed', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple Webhook Endpoint - Ready to receive data',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhook'
  })
}