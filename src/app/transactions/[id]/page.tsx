'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
 
  User, 
  DollarSign, 
  Hash, 
  CheckCircle, 
  XCircle,
  Eye,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime 
} from '@/lib/utils';

interface TransactionDetail {
  id: string;
  mx_payment_id: number;
  amount: number;
  transaction_date: string;
  status: string;
  mx_invoice_number?: number;
  client_reference?: string;
  customer_name?: string;
  customer_code?: string;
  auth_code?: string;
  auth_message?: string;
  response_code?: number;
  reference_number?: string;
  card_type?: string;
  card_last4?: string;
  card_token?: string;
  currency?: string;
  tax_amount?: number;
  surcharge_amount?: number;
  surcharge_label?: string;
  refunded_amount?: number;
  settled_amount?: number;
  tender_type?: string;
  transaction_type?: string;
  source?: string;
  batch?: string;
  merchant_id?: number;
  created_at: string;
  updated_at: string;
  raw_data?: Record<string, unknown>;
  invoices?: Array<{
    id: string;
    invoice_number: number;
    customer_name?: string;
    total_amount: number;
    invoice_date?: string;
    data_sent_status?: string;
    ordered_by_provider_at?: string;
    created_at: string;
  }>;
}

export default function TransactionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactionDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/transactions/${transactionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTransaction(result.data);
      } else {
        setError(result.error || 'Failed to load transaction');
      }
    } catch (err) {
      setError('Error loading transaction details');
      console.error('Error fetching transaction details:', err);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails();
    }
  }, [transactionId, fetchTransactionDetails]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'settled':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Hash className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'settled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    // Navigate to invoice detail page
    window.location.href = `/dashboard/invoices/${invoiceId}`;
  };

  const handleBack = () => {
    router.push('/transactions');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center min-h-[400px] flex flex-col items-center justify-center">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Transaction Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <CreditCard className="h-6 w-6" />
              Transaction #{transaction.mx_payment_id}
            </h1>
            <p className="text-muted-foreground">
              Complete transaction details and associated invoices
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(transaction.status)} variant="outline">
          {getStatusIcon(transaction.status)}
          <span className="ml-2">{transaction.status}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Transaction Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Transaction Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Transaction Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                <p className="font-mono text-xl font-bold">{transaction.mx_payment_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(transaction.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                <p className="font-medium">{formatDateTime(transaction.transaction_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <Badge variant="outline">{transaction.transaction_type || 'N/A'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Source</label>
                <Badge variant="outline">{transaction.source || 'N/A'}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reference</label>
                <p className="font-mono">{transaction.reference_number || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                <p className="font-medium text-lg">{transaction.customer_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Customer Code</label>
                <p className="font-mono">{transaction.customer_code || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Card Type</label>
                <p className="font-medium">{transaction.card_type || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Card Number</label>
                <p className="font-mono text-lg">****{transaction.card_last4 || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Authorization Code</label>
                <p className="font-mono">{transaction.auth_code || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Authorization Message</label>
                <p className="text-sm">{transaction.auth_message || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Associated Invoices */}
          {transaction.invoices && transaction.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Associated Invoices ({transaction.invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transaction.invoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Invoice #</label>
                          <p className="font-mono text-blue-600 font-bold">#{invoice.invoice_number}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Amount</label>
                          <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date</label>
                          <p className="font-medium">
                            {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <Badge 
                            variant="outline" 
                            className={
                              invoice.data_sent_status === 'yes' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }
                          >
                            {invoice.data_sent_status === 'yes' ? 'Data Sent' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleViewInvoice(invoice.id)}
                        variant="outline"
                        size="sm"
                        className="ml-4"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-600">Transaction Amount</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(transaction.amount)}</p>
              </div>
              
              {transaction.tax_amount && transaction.tax_amount > 0 && (
                <div className="text-center p-3 bg-blue-50 rounded-lg border">
                  <p className="text-sm font-medium text-blue-600">Tax</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(transaction.tax_amount)}</p>
                </div>
              )}
              
              {transaction.surcharge_amount && transaction.surcharge_amount > 0 && (
                <div className="text-center p-3 bg-orange-50 rounded-lg border">
                  <p className="text-sm font-medium text-orange-600">{transaction.surcharge_label || 'Surcharge'}</p>
                  <p className="text-lg font-bold text-orange-800">{formatCurrency(transaction.surcharge_amount)}</p>
                </div>
              )}
              
              {transaction.refunded_amount && transaction.refunded_amount > 0 && (
                <div className="text-center p-3 bg-red-50 rounded-lg border">
                  <p className="text-sm font-medium text-red-600">Refunded</p>
                  <p className="text-lg font-bold text-red-800">{formatCurrency(transaction.refunded_amount)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <span className="font-medium text-muted-foreground">Created:</span>
                <p className="font-mono text-xs">{formatDateTime(transaction.created_at)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Updated:</span>
                <p className="font-mono text-xs">{formatDateTime(transaction.updated_at)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Merchant ID:</span>
                <p className="font-mono">{transaction.merchant_id || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Batch:</span>
                <p className="font-mono">{transaction.batch || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}