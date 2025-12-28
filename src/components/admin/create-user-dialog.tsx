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
import { TENANT_ROLE_DESCRIPTIONS } from '@/lib/auth/permissions';
import { Info } from 'lucide-react';

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
  const selectedTenantRole = watch('tenantRole');

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
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl">Create New User</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Add a new user to the system. Super admins have access to all tenants.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" id="create-user-form">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}

            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>

              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    {...register('email')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium flex items-center gap-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value: 'super_admin' | 'tenant_user') => {
                      setValue('role', value);
                      clearErrors('merchantId');
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant_user">Tenant User</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                {/* Name Fields */}
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
                      className="h-10"
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>
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
                      className="h-10"
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Security */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Security
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    {...register('password')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    {...register('confirmPassword')}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Tenant Assignment (only for tenant users) */}
            {selectedRole === 'tenant_user' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Tenant Assignment
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="merchantId" className="text-sm font-medium flex items-center gap-1">
                      Merchant <span className="text-red-500">*</span>
                    </label>
                    <Select
                      onValueChange={(value) => setValue('merchantId', parseInt(value))}
                      disabled={isSubmitting || merchantsLoading}
                    >
                      <SelectTrigger className="h-10">
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
                      <p className="text-xs text-red-600 mt-1">{errors.merchantId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tenantRole" className="text-sm font-medium flex items-center gap-1">
                      Tenant Role <span className="text-red-500">*</span>
                    </label>
                    <Select
                      defaultValue="user"
                      onValueChange={(value: 'admin' | 'user' | 'viewer') => setValue('tenantRole', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select tenant role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <span>{TENANT_ROLE_DESCRIPTIONS.viewer.icon}</span>
                            <span>Viewer (Read-Only)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <span>{TENANT_ROLE_DESCRIPTIONS.user.icon}</span>
                            <span>User (Standard Access)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <span>{TENANT_ROLE_DESCRIPTIONS.admin.icon}</span>
                            <span>Admin (Full Control)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.tenantRole && (
                      <p className="text-xs text-red-600 mt-1">{errors.tenantRole.message}</p>
                    )}
                  </div>
                </div>

                {/* Role Description */}
                {selectedTenantRole && (
                  <div className={`p-4 rounded-lg border ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].bgColor} ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].borderColor}`}>
                    <div className="flex items-start gap-3">
                      <Info className={`h-5 w-5 mt-0.5 flex-shrink-0 ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].color}`} />
                      <div className="space-y-2">
                        <div>
                          <p className={`font-semibold text-sm ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].color}`}>
                            {TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].name}
                          </p>
                          <p className={`text-sm mt-1 ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].color}`}>
                            {TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].description}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].color}`}>
                            Permissions:
                          </p>
                          <ul className={`text-xs space-y-0.5 mt-1 ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].color}`}>
                            {TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].permissions.map((permission, index) => (
                              <li key={index}>• {permission}</li>
                            ))}
                          </ul>
                        </div>
                        <p className={`text-xs italic ${TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].color}`}>
                          {TENANT_ROLE_DESCRIPTIONS[selectedTenantRole].useCase}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              form="create-user-form"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}