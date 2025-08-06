import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get credentials from environment variables
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET
    const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'production'
    const merchantId = '1000095245' // Hardcoded merchant ID

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ 
        error: 'Missing MX Merchant credentials in environment variables' 
      }, { status: 400 })
    }

    // Create auth header
    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    
    // Determine API base URL based on environment
    const baseUrl = environment === 'sandbox' 
      ? 'https://sandbox.api.mxmerchant.com' 
      : 'https://api.mxmerchant.com'

    // Fetch subscriptions with query parameters (GET requests can't have body)
    const queryParams = new URLSearchParams({
      echo: 'true',
      merchantId: merchantId,
      limit: '50',
      offset: '0'
    })

    const response = await fetch(`${baseUrl}/checkout/v3/subscription?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `API request failed: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Raw MX Merchant subscriptions response',
      endpoint: `GET ${baseUrl}/checkout/v3/subscription?${queryParams}`,
      parameters: {
        echo: true,
        merchantId: merchantId,
        limit: 50,
        offset: 0
      },
      data: data
    })

  } catch (error) {
    console.error('Debug subscriptions API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}