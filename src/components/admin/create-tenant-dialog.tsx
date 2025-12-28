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
import { Checkbox } from '@/components/ui/checkbox';

const createTenantSchema = z.object({
  tenant_name: z.string().min(1, 'Tenant name is required').max(255, 'Tenant name too long'),
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  consumer_key: z.string().min(1, 'Consumer key is required'),
  consumer_secret: z.string().min(1, 'Consumer secret is required'),
  environment: z.enum(['production', 'sandbox']),
  webhook_secret: z.string().optional(),
  setup_webhooks: z.boolean(),
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
  webhookSetup?: {
    attempted: boolean;
    results?: {
      eventType: string;
      success: boolean;
    }[];
  };
  error?: string;
}

export function CreateTenantDialog({
  open,
  onOpenChange,
  onTenantCreated,
}: CreateTenantDialogProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookSuccess, setWebhookSuccess] = useState<string | null>(null);

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
      setup_webhooks: true,
    },
  });

  const selectedEnvironment = watch('environment');
  const setupWebhooks = watch('setup_webhooks');

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

      // Show webhook setup results if attempted
      if (result.webhookSetup?.attempted) {
        const successCount = result.webhookSetup.results?.filter(r => r.success).length || 0;
        const totalCount = result.webhookSetup.results?.length || 0;
        setWebhookSuccess(`Webhooks configured: ${successCount}/${totalCount} successful`);
      }

      onTenantCreated(result.tenant);

      // Auto-close after showing success for 2 seconds
      setTimeout(() => {
        reset();
        setWebhookSuccess(null);
        onOpenChange(false);
      }, 2000);
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
    setWebhookSuccess(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl">Add New Tenant</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Add a new medical practice tenant with MX Merchant API credentials. This will create a new isolated environment for the practice.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" id="create-tenant-form">
            {/* Alerts */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}

            {webhookSuccess && (
              <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400">
                {webhookSuccess}
              </Alert>
            )}

            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>

              <div className="space-y-4">
                {/* Tenant Name */}
                <div className="space-y-2">
                  <label htmlFor="tenant_name" className="text-sm font-medium flex items-center gap-1">
                    Tenant Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="tenant_name"
                    placeholder="e.g., GameDay Men's Health - Austin"
                    {...register('tenant_name')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.tenant_name && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.tenant_name.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A friendly display name for this tenant/medical practice
                  </p>
                </div>

                {/* Merchant ID & Environment */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="merchant_id" className="text-sm font-medium flex items-center gap-1">
                      Merchant ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="merchant_id"
                      type="number"
                      placeholder="1000095245"
                      {...register('merchant_id')}
                      disabled={isSubmitting}
                      className="h-10"
                    />
                    {errors.merchant_id && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.merchant_id.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="environment" className="text-sm font-medium flex items-center gap-1">
                      Environment <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedEnvironment}
                      onValueChange={(value: 'production' | 'sandbox') => setValue('environment', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.environment && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.environment.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: API Credentials */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                API Credentials
              </h3>

              <div className="space-y-4">
                {/* Consumer Key */}
                <div className="space-y-2">
                  <label htmlFor="consumer_key" className="text-sm font-medium flex items-center gap-1">
                    Consumer Key <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="consumer_key"
                    placeholder="Your MX Merchant consumer key"
                    {...register('consumer_key')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.consumer_key && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.consumer_key.message}</p>
                  )}
                </div>

                {/* Consumer Secret */}
                <div className="space-y-2">
                  <label htmlFor="consumer_secret" className="text-sm font-medium flex items-center gap-1">
                    Consumer Secret <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="consumer_secret"
                    type="password"
                    placeholder="Your MX Merchant consumer secret"
                    {...register('consumer_secret')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.consumer_secret && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.consumer_secret.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Webhook Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Webhook Configuration
              </h3>

              <div className="space-y-4">
                {/* Webhook Secret */}
                <div className="space-y-2">
                  <label htmlFor="webhook_secret" className="text-sm font-medium">
                    Webhook Secret (Optional)
                  </label>
                  <Input
                    id="webhook_secret"
                    placeholder="Webhook signature validation secret"
                    {...register('webhook_secret')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.webhook_secret && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.webhook_secret.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Used for webhook signature validation. Leave empty if not using webhooks.
                  </p>
                </div>

                {/* Setup Webhooks Checkbox */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/20">
                    <Checkbox
                      id="setup_webhooks"
                      checked={setupWebhooks}
                      onCheckedChange={(checked) => setValue('setup_webhooks', checked as boolean)}
                      disabled={isSubmitting}
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="setup_webhooks"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Setup Webhooks Automatically (Recommended)
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Configures 5 webhook subscriptions for real-time transaction processing:
                        PaymentSuccess, PaymentFail, RefundCreated, Chargeback, and Deposit
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Streamlined Onboarding:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>✅ Tenant created with isolated data environment</li>
                <li>✅ API credentials configured for data sync</li>
                <li>✅ Webhooks setup for real-time transaction processing</li>
                <li>💡 Next: Create admin user and configure product categories</li>
              </ul>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              form="create-tenant-form"
            >
              {isSubmitting ? 'Creating...' : 'Create Tenant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}