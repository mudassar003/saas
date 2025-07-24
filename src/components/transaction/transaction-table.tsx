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
  invoice?: {
    id: string;
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
  onViewInvoice?: (invoiceId: string) => void;
  loading?: boolean;
}

export function TransactionTable({ 
  transactions, 
  onViewInvoice,
  loading = false 
}: TransactionTableProps) {

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

  const getTransactionTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'sale':
        return 'bg-green-100 text-green-700';
      case 'return':
      case 'refund':
        return 'bg-red-100 text-red-700';
      case 'auth':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Source</TableHead>
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
                <div className="space-y-1">
                  <div className="text-sm">
                    {formatDate(transaction.transaction_date)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(transaction.transaction_date).split(' ')[1]}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">
                    {transaction.customer_name || transaction.invoice?.customer_name || 'N/A'}
                  </div>
                  {transaction.reference_number && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Ref: {transaction.reference_number}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="font-medium">
                  {formatCurrency(transaction.amount)}
                </div>
                {transaction.invoice && (
                  <div className="text-xs text-muted-foreground">
                    Invoice: {formatCurrency(transaction.invoice.total_amount)}
                  </div>
                )}
              </TableCell>
              
              <TableCell>
                <Badge className={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
              </TableCell>
              
              <TableCell>
                {transaction.transaction_type && (
                  <Badge variant="outline" className={getTransactionTypeColor(transaction.transaction_type)}>
                    {transaction.transaction_type}
                  </Badge>
                )}
              </TableCell>
              
              <TableCell>
                {transaction.invoice ? (
                  <div className="space-y-1">
                    <div className="font-medium text-blue-600">
                      #{transaction.invoice.invoice_number}
                    </div>
                    {transaction.invoice.data_sent_status && (
                      <Badge 
                        variant="outline" 
                        className={
                          transaction.invoice.data_sent_status === 'yes' 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-orange-50 text-orange-700'
                        }
                      >
                        {transaction.invoice.data_sent_status === 'yes' ? 'Sent' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">
                    Standalone
                  </Badge>
                )}
              </TableCell>
              
              <TableCell>
                <div className="space-y-1">
                  {transaction.card_type && (
                    <div className="text-sm">
                      {transaction.card_type} ****{transaction.card_last4}
                    </div>
                  )}
                  {transaction.auth_code && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Auth: {transaction.auth_code}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {transaction.source || 'N/A'}
                </Badge>
              </TableCell>
              
              <TableCell>
                <div className="flex space-x-2">
                  {transaction.invoice && onViewInvoice && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewInvoice(transaction.invoice!.id)}
                      className="h-8 w-8 p-0"
                      title="View Invoice Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTransaction(transaction.id)}
                    className="h-8 w-8 p-0"
                    title="View Transaction Details"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}