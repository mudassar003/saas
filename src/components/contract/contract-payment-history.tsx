'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { MXPayment } from '@/types/invoice';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

interface ContractPaymentHistoryProps {
  contractId: number;
}

interface PaymentHistoryResponse {
  success: boolean;
  data: {
    payments: MXPayment[];
    recordCount: number;
    statistics: {
      total: number;
      settled: number;
      approved: number;
      declined: number;
      totalAmount: number;
    };
  };
}

export function ContractPaymentHistory({ contractId }: ContractPaymentHistoryProps) {
  const [payments, setPayments] = useState<MXPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total: 0,
    settled: 0,
    approved: 0,
    declined: 0,
    totalAmount: 0
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/payments`);

      if (!response.ok) {
        throw new Error('Failed to load payment history');
      }

      const result: PaymentHistoryResponse = await response.json();

      if (result.success) {
        setPayments(result.data.payments);
        setStatistics(result.data.statistics);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [contractId]);

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'settled' || statusLower === 'approved') {
      return (
        <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    } else if (statusLower === 'declined') {
      return (
        <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-900/20">
          <XCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-600 dark:text-gray-400 border-gray-600 dark:border-gray-500 bg-gray-50 dark:bg-gray-800">
        <Clock className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Payment History</h2>
            <p className="text-sm text-muted-foreground">
              {statistics.total} total payments
            </p>
          </div>
          <Button
            onClick={loadPayments}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(statistics.totalAmount, 'USD')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
          <div>
            <p className="text-xs text-muted-foreground">Settled</p>
            <p className="text-2xl font-bold text-green-600">{statistics.settled}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
          <div>
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-blue-600">{statistics.approved}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
          <div>
            <p className="text-xs text-muted-foreground">Declined</p>
            <p className="text-2xl font-bold text-red-600">{statistics.declined}</p>
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No payment history found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Invoice</TableHead>
                <TableHead className="text-xs">Card</TableHead>
                <TableHead className="text-xs">Auth Code</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-xs">
                    {payment.created ? formatDateTime(payment.created) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">
                    {formatCurrency(parseFloat(payment.amount || '0'), payment.currency || 'USD')}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getStatusBadge(payment.status || 'Unknown')}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {payment.invoice || 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {payment.cardAccount ? (
                      <span className="font-mono">
                        {payment.cardAccount.cardType} ****{payment.cardAccount.last4}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {payment.authCode || 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {payment.reference || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
