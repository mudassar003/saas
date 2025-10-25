'use client';

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
import { Contract } from '@/types/contract';
import {
  formatCurrency,
  formatDate,
  getStatusColor
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
  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading contracts...</p>
        </div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No contracts found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="h-6">
            <TableHead className="w-[100px] h-6 py-1 text-xs">Contract ID</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Contract #</TableHead>
            <TableHead className="h-6 py-1 text-xs">Customer</TableHead>
            <TableHead className="w-[100px] h-6 py-1 text-xs">Status</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Frequency</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs text-right">Amount</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Next Bill Date</TableHead>
            <TableHead className="w-[120px] h-6 py-1 text-xs">Start Date</TableHead>
            <TableHead className="w-[60px] h-6 py-1 text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id} className="h-7">
              <TableCell className="font-mono text-xs py-1">
                {contract.mx_contract_id}
              </TableCell>
              <TableCell className="font-semibold py-1 text-xs">
                {contract.contract_name}
              </TableCell>
              <TableCell className="py-1">
                <div className="flex flex-col">
                  <span className="font-medium text-xs">{contract.customer_name}</span>
                </div>
              </TableCell>
              <TableCell className="py-1">
                <Badge
                  variant="outline"
                  className={`text-xs px-1 py-0 ${getStatusColor(contract.status)}`}
                >
                  {contract.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs py-1">
                {contract.billing_interval} - {contract.billing_frequency}
              </TableCell>
              <TableCell className="text-right font-medium py-1 text-xs">
                {formatCurrency(contract.amount, contract.currency_code || 'USD')}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground py-1">
                {contract.next_bill_date ? formatDate(contract.next_bill_date) : 'N/A'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground py-1">
                {contract.start_date ? formatDate(contract.start_date) : 'N/A'}
              </TableCell>
              <TableCell className="py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewContract(contract.mx_contract_id)}
                  className="h-5 w-5 p-0"
                >
                  <Eye className="h-3 w-3" />
                  <span className="sr-only">View contract</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
