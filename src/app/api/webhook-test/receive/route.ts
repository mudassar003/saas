import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook received!');
    
    // Get raw body
    const body = await request.text();
    console.log('Raw webhook body:', body);
    
    // Try to parse as JSON
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch {
      webhookData = { rawData: body };
    }
    
    // Get headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    console.log('Webhook headers:', headers);
    console.log('Webhook data:', webhookData);
    
    // Store in test table
    const { data, error } = await supabaseAdmin
      .from('webhook_test_data')
      .insert({
        webhook_data: webhookData,
        headers: headers,
        raw_body: body,
        received_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      // Don't return error to MX Merchant - we still want to acknowledge receipt
    } else {
      console.log('Webhook data stored:', data);
    }
    
    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Still return 200 to acknowledge receipt, but log the error
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received with errors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Also handle GET requests for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'MX Merchant webhook endpoint is active',
    endpoint: '/api/webhook-test/receive',
    timestamp: new Date().toISOString()
  });
}