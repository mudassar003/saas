import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    // Hardcoded values for testing - from your mx_merchant_configs table
    const consumerKey = "23pCdSYoeh57Prs4S3E2pgXA";
    const consumerSecret = "hTlF6fxcLOxCAXAjgVsjvyjWTNY=";
    const environment = "production"; // Using production environment
    const merchantId = 1000095245; // Your merchant ID from the database

    // Determine base URL (using production environment)
    const baseUrl = environment === 'production' 
      ? 'https://api.mxmerchant.com/checkout/v3'
      : 'https://sandbox.api.mxmerchant.com/checkout/v3';

    // Delete webhook subscription payload
    const deletePayload = {
      eventType: "PaymentSuccess", // The event type to delete
      merchantId: merchantId, // Required field - using hardcoded merchant ID
      sendEmail: false, // Turn off email
      sendSMS: false, // Turn off SMS  
      sendWebhook: false, // Turn off webhook - this disables it
      callbackUrl: "", // Empty callback URL
      threshold: 0,
      sources: "", // Empty sources
      inviteUsers: "" // Required field - can be empty string
    };

    console.log('Deleting webhook subscription:', {
      url: `${baseUrl}/subscription`,
      payload: deletePayload,
      merchantId: merchantId
    });

    // Create Basic Auth header
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/subscription`, {
      method: 'PUT', // Use PUT to update/disable the subscription
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deletePayload)
    });

    const responseText = await response.text();
    console.log('MX Merchant delete response:', {
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
      message: 'Webhook subscription disabled',
      environment
    });

  } catch (error) {
    console.error('Webhook deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
