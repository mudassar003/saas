import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    await requireSuperAdmin();

    // Create Supabase client
    const supabase = createServerClient();

    // Parse request body
    const body = await request.json();
    const { merchantId, eventType } = body;

    if (!merchantId || !eventType) {
      return NextResponse.json(
        { success: false, error: 'merchantId and eventType are required' },
        { status: 400 }
      );
    }

    // Get tenant credentials from database
    const { data: tenant, error: tenantError } = await supabase
      .from('mx_merchant_configs')
      .select('consumer_key, consumer_secret, environment')
      .eq('merchant_id', merchantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Prepare MX Merchant API request (use correct environment)
    const baseUrl = tenant.environment === 'sandbox'
      ? 'https://sandbox.api.mxmerchant.com'
      : 'https://api.mxmerchant.com';
    const mxMerchantUrl = `${baseUrl}/checkout/v3/subscription`;

    const webhookPayload = {
      sendEmail: false,
      sendSMS: false,
      sendWebhook: true,
      eventType: eventType,
      merchantId: parseInt(merchantId.toString()),
      emailAddress: "",
      phoneNumber: "",
      callbackUrl: "https://saas-auto.vercel.app/api/webhook",
      threshold: 0,
      sources: "QuickPay, Invoice, Recurring, Order, MXExpress, MXRetail, API",
      inviteUsers: ""
    };

    // Create basic auth header
    const credentials = Buffer.from(
      `${tenant.consumer_key}:${tenant.consumer_secret}`
    ).toString('base64');

    // Call MX Merchant API (must use PUT method)
    const mxResponse = await fetch(mxMerchantUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(webhookPayload),
    });

    const mxResult = await mxResponse.json();

    if (!mxResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: mxResult.message || mxResponse.statusText,
          errorCode: mxResult.errorCode,
          details: mxResult.details,
          responseCode: mxResult.responseCode,
        },
        { status: mxResponse.status }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: `Webhook subscription created successfully for ${eventType}`,
      mxMerchantResponse: mxResult,
      webhook: {
        eventType,
        merchantId,
        callbackUrl: webhookPayload.callbackUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
