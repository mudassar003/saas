import { MXMerchantClient } from '@/lib/mx-merchant-client'
import type { MXPayment } from '@/types/invoice'

export default async function DebugTransactionsListPage() {
  let apiResponse = null
  let error = null

  try {
    // Get MX Merchant config from environment variables (same as setup page)
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET
    const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'production'

    if (!consumerKey || !consumerSecret) {
      error = 'Missing MX Merchant credentials in environment variables'
      return
    }

    const mxClient = new MXMerchantClient(
      consumerKey, 
      consumerSecret, 
      environment as 'sandbox' | 'production'
    )
    
    // Use the same approach as manual sync - getPayments with limit and offset
    apiResponse = await mxClient.getPayments({ 
      limit: 10,
      offset: 0
    })
  } catch (err) {
    error = err
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        Debug: Transaction List API Response
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">API Endpoint:</h2>
        <code className="bg-gray-100 p-2 rounded block mb-6">
          GET /checkout/v3/payment?limit=10&offset=0
        </code>

        {error ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <h3 className="text-red-800 font-semibold">Error:</h3>
            <pre className="text-red-700 text-sm mt-2 whitespace-pre-wrap">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <h3 className="text-green-800 font-semibold mb-4">
              Full API Response (Recent 10 Transactions):
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
            
            {apiResponse?.records && apiResponse.records.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="text-blue-800 font-semibold mb-2">Sample Transaction IDs for Testing:</h4>
                <ul className="text-blue-700 text-sm">
                  {apiResponse.records.slice(0, 5).map((record: MXPayment, index: number) => (
                    <li key={index} className="mb-1">
                      <code className="bg-blue-100 px-2 py-1 rounded">
                        Transaction ID: {record.id}
                      </code>
                      <span className="ml-2 text-gray-600">
                        - {record.customerName || 'Unknown'} - ${record.amount || '0.00'}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-blue-600 text-sm mt-2">
                  Copy any Transaction ID above to test individual transaction endpoint at: 
                  <code className="bg-blue-100 px-1 rounded">/debug/transaction/[id]</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
