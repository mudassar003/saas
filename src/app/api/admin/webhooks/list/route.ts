import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireSuperAdmin();

    // Get merchantId from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'merchantId is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createServerClient();

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

    // Prepare MX Merchant API request
    const baseUrl = tenant.environment === 'sandbox'
      ? 'https://sandbox.api.mxmerchant.com'
      : 'https://api.mxmerchant.com';
    const mxMerchantUrl = `${baseUrl}/checkout/v3/subscription`;

    // Create basic auth header
    const credentials = Buffer.from(
      `${tenant.consumer_key}:${tenant.consumer_secret}`
    ).toString('base64');

    // Call MX Merchant API to get subscriptions
    const mxResponse = await fetch(mxMerchantUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    const mxResult = await mxResponse.json();

    if (!mxResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: mxResult.message || mxResponse.statusText,
          errorCode: mxResult.errorCode,
          details: mxResult.details,
        },
        { status: mxResponse.status }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      webhooks: mxResult,
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
