'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const createTenantSchema = z.object({
  tenant_name: z.string().min(1, 'Tenant name is required').max(255, 'Tenant name too long'),
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  consumer_key: z.string().min(1, 'Consumer key is required'),
  consumer_secret: z.string().min(1, 'Consumer secret is required'),
  environment: z.enum(['production', 'sandbox']),
  webhook_secret: z.string().optional(),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;

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

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenantCreated: (tenant: TenantData) => void;
}

interface CreateTenantApiResponse {
  success: boolean;
  tenant?: TenantData;
  error?: string;
}

export function CreateTenantDialog({
  open,
  onOpenChange,
  onTenantCreated,
}: CreateTenantDialogProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      environment: 'production',
    },
  });

  const selectedEnvironment = watch('environment');

  const onSubmit = async (data: CreateTenantFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convert merchant_id to number and validate
      const merchantId = parseInt(data.merchant_id, 10);
      if (isNaN(merchantId) || merchantId <= 0) {
        throw new Error('Merchant ID must be a positive number');
      }

      const requestData = {
        ...data,
        merchant_id: merchantId,
      };

      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      const result: CreateTenantApiResponse = await response.json();

      if (!result.success || !result.tenant) {
        throw new Error(result.error || 'Failed to create tenant');
      }

      onTenantCreated(result.tenant);
      reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to create tenant:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (): void => {
    reset();
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
          <DialogDescription>
            Add a new medical practice tenant with MX Merchant API credentials. This will create a new isolated environment for the practice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="tenant_name" className="text-sm font-medium">
              Tenant Name *
            </label>
            <Input
              id="tenant_name"
              placeholder="e.g., GameDay Men's Health - Austin"
              {...register('tenant_name')}
              disabled={isSubmitting}
            />
            {errors.tenant_name && (
              <p className="text-sm text-red-600">{errors.tenant_name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              A friendly display name for this tenant/medical practice
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="merchant_id" className="text-sm font-medium">
                Merchant ID *
              </label>
              <Input
                id="merchant_id"
                type="number"
                placeholder="1000095245"
                {...register('merchant_id')}
                disabled={isSubmitting}
              />
              {errors.merchant_id && (
                <p className="text-sm text-red-600">{errors.merchant_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="environment" className="text-sm font-medium">
                Environment *
              </label>
              <Select
                value={selectedEnvironment}
                onValueChange={(value: 'production' | 'sandbox') => setValue('environment', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
              {errors.environment && (
                <p className="text-sm text-red-600">{errors.environment.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="consumer_key" className="text-sm font-medium">
              Consumer Key *
            </label>
            <Input
              id="consumer_key"
              placeholder="Your MX Merchant consumer key"
              {...register('consumer_key')}
              disabled={isSubmitting}
            />
            {errors.consumer_key && (
              <p className="text-sm text-red-600">{errors.consumer_key.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="consumer_secret" className="text-sm font-medium">
              Consumer Secret *
            </label>
            <Input
              id="consumer_secret"
              type="password"
              placeholder="Your MX Merchant consumer secret"
              {...register('consumer_secret')}
              disabled={isSubmitting}
            />
            {errors.consumer_secret && (
              <p className="text-sm text-red-600">{errors.consumer_secret.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="webhook_secret" className="text-sm font-medium">
              Webhook Secret (Optional)
            </label>
            <Input
              id="webhook_secret"
              placeholder="Webhook signature validation secret"
              {...register('webhook_secret')}
              disabled={isSubmitting}
            />
            {errors.webhook_secret && (
              <p className="text-sm text-red-600">{errors.webhook_secret.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used for webhook signature validation. Leave empty if not using webhooks.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Each tenant is completely isolated with their own data</li>
              <li>• API credentials will be used to sync transaction and invoice data</li>
              <li>• Merchant ID must be unique and match your MX Merchant account</li>
              <li>• Production environment should only be used for live medical practices</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}