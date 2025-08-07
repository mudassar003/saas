// src/app/api/webhook/mx-merchant/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified MX Merchant Webhook - Matches Flask app speed
 */
export async function POST(request: NextRequest) {
  try {
    // Enhanced debugging - log everything
    console.log('🔍 Webhook Debug Info:')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Content-Type:', request.headers.get('content-type'))
    console.log('Content-Length:', request.headers.get('content-length'))
    console.log('Timestamp:', new Date().toISOString())
    
    // Get raw body first for debugging
    const rawBody = await request.text()
    console.log('Raw body length:', rawBody.length)
    console.log('Raw body:', rawBody.slice(0, 500)) // First 500 chars
    
    let webhookData
    
    // Try to parse JSON safely
    if (!rawBody || rawBody.trim() === '') {
      console.log('⚠️ Empty body received')
      webhookData = { error: 'Empty body', timestamp: new Date().toISOString() }
    } else {
      try {
        webhookData = JSON.parse(rawBody)
        console.log('✅ JSON parsed successfully')
      } catch (parseError) {
        console.log('❌ JSON parse failed:', parseError)
        webhookData = { 
          error: 'Invalid JSON', 
          rawBody: rawBody,
          parseError: String(parseError),
          timestamp: new Date().toISOString()
        }
      }
    }
    
    // Log final webhook data
    console.log('📦 Final webhook data:')
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
      <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <h4>Debug Info:</h4>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Content-Type:</strong> ${request.headers.get('content-type')}</p>
          <p><strong>Body Length:</strong> ${rawBody.length}</p>
      </div>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
    
  } catch (error) {
    console.error('❌ Webhook error:', error)
    
    // Return detailed error info
    return new Response(`
      <h2>❌ Webhook Error</h2>
      <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Error Details:</h3>
          <pre style="background-color: #2d2d2d; color: #ffffff; padding: 15px; border-radius: 5px;">
Error: ${String(error)}
Timestamp: ${new Date().toISOString()}
          </pre>
      </div>
    `, { 
      status: 200, // Return 200 to avoid MX Merchant retries
      headers: { 'Content-Type': 'text/html' }
    })
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