import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for storage
    const rawBody = await request.text()
    
    // Parse JSON if possible
    let webhookData = null
    try {
      webhookData = JSON.parse(rawBody)
    } catch (parseError) {
      // If not valid JSON, store as text in webhook_data
      webhookData = { raw_text: rawBody, parse_error: String(parseError) }
    }
    
    // Get headers
    const headers = Object.fromEntries(request.headers.entries())
    
    // Save to webhook_test_data table
    const { data, error } = await supabaseAdmin
      .from('webhook_test_data')
      .insert({
        webhook_data: webhookData,
        headers: headers,
        raw_body: rawBody,
        received_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('Error saving webhook data:', error)
      return NextResponse.json(
        { error: 'Failed to save webhook data', details: error.message },
        { status: 500 }
      )
    }

    console.log('Webhook data saved successfully:', data[0]?.id)

    return NextResponse.json({
      success: true,
      message: 'Webhook received and saved successfully',
      timestamp: new Date().toISOString(),
      id: data[0]?.id
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { 
        error: 'Webhook processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
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