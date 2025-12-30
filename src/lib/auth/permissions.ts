/**
 * Tenant Role Permission System
 *
 * This module provides type-safe permission checking for tenant-level roles.
 * Follows principle of least privilege and explicit permissions.
 *
 * Role Hierarchy:
 * - admin: Full control within merchant scope
 * - user: Standard operations (read + write limited)
 * - viewer: Read-only access
 */

import { TenantAccess } from './types';

// Enum for all possible permissions in the system
export enum Permission {
  // Invoice permissions
  VIEW_INVOICES = 'view_invoices',
  EXPORT_INVOICES = 'export_invoices',
  UPDATE_INVOICE_STATUS = 'update_invoice_status',
  EDIT_INVOICE_DATA = 'edit_invoice_data',

  // Transaction permissions
  VIEW_TRANSACTIONS = 'view_transactions',
  EXPORT_TRANSACTIONS = 'export_transactions',
  UPDATE_TRANSACTION_STATUS = 'update_transaction_status',
  UPDATE_MEMBERSHIP_STATUS = 'update_membership_status',
  UPDATE_PRODUCT_CATEGORY = 'update_product_category',

  // Census permissions
  VIEW_CENSUS = 'view_census',
  EXPORT_CENSUS = 'export_census',

  // Category management permissions
  VIEW_CATEGORIES = 'view_categories',
  CREATE_CATEGORY = 'create_category',
  UPDATE_CATEGORY = 'update_category',
  DELETE_CATEGORY = 'delete_category',

  // Sync permissions
  VIEW_SYNC_LOGS = 'view_sync_logs',
  TRIGGER_MANUAL_SYNC = 'trigger_manual_sync',

  // Settings permissions
  VIEW_MERCHANT_SETTINGS = 'view_merchant_settings',
  UPDATE_MERCHANT_SETTINGS = 'update_merchant_settings',

  // Revenue permissions
  VIEW_REVENUE = 'view_revenue',
  GENERATE_REVENUE_REPORT = 'generate_revenue_report',
  TRIGGER_REVENUE_SYNC = 'trigger_revenue_sync',
}

// Permission map defining what each role can do
const ROLE_PERMISSIONS: Record<'admin' | 'user' | 'viewer', Permission[]> = {
  // Viewer: Read-only access to all data
  viewer: [
    // Invoice permissions
    Permission.VIEW_INVOICES,
    Permission.EXPORT_INVOICES,

    // Transaction permissions
    Permission.VIEW_TRANSACTIONS,
    Permission.EXPORT_TRANSACTIONS,

    // Census permissions
    Permission.VIEW_CENSUS,
    Permission.EXPORT_CENSUS,

    // Category permissions (read-only)
    Permission.VIEW_CATEGORIES,

    // Sync permissions (read-only)
    Permission.VIEW_SYNC_LOGS,

    // Settings permissions (read-only)
    Permission.VIEW_MERCHANT_SETTINGS,

    // Revenue permissions (read-only)
    Permission.VIEW_REVENUE,
  ],

  // User: Initialize empty, will be populated after viewer is defined
  user: [],

  // Admin: Initialize empty, will be populated after user is defined
  admin: [],
};

// Initialize user permissions after viewer is defined
ROLE_PERMISSIONS.user = [
  ...ROLE_PERMISSIONS.viewer,
  Permission.UPDATE_INVOICE_STATUS,
  Permission.UPDATE_TRANSACTION_STATUS,
  Permission.UPDATE_MEMBERSHIP_STATUS,
  Permission.UPDATE_PRODUCT_CATEGORY,
  Permission.GENERATE_REVENUE_REPORT,
];

// Initialize admin permissions after user is defined
ROLE_PERMISSIONS.admin = [
  ...ROLE_PERMISSIONS.user,
  Permission.EDIT_INVOICE_DATA,
  Permission.CREATE_CATEGORY,
  Permission.UPDATE_CATEGORY,
  Permission.DELETE_CATEGORY,
  Permission.TRIGGER_MANUAL_SYNC,
  Permission.UPDATE_MERCHANT_SETTINGS,
  Permission.TRIGGER_REVENUE_SYNC,
];

