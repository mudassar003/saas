import { NextRequest } from 'next/server';
import { getCurrentUser } from './server-utils';

/**
 * Extract user information from request headers (set by middleware)
 */
export function getUserFromHeaders(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role') as 'super_admin' | 'tenant_user';
  const currentMerchantId = request.headers.get('x-current-merchant-id');

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    userId,
    userEmail,
    userRole,
    currentMerchantId: currentMerchantId ? parseInt(currentMerchantId) : null,
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