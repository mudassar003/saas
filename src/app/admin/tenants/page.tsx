'use client';

import { useState, useEffect } from 'react';
import { TenantTable } from '@/components/admin/tenant-table';
import { CreateTenantDialog } from '@/components/admin/create-tenant-dialog';
import { ProductCategoriesDialog } from '@/components/admin/product-categories-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useRequireSuperAdmin } from '@/lib/auth';
import { Plus, Building2 } from 'lucide-react';

interface TenantData {
  id: string;
  merchant_id: number;
  consumer_key: string;
  consumer_secret: string;
  environment: string;
  webhook_secret: string | null;
  tenant_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantsApiResponse {
  success: boolean;
  tenants?: TenantData[];
  error?: string;
}

export default function AdminTenantsPage(): React.JSX.Element {
  const auth = useRequireSuperAdmin();
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  const fetchTenants = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/tenants', {
        credentials: 'include',
      });

      const result: TenantsApiResponse = await response.json();

      if (!result.success || !result.tenants) {
        throw new Error(result.error || 'Failed to fetch tenants');
      }

      setTenants(result.tenants);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantCreated = (newTenant: TenantData): void => {
    setTenants(prevTenants => [newTenant, ...prevTenants]);
    setCreateDialogOpen(false);
  };

  const handleManageCategories = (merchantId: number): void => {
    setSelectedTenantId(merchantId);
    setCategoriesDialogOpen(true);
  };

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      fetchTenants();
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage merchant tenants, API credentials, and product categorization
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Tenants
          </CardTitle>
          <CardDescription>
            Manage merchant configurations, API credentials, and product categories. Each tenant represents a separate medical practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantTable
            tenants={tenants}
            loading={loading}
            onRefresh={fetchTenants}
            onManageCategories={handleManageCategories}
          />
        </CardContent>
      </Card>

      <CreateTenantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTenantCreated={handleTenantCreated}
      />

      {selectedTenantId && (
        <ProductCategoriesDialog
          open={categoriesDialogOpen}
          onOpenChange={setCategoriesDialogOpen}
          merchantId={selectedTenantId}
        />
      )}
    </div>
  );
}