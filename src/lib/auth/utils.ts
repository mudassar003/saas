// Client-safe authentication utilities
// For server-side functions, use ./server-utils.ts

import { UserSession } from './types';

/**
 * Check if user has access to specific merchant (CLIENT SAFE)
 */
export function hasAccessToMerchant(session: UserSession | null, merchantId: number): boolean {
  if (!session) return false;

  // Super admin has access to all merchants
  if (session.user.role === 'super_admin') return true;

  // Tenant user must have specific access
  return session.tenantAccess.some(
    access => access.merchantId === merchantId && access.isActive
  );
}