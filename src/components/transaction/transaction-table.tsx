'use client';

import { useState } from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  product_name?: string;
  product_category?: string;
  membership_status?: string;
  fulfillment_type?: string;
  google_review_submitted?: boolean;
  referral_source?: string;
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
  const [updatingMembership, setUpdatingMembership] = useState<Set<string>>(new Set());
  const [updatingCategory, setUpdatingCategory] = useState<Set<string>>(new Set());
  const [updatingFulfillment, setUpdatingFulfillment] = useState<Set<string>>(new Set());

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

  const handleMembershipUpdate = async (transactionId: string, newStatus: string) => {
    setUpdatingMembership(prev => new Set(prev).add(transactionId));
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_status: newStatus })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating membership status:', error);
    } finally {
      setUpdatingMembership(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleCategoryUpdate = async (transactionId: string, newCategory: string) => {
    setUpdatingCategory(prev => new Set(prev).add(transactionId));
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_category: newCategory })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating product category:', error);
    } finally {
      setUpdatingCategory(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleFulfillmentUpdate = async (transactionId: string, newFulfillment: string) => {
    setUpdatingFulfillment(prev => new Set(prev).add(transactionId));
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillment_type: newFulfillment })
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating fulfillment type:', error);
    } finally {
      setUpdatingFulfillment(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'settled':
        return 'bg-info/10 text-info border-info/20';
      case 'declined':
        return 'bg-error/10 text-error border-error/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TRT':
        return 'bg-info/10 text-info border-info/20';
      case 'Weight Loss':
        return 'bg-success/10 text-success border-success/20';
      case 'Peptides':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'ED':
        return 'bg-error/10 text-error border-error/20';
      case 'Other':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'canceled':
        return 'bg-error/10 text-error border-error/20';
      case 'paused':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getFulfillmentColor = (fulfillment: string) => {
    switch (fulfillment?.toLowerCase()) {
      case 'in_office':
        return 'bg-info/10 text-info border-info/20';
      case 'mail_out':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Modern scrollable container */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[1800px]">
          {/* Modern Header - Sticky with gradient */}
          <div className="flex bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
            <div className="flex-none w-[160px] px-4 py-3 text-xs font-semibold text-foreground">
              Transaction ID
            </div>
            <div className="flex-none w-[180px] px-4 py-3 text-xs font-semibold text-foreground">
              Patient Name
            </div>
            <div className="flex-none w-[180px] px-4 py-3 text-xs font-semibold text-foreground">
              Product/Service
            </div>
            <div className="flex-none w-[130px] px-4 py-3 text-xs font-semibold text-foreground">
              Category
            </div>
            <div className="flex-none w-[100px] px-4 py-3 text-xs font-semibold text-foreground text-right">
              Amount
            </div>
            <div className="flex-none w-[100px] px-4 py-3 text-xs font-semibold text-foreground">
              Status
            </div>
            <div className="flex-none w-[110px] px-4 py-3 text-xs font-semibold text-foreground">
              Membership
            </div>
            <div className="flex-none w-[110px] px-4 py-3 text-xs font-semibold text-foreground">
              Fulfillment
            </div>
            <div className="flex-none w-[100px] px-4 py-3 text-xs font-semibold text-foreground">
              Source
            </div>
            <div className="flex-none w-[100px] px-4 py-3 text-xs font-semibold text-foreground">
              Date
            </div>
            <div className="flex-none w-[100px] px-4 py-3 text-xs font-semibold text-foreground">
              Provider
            </div>
            <div className="flex-none w-[160px] px-4 py-3 text-xs font-semibold text-foreground">
              Date/Time Ordered
            </div>
            <div className="flex-none w-[90px] px-4 py-3 text-xs font-semibold text-foreground text-center">
              Invoice
            </div>
            <div className="flex-none w-[90px] px-4 py-3 text-xs font-semibold text-foreground text-center">
              Actions
            </div>
          </div>

          {/* Modern Data Rows */}
          <div>
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex min-h-16 border-b border-border hover:bg-accent/5 transition-colors group"
              >
                {/* Transaction ID */}
                <div className="flex-none w-[160px] px-4 py-3 flex items-center">
                  <span className="text-sm font-mono text-muted-foreground">
                    {transaction.mx_payment_id}
                  </span>
                </div>

                {/* Patient Name */}
                <div className="flex-none w-[180px] px-4 py-3 flex items-center">
                  <span className="text-sm font-medium text-foreground truncate">
                    {transaction.customer_name || transaction.invoice?.customer_name || 'N/A'}
                  </span>
                </div>

                {/* Product */}
                <div className="flex-none w-[180px] px-4 py-3 flex items-center">
                  <span className="text-sm text-foreground truncate" title={transaction.product_name || 'N/A'}>
                    {transaction.product_name || 'N/A'}
                  </span>
                </div>

                {/* Category */}
                <div className="flex-none w-[130px] px-4 py-3 flex items-center">
                  {transaction.product_category ? (
                    <select
                      value={transaction.product_category}
                      onChange={(e) => handleCategoryUpdate(transaction.id, e.target.value)}
                      disabled={updatingCategory.has(transaction.id)}
                      className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getCategoryColor(transaction.product_category)}`}
                    >
                      <option value="TRT">TRT</option>
                      <option value="Weight Loss">Weight Loss</option>
                      <option value="Peptides">Peptides</option>
                      <option value="ED">ED</option>
                      <option value="Other">Other</option>
                      <option value="Uncategorized">Uncategorized</option>
                    </select>
                  ) : (
                    <select
                      value="Uncategorized"
                      onChange={(e) => handleCategoryUpdate(transaction.id, e.target.value)}
                      disabled={updatingCategory.has(transaction.id)}
                      className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getCategoryColor('Uncategorized')}`}
                    >
                      <option value="TRT">TRT</option>
                      <option value="Weight Loss">Weight Loss</option>
                      <option value="Peptides">Peptides</option>
                      <option value="ED">ED</option>
                      <option value="Other">Other</option>
                      <option value="Uncategorized">Uncategorized</option>
                    </select>
                  )}
                </div>

                {/* Amount */}
                <div className="flex-none w-[100px] px-4 py-3 flex items-center justify-end">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>

                {/* Status */}
                <div className="flex-none w-[100px] px-4 py-3 flex items-center">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>

                {/* Membership Status */}
                <div className="flex-none w-[110px] px-4 py-3 flex items-center">
                  {transaction.membership_status ? (
                    <select
                      value={transaction.membership_status}
                      onChange={(e) => handleMembershipUpdate(transaction.id, e.target.value)}
                      disabled={updatingMembership.has(transaction.id)}
                      className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getMembershipStatusColor(transaction.membership_status)}`}
                    >
                      <option value="active">Active</option>
                      <option value="canceled">Canceled</option>
                      <option value="paused">Paused</option>
                    </select>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Fulfillment */}
                <div className="flex-none w-[110px] px-4 py-3 flex items-center">
                  <select
                    value={transaction.fulfillment_type || 'in_office'}
                    onChange={(e) => handleFulfillmentUpdate(transaction.id, e.target.value)}
                    disabled={updatingFulfillment.has(transaction.id)}
                    className={`w-full text-xs font-medium border rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50 transition-colors dark:bg-background ${getFulfillmentColor(transaction.fulfillment_type || 'in_office')}`}
                  >
                    <option value="in_office">In Office</option>
                    <option value="mail_out">Mail Out</option>
                  </select>
                </div>

                {/* Source */}
                <div className="flex-none w-[100px] px-4 py-3 flex items-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {transaction.source || 'N/A'}
                  </span>
                </div>

                {/* Date */}
                <div className="flex-none w-[100px] px-4 py-3 flex items-center">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(transaction.transaction_date)}
                  </span>
                </div>

                {/* Provider Status */}
                <div className="flex-none w-[100px] px-4 py-3 flex items-center">
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
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Date/Time Ordered */}
                <div className="flex-none w-[160px] px-4 py-3 flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {transaction.invoice?.ordered_by_provider_at
                      ? formatDateTime(transaction.invoice.ordered_by_provider_at)
                      : transaction.ordered_by_provider_at
                      ? formatDateTime(transaction.ordered_by_provider_at)
                      : 'N/A'
                    }
                  </span>
                </div>

                {/* View Invoice */}
                <div className="flex-none w-[90px] px-4 py-3 flex items-center justify-center">
                  {transaction.invoice?.mx_invoice_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `/dashboard/invoices/${transaction.invoice!.mx_invoice_id}`}
                      className="h-8 w-8 p-0 hover:bg-accent"
                      title="View Invoice Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-none w-[90px] px-4 py-3 flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTransaction(transaction.id)}
                    className="h-8 w-8 p-0 hover:bg-accent"
                    title="View Transaction Details"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
