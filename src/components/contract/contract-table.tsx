'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Contract } from '@/types/contract';
import {
  formatCurrency,
  formatDate
} from '@/lib/utils';

interface ContractTableProps {
  contracts: Contract[];
  onViewContract: (contractId: number) => void;
  loading?: boolean;
}

export function ContractTable({
  contracts,
  onViewContract,
  loading = false
}: ContractTableProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'completed':
        return 'bg-info/10 text-info border-info/20';
      case 'cancelled':
        return 'bg-error/10 text-error border-error/20';
      case 'inactive':
        return 'bg-warning/10 text-warning border-warning/20';
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

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-sm">No contracts found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Modern scrollable container */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[1400px]">
          {/* Header */}
          <div className="flex bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
            <div className="flex-none w-[140px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contract ID
            </div>
            <div className="flex-none w-[140px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contract #
            </div>
            <div className="flex-none w-[200px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Customer
            </div>
            <div className="flex-none w-[120px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </div>
            <div className="flex-none w-[160px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Frequency
            </div>
            <div className="flex-none w-[120px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
              Amount
            </div>
            <div className="flex-none w-[140px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Next Bill
            </div>
            <div className="flex-none w-[140px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Start Date
            </div>
            <div className="flex-none w-[100px] px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Actions
            </div>
          </div>

          {/* Rows */}
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex min-h-16 border-b border-border hover:bg-accent/5 transition-colors"
            >
              {/* Contract ID */}
              <div className="flex-none w-[140px] px-4 py-3 flex items-center">
                <span className="text-sm font-mono text-muted-foreground">
                  {contract.mx_contract_id}
                </span>
              </div>

              {/* Contract # */}
              <div className="flex-none w-[140px] px-4 py-3 flex items-center">
                <span className="text-sm font-semibold text-foreground">
                  {contract.contract_name}
                </span>
              </div>

              {/* Customer */}
              <div className="flex-none w-[200px] px-4 py-3 flex items-center">
                <span className="text-sm font-medium text-foreground truncate">
                  {contract.customer_name}
                </span>
              </div>

              {/* Status */}
              <div className="flex-none w-[120px] px-4 py-3 flex items-center">
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(contract.status)}`}>
                  {contract.status}
                </span>
              </div>

              {/* Frequency */}
              <div className="flex-none w-[160px] px-4 py-3 flex items-center">
                <span className="text-sm text-foreground">
                  {contract.billing_interval} - {contract.billing_frequency}
                </span>
              </div>

              {/* Amount */}
              <div className="flex-none w-[120px] px-4 py-3 flex items-center justify-end">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(contract.amount, contract.currency_code || 'USD')}
                </span>
              </div>

              {/* Next Bill Date */}
              <div className="flex-none w-[140px] px-4 py-3 flex items-center">
                <span className="text-sm text-muted-foreground">
                  {contract.next_bill_date ? formatDate(contract.next_bill_date) : 'N/A'}
                </span>
              </div>

              {/* Start Date */}
              <div className="flex-none w-[140px] px-4 py-3 flex items-center">
                <span className="text-sm text-muted-foreground">
                  {contract.start_date ? formatDate(contract.start_date) : 'N/A'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex-none w-[100px] px-4 py-3 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewContract(contract.mx_contract_id)}
                  className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  title="View contract details"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View contract</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
