import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified MX Merchant Webhook - Matches Flask app speed
 */
export async function POST(request: NextRequest) {
  try {
    // Use built-in JSON parsing (like Flask request.json)
    const webhookData = await request.json()
    
    // Log webhook (same as Flask print)
    console.log('✅ Webhook received:')
    console.log(JSON.stringify(webhookData, null, 2))
    
    // Return HTML response (same as Flask)
    return new Response(`
      <h2>✅ Webhook Received Successfully!</h2>
      <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>📦 Received Payload:</h3>
          <pre style="background-color: #2d2d2d; color: #ffffff; padding: 15px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(webhookData, null, 2)}
          </pre>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Error processing webhook: ${error}`, { status: 400 })
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