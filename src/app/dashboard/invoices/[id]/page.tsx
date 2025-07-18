import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, CreditCard, MapPin, Phone, Globe, Printer } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataSentButtons } from '@/components/invoice/data-sent-buttons'
import { getInvoiceById, getInvoiceItems } from '@/lib/dal'
import { getMXInvoiceDetail } from '@/lib/mx-merchant-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceItem } from '@/types/invoice'

interface InvoiceDetailPageProps {
  params: {
    id: string
  }
}

async function getInvoiceData(invoiceId: number): Promise<{
  invoice: Invoice
  items: InvoiceItem[]
  apiData?: any
}> {
  // Step 1: Get invoice from database
  const invoice = await getInvoiceById(invoiceId)
  if (!invoice) {
    notFound()
  }

  // Step 2: Get items from database
  let items = await getInvoiceItems(invoice.id)

  // Step 3: If no items, fetch from MX Merchant API
  let apiData = null
  if (items.length === 0) {
    try {
      apiData = await getMXInvoiceDetail(invoiceId)
      // TODO: Cache the items in database for future use
    } catch (error) {
      console.error('Failed to fetch invoice details from API:', error)
    }
  }

  return { invoice, items, apiData }
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const invoiceId = parseInt(params.id)
  if (isNaN(invoiceId)) {
    notFound()
  }

  const { invoice, items, apiData } = await getInvoiceData(invoiceId)

  // Use API data if database items are empty
  const displayItems = items.length > 0 ? items : (apiData?.purchases || [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              month: 'numeric', 
              day: 'numeric', 
              year: '2-digit',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true 
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Purchase Receipt [{invoice.receipt_number}]</span>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Main Receipt Card */}
      <Card className="max-w-4xl mx-auto bg-white shadow-lg">
        <CardContent className="p-8">
          {/* Invoice Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">Invoice #{invoice.invoice_number}</div>
              
              {/* GameDay Men's Health Logo Area */}
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800">
                    <span className="text-red-600">GAMEDAY</span>
                  </div>
                  <div className="text-sm text-gray-600 font-medium">MEN'S HEALTH</div>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="text-right text-sm text-gray-600">
              <div className="flex items-center gap-1 justify-end mb-1">
                <MapPin className="h-4 w-4" />
                <span>GAMEDAY MEN'S HEALTH - RESTON</span>
              </div>
              <div>12005 Sunrise Valley Drive</div>
              <div>Reston, VA 20191</div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Phone className="h-4 w-4" />
                <span>(571) 250-8972</span>
              </div>
            </div>
          </div>

          {/* Website */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <Globe className="h-4 w-4" />
              <span>https://gamedaymenshealth.com/reston/</span>
            </div>
          </div>

          {/* Customer Section */}
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {invoice.customer_name?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{invoice.customer_name}</div>
                  <div className="text-sm text-gray-600">Bill to:</div>
                  <div className="text-sm">{invoice.customer_name}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Access Code</div>
                  <div className="font-mono text-sm bg-white px-2 py-1 rounded border">
                    *{invoice.receipt_number}*
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div><span className="text-gray-600">Invoice Date:</span> {formatDate(invoice.invoice_date)}</div>
                    <div><span className="text-gray-600">Due Date:</span> {formatDate(invoice.due_date)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-6">
            <div className="bg-gray-200 p-3 rounded-t-lg">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
                  <span className="text-white text-xs">≡</span>
                </div>
                ITEMS
              </h3>
            </div>
            
            <div className="border border-gray-200 rounded-b-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-sm">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Quantity</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Discount</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Item Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item: any, index: number) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-sm">
                        {item.product_name || item.productName || `Item ${index + 1}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.product_name || item.productName || 'Healthcare Product'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.quantity || 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(item.unit_price || item.price || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        ({formatCurrency(item.discount_amount || item.discountAmount || 0)})
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(item.total_amount || item.totalAmount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="bg-gray-50 px-4 py-3 border-t">
                <div className="flex justify-end">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(invoice.subtotal_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Admin Fee:</span>
                      <span>{formatCurrency(invoice.tax_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(invoice.paid_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Balance (USD):</span>
                      <span>{formatCurrency(invoice.balance || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Section */}
          <div className="mb-6">
            <div className="bg-gray-200 p-3 rounded-t-lg">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                PAYMENTS
              </h3>
            </div>
            
            <div className="border border-gray-200 rounded-b-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-sm">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tender</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Authorization Code</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-3 text-sm">Sale</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                          VISA
                        </div>
                        <span className="text-xs text-gray-600">••••••••{invoice.receipt_number?.slice(-4) || '0000'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge 
                        variant={invoice.status === 'Paid' ? 'default' : 'secondary'}
                        className={invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {invoice.status === 'Paid' ? 'Approved' : invoice.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {invoice.receipt_number?.slice(0, 6) || '000000'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(invoice.paid_amount || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Nurse Workflow Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Nurse Workflow - Patient Data Status</h3>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Has patient data been sent for this invoice?
              </div>
              <DataSentButtons 
                invoiceId={invoice.mx_invoice_id}
                currentStatus={invoice.data_sent_status}
                className="ml-4"
              />
            </div>
            {invoice.data_sent_at && (
              <div className="mt-2 text-xs text-gray-500">
                Last updated: {formatDate(invoice.data_sent_at)} 
                {invoice.data_sent_by && ` by User ${invoice.data_sent_by}`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="mt-6 flex justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Button variant="outline" size="sm">←</Button>
          <span>Page 1 / 1</span>
          <Button variant="outline" size="sm">→</Button>
        </div>
      </div>
    </div>
  )
}