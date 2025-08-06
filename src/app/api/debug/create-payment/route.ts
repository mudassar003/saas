import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

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
    
    // Payment payload with test card details
    const payload = {
      merchantId: merchantId,
      tenderType: "Card",
      amount: parseFloat(amount.toString()),
      cardAccount: {
        number: "4242424242424242",
        expiryMonth: "12",
        expiryYear: "2026",
        cvv: "123",
        avsZip: "12345",
        avsStreet: "123 Main St"
      },
      source: "API"
    };

    console.log('Creating test payment with payload:', {
      ...payload,
      cardAccount: {
        ...payload.cardAccount,
        number: "****" + payload.cardAccount.number.slice(-4),
        cvv: "***"
      }
    });

    // Make request to MX Merchant API - trying production URL for testing
    const apiUrl = 'https://api.mxmerchant.com/checkout/v3/payment';
    
    console.log('Using production API URL for testing:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('MX Merchant payment response status:', response.status);
    console.log('MX Merchant payment response:', responseText);

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
          error: `MX Merchant Payment API error: ${response.status}`,
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

    // Extract transaction ID if available
    const transactionId = responseData?.id || responseData?.paymentId || null;

    return NextResponse.json({
      success: true,
      message: 'Test payment created successfully',
      transactionId: transactionId,
      data: responseData
    });

  } catch (error) {
    console.error('Error creating test payment:', error);
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
