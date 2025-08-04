import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { eventType } = await request.json();
    
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY;
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET;
    const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'sandbox';
    
    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({
        success: false,
        error: 'MX Merchant credentials not found'
      }, { status: 500 });
    }

    // Determine base URL
    const baseUrl = environment === 'production' 
      ? 'https://api.mxmerchant.com/checkout/v3'
      : 'https://sandbox.api.mxmerchant.com/checkout/v3';

    // Create webhook subscription payload
    const webhookPayload = {
      sendEmail: false,
      sendSMS: false,
      sendWebhook: true,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://saas-wine-three.vercel.app'}/api/webhook-test/receive`,
      sources: "QuickPay, API, Recurring",
      threshold: 0
    };

    console.log('Creating webhook subscription:', {
      url: `${baseUrl}/subscription`,
      payload: webhookPayload,
      eventType
    });

    // Create Basic Auth header
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/subscription`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await response.text();
    console.log('MX Merchant response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      webhookUrl: webhookPayload.callbackUrl,
      environment
    });

  } catch (error) {
    console.error('Webhook subscription error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}