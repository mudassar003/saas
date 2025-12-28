'use client';

import { useState, useEffect } from 'react';
import { MerchantTable } from '@/components/admin/merchant-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useRequireSuperAdmin } from '@/lib/auth';
import { Building2 } from 'lucide-react';

interface MerchantData {
  merchant_id: number;
  environment: string;
  is_active: boolean;
  created_at: string;
}

interface MerchantsApiResponse {
  success: boolean;
  merchants?: MerchantData[];
  error?: string;
}

export default function AdminMerchantsPage(): React.JSX.Element {
  const auth = useRequireSuperAdmin();
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchants = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/merchants', {
        credentials: 'include',
      });

      const result: MerchantsApiResponse = await response.json();

      if (!result.success || !result.merchants) {
        throw new Error(result.error || 'Failed to fetch merchants');
      }

      setMerchants(result.merchants);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      fetchMerchants();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Merchant Management</h1>
          <p className="text-muted-foreground mt-2">
            View all merchant tenants and their configurations
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Merchants
          </CardTitle>
          <CardDescription>
            View all merchant configurations. Each merchant represents a separate tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <MerchantTable
            merchants={merchants}
            loading={loading}
            onRefresh={fetchMerchants}
          />
        </CardContent>
      </Card>
    </div>
  );
}