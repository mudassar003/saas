import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Listing existing notification subscriptions...');

    // Get credentials from environment variables - same pattern as create-notification
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY;
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET;
    const merchantId = process.env.MX_MERCHANT_ID;
    const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'production';

    console.log('Environment check:', {
      consumerKeyPresent: !!consumerKey,
      consumerSecretPresent: !!consumerSecret,
      merchantIdPresent: !!merchantId,
      environment: environment,
      merchantId: merchantId
    });

    if (!consumerKey || !consumerSecret || !merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing MX Merchant credentials' },
        { status: 500 }
      );
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // Use appropriate API URL based on environment
    const apiUrl = environment === 'production' 
      ? 'https://api.mxmerchant.com/checkout/v3/subscription'
      : 'https://sandbox.api.mxmerchant.com/checkout/v3/subscription';
    
    console.log('Getting notifications from:', { environment, apiUrl });
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      }
    });

    const responseText = await response.text();
    console.log('=== MX Merchant GET Notifications Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Body:', responseText);
    console.log('===============================================');

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

    // Process the response data to make it more readable
    let processedData = responseData;
    let notificationCount = 0;
    let formattedMessage = 'Retrieved notification subscriptions successfully';

    // Handle the MX Merchant API response structure which has { records: [...], recordCount: X }
    if (responseData && responseData.records && Array.isArray(responseData.records)) {
      const records = responseData.records;
      notificationCount = responseData.recordCount || records.length;
      formattedMessage = `Found ${notificationCount} notification subscription${notificationCount === 1 ? '' : 's'}`;
      
      // Format each record for better display
      processedData = records.map((subscription: Record<string, unknown>, index: number) => ({
        id: subscription.id || `subscription_${index + 1}`,
        url: subscription.callbackUrl || subscription.url || subscription.webhookUrl || 'N/A',
        eventType: subscription.eventType || 'Unknown',
        eventDescription: subscription.eventDescription || 'Unknown',
        status: subscription.sendWebhook ? 'Active (Webhook)' : 
               (subscription.sendEmail ? 'Active (Email)' : 'Inactive'),
        created: subscription.created || subscription.createdDate || 'Unknown',
        modified: subscription.modified || 'Never',
        merchantId: subscription.merchantId || merchantId,
        emailAddress: subscription.emailAddress || 'N/A',
        phoneNumber: subscription.phoneNumber || 'N/A',
        sources: subscription.Sources || 'All',
        sendWebhook: subscription.sendWebhook,
        sendEmail: subscription.sendEmail,
        sendSMS: subscription.sendSMS,
        raw: subscription
      }));
    } else if (Array.isArray(responseData)) {
      notificationCount = responseData.length;
      formattedMessage = `Found ${notificationCount} notification subscription${notificationCount === 1 ? '' : 's'}`;
      
      processedData = responseData.map((subscription, index) => ({
        id: subscription.id || `subscription_${index + 1}`,
        url: subscription.callbackUrl || subscription.url || subscription.webhookUrl || 'N/A',
        eventType: subscription.eventType || 'Unknown',
        status: subscription.sendWebhook ? 'Active' : 'Inactive',
        created: subscription.created || subscription.createdDate || 'Unknown',
        merchantId: subscription.merchantId || merchantId,
        raw: subscription
      }));
    } else if (!responseData || (responseData.records && responseData.records.length === 0)) {
      formattedMessage = 'No notification subscriptions found';
      notificationCount = 0;
    }

    return NextResponse.json({
      success: true,
      message: formattedMessage,
      count: notificationCount,
      data: processedData,
      metadata: {
        environment: environment,
        merchantId: merchantId,
        apiUrl: apiUrl,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error listing notification subscriptions:', error);
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