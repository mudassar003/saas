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
        return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'settled':
        return 'bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-300';
      case 'declined':
        return 'bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-300';
      case 'pending':
        return 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300';
      default:
        return 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TRT':
        return 'bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-300';
      case 'Weight Loss':
        return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'Peptides':
        return 'bg-violet-50 text-violet-900 dark:bg-violet-900/20 dark:text-violet-300';
      case 'ED':
        return 'bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-300';
      case 'Other':
        return 'bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'canceled':
        return 'bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-300';
      case 'paused':
        return 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300';
      default:
        return 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-300';
    }
  };


  const getFulfillmentColor = (fulfillment: string) => {
    switch (fulfillment?.toLowerCase()) {
      case 'in_office':
        return 'bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-300';
      case 'mail_out':
        return 'bg-violet-50 text-violet-900 dark:bg-violet-900/20 dark:text-violet-300';
      default:
        return 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-300';
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
    <div className="w-full bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-700">
      {/* Google Sheets Style Container - Always visible scrollbars */}
      <div 
        className="h-[75vh] overflow-scroll" 
        style={{ 
          scrollbarGutter: 'stable',
          scrollbarWidth: 'thin'
        }}
      >
        {/* Google Sheets Style Table - Headers and Rows Move Together */}
        <div className="min-w-[1680px]">
          {/* Header Row - Google Sheets Exact Style */}
          <div className="flex bg-[#f8f9fa] dark:bg-slate-800 border-b border-[#dadce0] dark:border-slate-700 sticky top-0 z-10">
            <div className="flex-none w-[120px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Transaction ID
            </div>
            <div className="flex-none w-[140px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Patient Name
            </div>
            <div className="flex-none w-[180px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Product/Service
            </div>
            <div className="flex-none w-[130px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Category
            </div>
            <div className="flex-none w-[80px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Price
            </div>
            <div className="flex-none w-[90px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Status
            </div>
            <div className="flex-none w-[100px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Membership
            </div>
            <div className="flex-none w-[100px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Fulfillment
            </div>
            <div className="flex-none w-[90px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Source
            </div>
            <div className="flex-none w-[90px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Date
            </div>
            <div className="flex-none w-[90px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Provider
            </div>
            <div className="flex-none w-[150px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Date/Time Ordered
            </div>
            <div className="flex-none w-[80px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[21px] flex items-center">
              Invoice
            </div>
            <div className="flex-none w-[80px] px-2 py-1 text-[11px] font-bold text-[#3c4043] dark:text-slate-200 leading-[21px] flex items-center">
              Actions
            </div>
          </div>

          {/* Data Rows - Google Sheets Exact Style */}
          <div>
            {transactions.map((transaction, index) => (
              <div 
                key={transaction.id} 
                className={`
                  flex border-b border-[#dadce0] dark:border-slate-700 h-[21px]
                  hover:bg-[#e8f0fe] dark:hover:bg-slate-800 transition-colors duration-150
                  ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-[#f8f9fa] dark:bg-slate-900/50'}
                `}
              >
                {/* Transaction ID */}
                <div className="flex-none w-[120px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center font-mono">
                  {transaction.mx_payment_id}
                </div>

                {/* Patient Name */}
                <div className="flex-none w-[140px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center truncate">
                  {transaction.customer_name || transaction.invoice?.customer_name || 'N/A'}
                </div>
                
                {/* Product */}
                <div className="flex-none w-[180px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center truncate" title={transaction.product_name || 'N/A'}>
                  {transaction.product_name || 'N/A'}
                </div>
                
                {/* Category */}
                <div className="flex-none w-[130px] px-2 py-1 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  {transaction.product_category ? (
                    <select 
                      value={transaction.product_category}
                      onChange={(e) => handleCategoryUpdate(transaction.id, e.target.value)}
                      disabled={updatingCategory.has(transaction.id)}
                      className={`w-full text-[11px] border-none bg-transparent outline-none px-1 py-0.5 rounded-sm ${getCategoryColor(transaction.product_category)} cursor-pointer disabled:opacity-50`}
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
                      className="w-full text-[11px] border-none bg-transparent outline-none px-1 py-0.5 rounded-sm bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-300 cursor-pointer disabled:opacity-50"
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
                
                {/* Price */}
                <div className="flex-none w-[80px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center text-right">
                  {formatCurrency(transaction.amount)}
                </div>
                
                {/* Status */}
                <div className="flex-none w-[90px] px-2 py-1 text-[11px] border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>

                {/* Membership Status */}
                <div className="flex-none w-[100px] px-2 py-1 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  {transaction.membership_status ? (
                    <select 
                      value={transaction.membership_status}
                      onChange={(e) => handleMembershipUpdate(transaction.id, e.target.value)}
                      disabled={updatingMembership.has(transaction.id)}
                      className={`w-full text-[11px] border-none bg-transparent outline-none px-1 py-0.5 rounded-sm ${getMembershipStatusColor(transaction.membership_status)} cursor-pointer disabled:opacity-50`}
                    >
                      <option value="active">Active</option>
                      <option value="canceled">Canceled</option>
                      <option value="paused">Paused</option>
                    </select>
                  ) : (
                    <span className="text-[11px] text-slate-500">N/A</span>
                  )}
                </div>
                
                {/* Fulfillment */}
                <div className="flex-none w-[100px] px-2 py-1 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  <select 
                    value={transaction.fulfillment_type || 'in_office'}
                    onChange={(e) => handleFulfillmentUpdate(transaction.id, e.target.value)}
                    disabled={updatingFulfillment.has(transaction.id)}
                    className={`w-full text-[11px] border-none bg-transparent outline-none px-1 py-0.5 rounded-sm ${getFulfillmentColor(transaction.fulfillment_type || 'in_office')} cursor-pointer disabled:opacity-50`}
                  >
                    <option value="in_office">In Office</option>
                    <option value="mail_out">Mail Out</option>
                  </select>
                </div>
                

                {/* Source */}
                <div className="flex-none w-[90px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  <span className={`px-1 py-0.5 rounded-sm text-[10px] font-medium bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
                    {transaction.source || 'N/A'}
                  </span>
                </div>
                
                {/* Date */}
                <div className="flex-none w-[90px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  {formatDate(transaction.transaction_date)}
                </div>
                
                {/* Provider Status */}
                <div className="flex-none w-[90px] px-2 py-1 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
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
                    <span className="text-[11px] text-slate-500">N/A</span>
                  )}
                </div>

                {/* Date/Time Ordered */}
                <div className="flex-none w-[150px] px-2 py-1 text-[11px] text-[#3c4043] dark:text-slate-200 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center">
                  <div className="text-[11px] text-muted-foreground">
                    {transaction.invoice?.ordered_by_provider_at 
                      ? formatDateTime(transaction.invoice.ordered_by_provider_at)
                      : transaction.ordered_by_provider_at 
                      ? formatDateTime(transaction.ordered_by_provider_at)
                      : 'N/A'
                    }
                  </div>
                </div>

                {/* View Invoice */}
                <div className="flex-none w-[80px] px-2 py-1 border-r border-[#dadce0] dark:border-slate-700 leading-[19px] flex items-center justify-center">
                  {transaction.invoice?.mx_invoice_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `/dashboard/invoices/${transaction.invoice!.mx_invoice_id}`}
                      className="h-4 w-4 p-0 hover:bg-slate-200"
                      title="View Invoice Details"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex-none w-[80px] px-2 py-1 leading-[19px] flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTransaction(transaction.id)}
                    className="h-4 w-4 p-0 hover:bg-slate-200"
                    title="View Transaction Details"
                  >
                    <ExternalLink className="h-3 w-3" />
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