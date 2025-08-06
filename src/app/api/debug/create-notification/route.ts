import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl: providedWebhookUrl } = await request.json();

    // Use provided webhook URL or fallback to environment URL
    const webhookUrl = providedWebhookUrl || process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/mx-merchant';

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    console.log('Using webhook URL:', webhookUrl);

    // Get credentials from environment variables - using same pattern as setup page
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY;
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET;
    const merchantId = process.env.MX_MERCHANT_ID;
    const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'sandbox';

    console.log('Environment check (using setup page pattern):', {
      consumerKeyPresent: !!consumerKey,
      consumerSecretPresent: !!consumerSecret,
      merchantIdPresent: !!merchantId,
      environment: environment,
      consumerKeyLength: consumerKey?.length,
      merchantId: merchantId
    });

    if (!consumerKey || !consumerSecret || !merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing MX Merchant credentials (same as setup page)' },
        { status: 500 }
      );
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    console.log('Authentication details:', {
      consumerKeyFirstFew: consumerKey?.substring(0, 6) + '...',
      consumerSecretFirstFew: consumerSecret?.substring(0, 6) + '...',
      credentialsLength: credentials.length,
      authHeaderSample: 'Basic ' + credentials.substring(0, 20) + '...'
    });
    
    // Notification subscription payload - production webhook endpoint  
    const payload = {
      eventType: "PaymentSuccess", // Exact match from MX Merchant enum
      sendEmail: false,
      emailAddress: "mudassarrehman1208@gmail.com", // Required even when disabled
      sendSMS: false,
      phoneNumber: "1112223344", // Required format - 10 digits no formatting
      sendWebhook: true,
      callbackUrl: providedWebhookUrl || "https://saas-wine-three.vercel.app/api/webhook/mx-merchant",
      sources: "QuickPay, API, Recurring",
      merchantId: parseInt(merchantId),
      threshold: 0
    };

    console.log('Creating webhook notification subscription with payload:', payload);

    // Use appropriate API URL based on environment
    const apiUrl = environment === 'production' 
      ? 'https://api.mxmerchant.com/checkout/v3/subscription'
      : 'https://sandbox.api.mxmerchant.com/checkout/v3/subscription';
    
    console.log('Using API URL based on environment:', { environment, apiUrl });
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('=== MX Merchant API Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Body:', responseText);
    console.log('================================');

    if (!response.ok) {
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails = errorJson.message || errorJson.errorCode || responseText;
      } catch {
        // If it's not JSON, use the raw text
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `MX Merchant API error: ${response.status}`,
          message: errorDetails,
          rawResponse: responseText 
        },
        { status: response.status }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification subscription created successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error creating notification subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
