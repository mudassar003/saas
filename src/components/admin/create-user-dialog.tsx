'use client';

import { useState, useEffect } from 'react';
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
import { User } from '@/lib/auth/types';

const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['super_admin', 'tenant_user']),
  merchantId: z.number().optional(),
  tenantRole: z.enum(['admin', 'user', 'viewer']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // If role is tenant_user, merchantId is required
  if (data.role === 'tenant_user' && !data.merchantId) {
    return false;
  }
  return true;
}, {
  message: 'Merchant ID is required for tenant users',
  path: ['merchantId'],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: User) => void;
}

interface CreateUserApiResponse {
  success: boolean;
  user?: User;
  error?: string;
}

interface MerchantsApiResponse {
  success: boolean;
  merchants?: Array<{
    merchant_id: number;
    environment: string;
    tenant_name: string | null;
  }>;
  error?: string;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onUserCreated,
}: CreateUserDialogProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchants, setMerchants] = useState<Array<{ merchant_id: number; environment: string; tenant_name: string | null }>>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    clearErrors,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'tenant_user',
      tenantRole: 'user',
    },
  });

  const selectedRole = watch('role');

  // Fetch merchants when dialog opens and role is tenant_user
  useEffect(() => {
    if (open && selectedRole === 'tenant_user' && merchants.length === 0) {
      fetchMerchants();
    }
  }, [open, selectedRole, merchants.length]);

  const fetchMerchants = async (): Promise<void> => {
    try {
      setMerchantsLoading(true);

      const response = await fetch('/api/admin/merchants', {
        credentials: 'include',
      });

      const result: MerchantsApiResponse = await response.json();

      if (result.success && result.merchants) {
        setMerchants(result.merchants);
      }
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
    } finally {
      setMerchantsLoading(false);
    }
  };

  const onSubmit = async (data: CreateUserFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      const requestBody = {
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName?.trim() || undefined,
        lastName: data.lastName?.trim() || undefined,
        password: data.password,
        role: data.role,
        ...(data.role === 'tenant_user' && {
          merchantId: data.merchantId,
          tenantRole: data.tenantRole,
        }),
      };

      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });

      const result: CreateUserApiResponse = await response.json();

      if (!result.success || !result.user) {
        throw new Error(result.error || 'Failed to create user');
      }

      onUserCreated(result.user);
      reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to create user:', err);
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
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. Super admins have access to all tenants.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role *
              </label>
              <Select
                value={selectedRole}
                onValueChange={(value: 'super_admin' | 'tenant_user') => {
                  setValue('role', value);
                  clearErrors('merchantId');
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_user">Tenant User</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="firstName"
                placeholder="John"
                {...register('firstName')}
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register('lastName')}
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password *
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password *
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                {...register('confirmPassword')}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {selectedRole === 'tenant_user' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="merchantId" className="text-sm font-medium">
                  Merchant *
                </label>
                <Select
                  onValueChange={(value) => setValue('merchantId', parseInt(value))}
                  disabled={isSubmitting || merchantsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={merchantsLoading ? "Loading..." : "Select merchant"} />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.merchant_id} value={merchant.merchant_id.toString()}>
                        {merchant.tenant_name || `Tenant ${merchant.merchant_id}`} - ID: {merchant.merchant_id} ({merchant.environment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.merchantId && (
                  <p className="text-sm text-red-600">{errors.merchantId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="tenantRole" className="text-sm font-medium">
                  Tenant Role *
                </label>
                <Select
                  defaultValue="user"
                  onValueChange={(value: 'admin' | 'user' | 'viewer') => setValue('tenantRole', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tenantRole && (
                  <p className="text-sm text-red-600">{errors.tenantRole.message}</p>
                )}
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}