/**
 * Check if a tenant role has a specific permission
 *
 * @param tenantRole - The tenant role to check (admin, user, viewer)
 * @param permission - The permission to check
 * @returns true if role has permission, false otherwise
 */
export function hasPermission(
  tenantRole: 'admin' | 'user' | 'viewer',
  permission: Permission
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[tenantRole];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user session has a specific permission for a given merchant
 *
 * @param tenantAccess - Array of tenant access records from user session
 * @param merchantId - The merchant ID to check permissions for
 * @param permission - The permission to check
 * @returns true if user has permission for the merchant, false otherwise
 */
export function hasPermissionForMerchant(
  tenantAccess: TenantAccess[],
  merchantId: number,
  permission: Permission
): boolean {
  const access = tenantAccess.find(a => a.merchantId === merchantId && a.isActive);

  if (!access) {
    return false;
  }

  return hasPermission(access.tenantRole, permission);
}

/**
 * Get all permissions for a specific tenant role
 *
 * @param tenantRole - The tenant role (admin, user, viewer)
 * @returns Array of permissions the role has
 */
export function getRolePermissions(tenantRole: 'admin' | 'user' | 'viewer'): Permission[] {
  return ROLE_PERMISSIONS[tenantRole];
}

/**
 * Check if a tenant role can perform write operations
 *
 * @param tenantRole - The tenant role to check
 * @returns true if role can write, false if read-only
 */
export function canWrite(tenantRole: 'admin' | 'user' | 'viewer'): boolean {
  return tenantRole !== 'viewer';
}

/**
 * Check if a tenant role has admin privileges
 *
 * @param tenantRole - The tenant role to check
 * @returns true if role is admin, false otherwise
 */
export function isAdmin(tenantRole: 'admin' | 'user' | 'viewer'): boolean {
  return tenantRole === 'admin';
}

/**
 * Role descriptions for UI display (used in Create User Dialog)
 */
export const TENANT_ROLE_DESCRIPTIONS = {
  viewer: {
    name: 'Viewer (Read-Only)',
    description: 'Can view all data but cannot make any changes',
    icon: '👁️',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    permissions: [
      'View invoices, transactions, and census data',
      'Export reports and data',
      'View sync logs and history',
      'View product categories',
      'View revenue projections and financial data',
      'No modification permissions'
    ],
    useCase: 'Perfect for: Accountants, auditors, reporting staff',
    accessLevel: 'Read-Only Access'
  },
  user: {
    name: 'User (Standard Access)',
    description: 'Can view data and perform standard daily operations',
    icon: '👤',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    permissions: [
      'All Viewer permissions',
      'Mark invoices as "Ordered by Provider"',
      'Update transaction and membership statuses',
      'Categorize products and manage fulfillment',
      'Generate revenue projections and reports',
      'Cannot manage categories or trigger syncs'
    ],
    useCase: 'Perfect for: Nurses, front desk staff, operational team',
    accessLevel: 'Read + Standard Write Access'
  },
  admin: {
    name: 'Admin (Full Control)',
    description: 'Full administrative access to manage all merchant data',
    icon: '👑',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800',
    permissions: [
      'All User permissions',
      'Create, edit, and delete product categories',
      'Trigger manual data synchronization',
      'Trigger revenue data synchronization',
      'Manage merchant settings and configurations',
      'Full administrative control within merchant scope'
    ],
    useCase: 'Perfect for: Practice managers, clinic administrators',
    accessLevel: 'Full Administrative Access'
  }
} as const;

/**
 * Get human-readable permission name
 *
 * @param permission - The permission enum value
 * @returns Formatted permission name
 */
export function getPermissionName(permission: Permission): string {
  return permission
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate if a permission exists
 *
 * @param permission - The permission string to validate
 * @returns true if valid permission, false otherwise
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission);
}
