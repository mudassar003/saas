'use client';

import { Calendar, DollarSign, User, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Contract } from '@/types/contract';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

interface ContractDetailCardProps {
  contract: Contract;
}

export function ContractDetailCard({ contract }: ContractDetailCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
      {/* Baseball Card Header - Team Colors */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Contract #{contract.contract_name}</h2>
            <p className="text-sm opacity-90">ID: {contract.mx_contract_id}</p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs px-2 py-1 border-white ${getStatusColor(contract.status)} bg-white`}
          >
            {contract.status}
          </Badge>
        </div>
      </div>

      {/* Baseball Card Body - Player Info */}
      <div className="p-6 space-y-6">
        {/* Customer Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900 rounded-full p-2">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Customer</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {contract.customer_name}
              </p>
            </div>
          </div>
        </div>

        {/* Amount Section - Big Number */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 dark:bg-green-900 rounded-full p-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Amount</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(contract.amount, contract.currency_code || 'USD')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {contract.billing_interval} - {contract.billing_frequency}
              </p>
            </div>
          </div>
        </div>

        {/* Billing Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Billing Schedule</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Every {contract.billing_frequency}
              </p>
              <p className="text-xs text-muted-foreground">
                on {contract.billing_day}
              </p>
            </div>
          </div>
        </div>

        {/* Dates Section */}
        <div className="grid grid-cols-1 gap-3">
          {/* Next Bill Date */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Next Bill Date</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {contract.next_bill_date ? formatDate(contract.next_bill_date) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {contract.start_date ? formatDate(contract.start_date) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Last Invoice Date */}
          {contract.last_invoice_date && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Last Payment</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDate(contract.last_invoice_date)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Total Revenue */}
        {contract.grand_total_amount && contract.grand_total_amount > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-2">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(contract.grand_total_amount, contract.currency_code || 'USD')}
                </p>
                <p className="text-xs text-muted-foreground">Lifetime value</p>
              </div>
            </div>
          </div>
        )}

        {/* Declined Payment Warning */}
        {contract.has_declined_payment && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">Payment Issue</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  This contract has a declined payment
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contract Type */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Type: {contract.type || 'N/A'}</span>
            <span>Subscription ID: {contract.mx_subscription_id}</span>
          </div>
        </div>
      </div>

      {/* Baseball Card Footer */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-center text-muted-foreground">
          Last synced: {contract.last_synced_at ? formatDate(contract.last_synced_at) : 'Never'}
        </p>
      </div>
    </div>
  );
}
