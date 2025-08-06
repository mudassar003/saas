import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified MX Merchant Webhook - Matches Flask app speed
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body first for debugging
    const rawBody = await request.text()
    console.log('Raw webhook body:', rawBody)
    
    // Parse JSON
    const webhookData = JSON.parse(rawBody)
    
    // Log webhook (same as Flask print)
    console.log('✅ Webhook received:', JSON.stringify(webhookData, null, 2))
    
    // Instant response
    return NextResponse.json({ 
      success: true,
      received: webhookData,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ 
      error: 'Webhook failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 400 })
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