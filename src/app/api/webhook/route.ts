import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    
    const { data, error } = await supabaseAdmin
      .from('webhook_test_data')
      .insert({
        raw_data: rawBody
      })
      .select()
    
    if (error) {
      console.error('Error saving webhook data:', error)
      return NextResponse.json(
        { error: 'Failed to save webhook data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data[0]?.id
    })

  } catch (error) {
    console.error('Webhook error:', error)
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