import { MXMerchantClient } from '@/lib/mx-merchant-client'
import { notFound } from 'next/navigation'

interface DebugTransactionPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DebugTransactionPage({ params }: DebugTransactionPageProps) {
  const { id } = await params
  const transactionId = parseInt(id)
  
  if (isNaN(transactionId)) {
    notFound()
  }

  let apiResponse = null
  let error = null

  try {
    // Get MX Merchant config from environment variables (same as setup page)
    const consumerKey = process.env.MX_MERCHANT_CONSUMER_KEY
    const consumerSecret = process.env.MX_MERCHANT_CONSUMER_SECRET
    const environment = process.env.MX_MERCHANT_ENVIRONMENT || 'production'

    if (!consumerKey || !consumerSecret) {
      error = 'Missing MX Merchant credentials in environment variables'
    } else {
      const mxClient = new MXMerchantClient(
        consumerKey, 
        consumerSecret, 
        environment as 'sandbox' | 'production'
      )
      
      // Fetch individual transaction details
      apiResponse = await mxClient.getPaymentDetail(transactionId)
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error occurred'
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        Debug: Transaction {transactionId} API Response
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">API Endpoint:</h2>
        <code className="bg-gray-100 p-2 rounded block mb-6">
          GET /checkout/v3/payment/{transactionId}
        </code>

        {error ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <h3 className="text-red-800 font-semibold">Error:</h3>
            <pre className="text-red-700 text-sm mt-2 whitespace-pre-wrap">
              {JSON.stringify(error, null, 2)}
            </pre>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> If you see &quot;getPaymentDetail is not a function&quot; error, 
                it means this method needs to be implemented in your MXMerchantClient class.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <h3 className="text-green-800 font-semibold mb-4">Full API Response:</h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="text-blue-800 font-semibold mb-2">Available Transaction IDs:</h4>
          <p className="text-blue-700 text-sm">
            Visit <code className="bg-blue-100 px-1 rounded">/debug/transactions</code> to see 
            a list of available transaction IDs you can test with.
          </p>
        </div>
      </div>
    </div>
  )
}
