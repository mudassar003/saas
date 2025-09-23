'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface MerchantData {
  merchant_id: number;
  environment: string;
  is_active: boolean;
  created_at: string;
}

interface MerchantTableProps {
  merchants: MerchantData[];
  loading: boolean;
  onRefresh: () => void;
}

export function MerchantTable({ merchants, loading, onRefresh }: MerchantTableProps): React.JSX.Element {
  const getEnvironmentBadgeVariant = (environment: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (environment.toLowerCase()) {
      case 'production':
        return 'destructive';
      case 'staging':
        return 'secondary';
      case 'development':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): 'default' | 'destructive' | 'outline' | 'secondary' => {
    return isActive ? 'default' : 'outline';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading merchants...
        </div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No merchants found</p>
        <Button
          variant="outline"
          onClick={onRefresh}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {merchants.length} merchant{merchants.length !== 1 ? 's' : ''}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant ID</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.map((merchant) => (
              <TableRow key={merchant.merchant_id}>
                <TableCell className="font-medium">
                  {merchant.merchant_id}
                </TableCell>
                <TableCell>
                  <Badge variant={getEnvironmentBadgeVariant(merchant.environment)}>
                    {merchant.environment}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(merchant.is_active)}>
                    {merchant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDateTime(merchant.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}