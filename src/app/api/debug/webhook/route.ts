import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== MX Merchant Webhook Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('=======================================');

    // Acknowledge the webhook
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'MX Merchant Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
