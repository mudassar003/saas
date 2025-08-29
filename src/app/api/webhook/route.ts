import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log(`🚀 [${timestamp}] Webhook POST request received`)
  
  try {
    const rawBody = await request.text()
    const headers = Object.fromEntries(request.headers.entries())
    
    console.log(`📝 [${timestamp}] Raw body length: ${rawBody.length} chars`)
    console.log(`📋 [${timestamp}] Headers:`, JSON.stringify(headers, null, 2))
    console.log(`💾 [${timestamp}] Webhook payload:`, rawBody)
    
    const { data, error } = await supabaseAdmin
      .from('webhook_test_data')
      .insert({
        raw_body: rawBody,
        webhook_data: JSON.parse(rawBody),
        headers: headers,
        received_at: timestamp
      })
      .select()
    
    if (error) {
      console.error(`❌ [${timestamp}] Database error:`, error)
      return NextResponse.json(
        { error: 'Failed to save webhook data', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ [${timestamp}] Webhook saved successfully with ID: ${data[0]?.id}`)
    
    return NextResponse.json({
      success: true,
      id: data[0]?.id,
      timestamp: timestamp
    })

  } catch (error) {
    console.error(`💥 [${timestamp}] Webhook processing error:`, error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
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