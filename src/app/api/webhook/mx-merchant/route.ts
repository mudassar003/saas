import { NextRequest, NextResponse } from 'next/server'
import { logWebhook } from '@/lib/webhook-debug' // TEMPORARY: Remove this import later

/**
 * MX Merchant Webhook Endpoint
 * Handles webhooks from all tenants (500+) for multi-tenant SaaS
 * 
 * Flow: MX Merchant → This endpoint → Upstash Queue → Railway Worker → Database
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw webhook payload from MX Merchant
    const webhookData = await request.json()
    
    // TEMPORARY: Debug logging (remove this line later)
    logWebhook(webhookData)
    
    // Basic validation - only check for critical fields we need
    if (!webhookData?.merchantId || !webhookData?.eventType) {
      console.error('Invalid webhook payload: missing merchantId or eventType', {
        hasId: !!webhookData?.id,
        hasEventType: !!webhookData?.eventType,
        hasMerchantId: !!webhookData?.merchantId
      })
      
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }
    
    // TODO: Send to Upstash Redis queue (next step)
    // await upstashQueue.enqueue('mx-transactions', {
    //   correlationId: generateId(),
    //   payload: webhookData,
    //   receivedAt: new Date().toISOString()
    // })
    
    // For now, just log successful reception
    console.log('✅ Webhook processed successfully:', {
      merchantId: webhookData.merchantId,
      eventType: webhookData.eventType,
      transactionId: webhookData.id,
      timestamp: new Date().toISOString()
    })
    
    // Fast response to MX Merchant (acknowledge receipt)
    return NextResponse.json({ 
      success: true,
      message: 'Webhook received',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Return 500 so MX Merchant will retry
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Webhook processing failed'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle GET requests for webhook endpoint testing
 */
export async function GET() {
  return NextResponse.json({
    message: 'MX Merchant Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
}