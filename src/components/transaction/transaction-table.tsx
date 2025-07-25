'use client';

import { useState } from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataSentButtons } from '@/components/invoice/data-sent-buttons';
import { DataSentUpdate } from '@/types/invoice';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime
} from '@/lib/utils';

interface Transaction {
  id: string;
  mx_payment_id: number;
  amount: number;
  transaction_date: string;
  status: string;
  mx_invoice_number?: number;
  customer_name?: string;
  auth_code?: string;
  reference_number?: string;
  card_type?: string;
  card_last4?: string;
  transaction_type?: string;
  source?: string;
  created_at: string;
  ordered_by_provider?: boolean;
  ordered_by_provider_at?: string;
  invoice?: {
    id: string;
    mx_invoice_id: number;
    invoice_number: number;
    customer_name?: string;
    total_amount: number;
    invoice_date?: string;
    data_sent_status?: string;
    ordered_by_provider_at?: string;
  } | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdateDataSent?: (update: DataSentUpdate) => void;
  loading?: boolean;
}

export function TransactionTable({ 
  transactions, 
  onUpdateDataSent,
  loading = false 
}: TransactionTableProps) {
  const [updatingRecords, setUpdatingRecords] = useState<Set<string>>(new Set());

  const handleUpdateDataSent = async (update: DataSentUpdate) => {
    if (!onUpdateDataSent) return;
    
    const recordId = update.invoice_id || update.transaction_id || '';
    setUpdatingRecords(prev => new Set(prev).add(recordId));
    try {
      await onUpdateDataSent(update);
    } catch (error) {
      console.error('Failed to update data sent status:', error);
    } finally {
      setUpdatingRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handleViewTransaction = (transactionId: string) => {
    window.location.href = `/transactions/${transactionId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'settled':
        return 'bg-blue-100 text-blue-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Ordered by Provider</TableHead>
            <TableHead>Date/Time Ordered</TableHead>
            <TableHead>View Invoice</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono text-sm">
                {transaction.mx_payment_id}
              </TableCell>
              
              <TableCell>
                <div className="font-medium">
                  {transaction.customer_name || transaction.invoice?.customer_name || 'N/A'}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="font-medium">
                  {formatCurrency(transaction.amount)}
                </div>
              </TableCell>
              
              <TableCell>
                <Badge className={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
              </TableCell>
              
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {transaction.source || 'N/A'}
                </Badge>
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  {formatDate(transaction.transaction_date)}
                </div>
              </TableCell>
              
              <TableCell>
                {onUpdateDataSent ? (
                  transaction.invoice ? (
                    <DataSentButtons
                      invoiceId={transaction.invoice.id}
                      currentStatus={transaction.invoice.data_sent_status as 'pending' | 'yes' | 'no'}
                      onUpdateStatus={handleUpdateDataSent}
                      disabled={updatingRecords.has(transaction.invoice.id)}
                    />
                  ) : (
                    <DataSentButtons
                      transactionId={transaction.id}
                      currentStatus={transaction.ordered_by_provider ? 'yes' : 'pending'}
                      onUpdateStatus={handleUpdateDataSent}
                      disabled={updatingRecords.has(transaction.id)}
                    />
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
              
              <TableCell>
                <div className="text-xs text-muted-foreground">
                  {transaction.invoice?.ordered_by_provider_at 
                    ? formatDateTime(transaction.invoice.ordered_by_provider_at)
                    : transaction.ordered_by_provider_at 
                    ? formatDateTime(transaction.ordered_by_provider_at)
                    : 'N/A'
                  }
                </div>
              </TableCell>
              
              <TableCell>
                {transaction.invoice?.mx_invoice_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/invoices/${transaction.invoice!.mx_invoice_id}`}
                    className="h-8 w-8 p-0"
                    title="View Invoice Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
              
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewTransaction(transaction.id)}
                  className="h-8 w-8 p-0"
                  title="View Transaction Details"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}