'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
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
import { DataSentButtons } from './data-sent-buttons';
import { Invoice, DataSentUpdate } from '@/types/invoice';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  getStatusColor
} from '@/lib/utils';

interface InvoiceTableProps {
  invoices: Invoice[];
  onUpdateDataSent: (update: DataSentUpdate) => void;
  onViewInvoice: (invoiceId: string) => void;
  loading?: boolean;
}

export function InvoiceTable({ 
  invoices, 
  onUpdateDataSent, 
  onViewInvoice,
  loading = false 
}: InvoiceTableProps) {
  const [updatingInvoices, setUpdatingInvoices] = useState<Set<string>>(new Set());

  const handleUpdateDataSent = async (update: DataSentUpdate) => {
    if (!update.invoice_id) return; // Only handle invoice updates in this component
    
    setUpdatingInvoices(prev => new Set(prev).add(update.invoice_id!));
    try {
      await onUpdateDataSent(update);
    } catch (error) {
      console.error('Failed to update data sent status:', error);
    } finally {
      setUpdatingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(update.invoice_id!);
        return newSet;
      });
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    onViewInvoice(invoiceId);
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No invoices found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="h-6">
            <TableHead className="w-[100px] h-6 py-1 text-xs">ID</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Invoice #</TableHead>
            <TableHead className="h-6 py-1 text-xs">Customer</TableHead>
            <TableHead className="w-[100px] h-6 py-1 text-xs">Status</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs text-right">Amount</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Date</TableHead>
            <TableHead className="w-[100px] h-6 py-1 text-xs">Ordered by Provider</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Date/Time Ordered</TableHead>
            <TableHead className="w-[60px] h-6 py-1 text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="h-7">
              <TableCell className="font-mono text-xs py-1">
                {invoice.mx_invoice_id}
              </TableCell>
              <TableCell className="font-semibold py-1 text-xs">
                {invoice.invoice_number}
              </TableCell>
              <TableCell className="py-1">
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{invoice.customer_name}</span>
                  {invoice.customer_number && (
                    <span className="text-xs text-muted-foreground">
                      {invoice.customer_number}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1 py-0 ${getStatusColor(invoice.status || '')}`}
                >
                  {invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium py-1 text-xs">
                {formatCurrency(invoice.total_amount || 0, invoice.currency || 'USD')}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground py-1">
                {invoice.invoice_date ? formatDate(invoice.invoice_date) : 'N/A'}
              </TableCell>
              <TableCell className="py-1">
                <DataSentButtons
                  invoiceId={invoice.id}
                  currentStatus={invoice.data_sent_status as 'pending' | 'yes' | 'no'}
                  onUpdateStatus={handleUpdateDataSent}
                  disabled={updatingInvoices.has(invoice.id)}
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground py-1">
                {invoice.ordered_by_provider_at ? formatDateTime(invoice.ordered_by_provider_at) : 'N/A'}
              </TableCell>
              <TableCell className="py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewInvoice(invoice.id)}
                  className="h-5 w-5 p-0"
                >
                  <Eye className="h-3 w-3" />
                  <span className="sr-only">View invoice</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}