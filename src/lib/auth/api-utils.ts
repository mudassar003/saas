import { NextRequest } from 'next/server';
import { getCurrentUser } from './server-utils';
import { Permission, hasPermission } from './permissions';

/**
 * Extract user information from request headers (set by middleware)
 */
export function getUserFromHeaders(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role') as 'super_admin' | 'tenant_user';
  const currentMerchantId = request.headers.get('x-current-merchant-id');
  const tenantRole = request.headers.get('x-tenant-role') as 'admin' | 'user' | 'viewer' | null;

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    userId,
    userEmail,
    userRole,
    currentMerchantId: currentMerchantId ? parseInt(currentMerchantId) : null,
    tenantRole: tenantRole || null,
  };
}

/**
 * Get merchant ID for current user (for data filtering)
 * Returns null for super admin (can access all), specific merchant ID for tenant users
 */
export async function getCurrentMerchantId(request?: NextRequest): Promise<number | null> {
  let userInfo;

  if (request) {
    // Use headers from middleware if available
    userInfo = getUserFromHeaders(request);
  } else {
    // Fallback to cookie-based auth
    const session = await getCurrentUser();
    if (!session) return null;

    userInfo = {
      userRole: session.user.role,
      currentMerchantId: session.currentMerchantId,
    };
  }

  if (!userInfo) return null;

  // Super admin can access all merchants (returns null = no filter)
  if (userInfo.userRole === 'super_admin') {
    return null;
  }

  // Tenant user can only access their specific merchant
  return userInfo.currentMerchantId ?? null;
}

/**
 * Apply merchant filtering to database queries
 */
export function applyMerchantFilter<T>(query: T, merchantId: number | null): T {
  // If merchantId is null (super admin), no filtering needed
  if (merchantId === null) {
    return query;
  }

  // Apply merchant filter for tenant users
  // @ts-expect-error - Generic query type
  return query.eq('merchant_id', merchantId);
}

/**
 * Check if user has required permission for tenant operation
 *
 * @param request - NextRequest with user headers
 * @param permission - Permission to check
 * @returns Object with hasPermission boolean and tenant role
 * @throws Error if user is not authenticated or is super admin (use different endpoint)
 */
export async function checkTenantPermission(
  request: NextRequest,
  permission: Permission
): Promise<{ hasPermission: boolean; tenantRole: 'admin' | 'user' | 'viewer' }> {
  const userInfo = getUserFromHeaders(request);

  if (!userInfo) {
    throw new Error('User not authenticated');
  }

  // Super admin should not use tenant endpoints
  if (userInfo.userRole === 'super_admin') {
    throw new Error('Super admin should use admin endpoints');
  }

  // Tenant user must have a tenant role
  if (!userInfo.tenantRole) {
    throw new Error('Tenant role not found');
  }

  const permitted = hasPermission(userInfo.tenantRole, permission);

  return {
    hasPermission: permitted,
    tenantRole: userInfo.tenantRole,
  };
}

/**
 * Require specific permission for API operation
 * Throws error if permission denied
 *
 * @param request - NextRequest with user headers
 * @param permission - Permission required
 * @returns Tenant role if permission granted
 * @throws Error if permission denied
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<'admin' | 'user' | 'viewer'> {
  const { hasPermission: permitted, tenantRole } = await checkTenantPermission(request, permission);

  if (!permitted) {
    throw new Error(`Permission denied: ${permission} requires ${tenantRole === 'viewer' ? 'user or admin' : 'admin'} role`);
  }

  return tenantRole;
}