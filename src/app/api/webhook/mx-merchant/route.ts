import { NextRequest, NextResponse } from 'next/server'
import { logWebhook } from '@/lib/webhook-debug'

/**
 * Simplified MX Merchant Webhook - Matches Flask app speed
 */
export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    // Log webhook (same as Flask print)
    console.log('✅ Webhook received:', JSON.stringify(webhookData, null, 2))
    logWebhook(webhookData)
    
    // Instant response
    return NextResponse.json({ 
      success: true,
      received: webhookData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 400 })
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