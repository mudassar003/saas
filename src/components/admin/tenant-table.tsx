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
import { RefreshCw, Settings, Eye, EyeOff } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface TenantData {
  id: string;
  merchant_id: number;
  consumer_key: string;
  consumer_secret: string;
  environment: string;
  webhook_secret: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantTableProps {
  tenants: TenantData[];
  loading: boolean;
  onRefresh: () => void;
  onManageCategories: (merchantId: number) => void;
}

export function TenantTable({
  tenants,
  loading,
  onRefresh,
  onManageCategories
}: TenantTableProps): React.JSX.Element {
  const getEnvironmentBadgeVariant = (environment: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (environment.toLowerCase()) {
      case 'production':
        return 'destructive';
      case 'sandbox':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): 'default' | 'destructive' | 'outline' | 'secondary' => {
    return isActive ? 'default' : 'outline';
  };

  const maskSecret = (secret: string): string => {
    if (secret.length <= 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading tenants...
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tenants found</p>
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
          Showing {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
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
              <TableHead>Consumer Key</TableHead>
              <TableHead>Consumer Secret</TableHead>
              <TableHead>Webhook Secret</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">
                  {tenant.merchant_id}
                </TableCell>
                <TableCell>
                  <Badge variant={getEnvironmentBadgeVariant(tenant.environment)}>
                    {tenant.environment}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {maskSecret(tenant.consumer_key)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {maskSecret(tenant.consumer_secret)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {tenant.webhook_secret ? maskSecret(tenant.webhook_secret) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(tenant.is_active)}>
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDateTime(tenant.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onManageCategories(tenant.merchant_id)}
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Categories
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}