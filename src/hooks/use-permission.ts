/**
 * Permission Checking Hook
 *
 * Provides client-side permission checking for UI-level guards.
 * This is a convenience layer - actual authorization happens at the API level.
 *
 * Usage:
 * ```tsx
 * const { hasPermission, isTenantAdmin } = usePermission();
 *
 * if (hasPermission(Permission.TRIGGER_REVENUE_SYNC)) {
 *   // Show admin-only button
 * }
 * ```
 */

import { useAuth } from '@/lib/auth/context';
import { Permission, hasPermissionForMerchant } from '@/lib/auth/permissions';

export interface UsePermissionReturn {
  /**
   * Check if current user has a specific permission for current merchant
   * @param permission - The permission to check
   * @returns true if user has permission, false otherwise
   */
  hasPermission: (permission: Permission) => boolean;

  /**
   * Check if current user is a tenant admin (has admin role for current merchant)
   * @returns true if user is admin, false otherwise
   */
  isTenantAdmin: boolean;

  /**
   * Check if current user is a super admin (global admin)
   * @returns true if user is super admin, false otherwise
   */
  isSuperAdmin: boolean;

  /**
   * Check if current user can perform write operations
   * @returns true if user has write access, false if read-only
   */
  canWrite: boolean;

  /**
   * Current tenant role (admin, user, viewer) or null if no access
   */
  tenantRole: 'admin' | 'user' | 'viewer' | null;
}

export function usePermission(): UsePermissionReturn {
  const { user, isSuperAdmin, currentMerchantId } = useAuth();

  // Super admin has all permissions
  if (isSuperAdmin) {
    return {
      hasPermission: () => true,
      isTenantAdmin: true,
      isSuperAdmin: true,
      canWrite: true,
      tenantRole: 'admin',
    };
  }

  // No user or no tenant access
  if (!user?.tenantAccess || user.tenantAccess.length === 0) {
    return {
      hasPermission: () => false,
      isTenantAdmin: false,
      isSuperAdmin: false,
      canWrite: false,
      tenantRole: null,
    };
  }

  // Get current merchant's access
  const currentAccess = currentMerchantId
    ? user.tenantAccess.find(
        (access) => access.merchantId === currentMerchantId && access.isActive
      )
    : user.tenantAccess[0]; // Fallback to first access if no current merchant

  if (!currentAccess) {
    return {
      hasPermission: () => false,
      isTenantAdmin: false,
      isSuperAdmin: false,
      canWrite: false,
      tenantRole: null,
    };
  }

  const tenantRole = currentAccess.tenantRole;
  const merchantId = currentAccess.merchantId;

  return {
    hasPermission: (permission: Permission) => {
      return hasPermissionForMerchant(user.tenantAccess, merchantId, permission);
    },
    isTenantAdmin: tenantRole === 'admin',
    isSuperAdmin: false,
    canWrite: tenantRole !== 'viewer',
    tenantRole,
  };
}
