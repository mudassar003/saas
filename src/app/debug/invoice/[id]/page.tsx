import { getMXInvoiceDetail } from '@/lib/mx-merchant-client'
import { notFound } from 'next/navigation'

interface DebugInvoicePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DebugInvoicePage({ params }: DebugInvoicePageProps) {
  const { id } = await params
  const invoiceId = parseInt(id)
  
  if (isNaN(invoiceId)) {
    notFound()
  }

  let apiResponse = null
  let error = null

  try {
    apiResponse = await getMXInvoiceDetail(invoiceId)
  } catch (err) {
    error = err
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        Debug: Invoice {invoiceId} API Response
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">API Endpoint:</h2>
        <code className="bg-gray-100 p-2 rounded block mb-6">
          GET /checkout/v3/invoice/{invoiceId}
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
            <h3 className="text-green-800 font-semibold mb-4">Full API Response:</h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
