/**
 * Comprehensive Permission System Tests
 *
 * Tests all tenant role permissions to ensure proper access control
 * Run with: npm test tests/permissions.test.ts
 */

import {
  Permission,
  hasPermission,
  getRolePermissions,
  canWrite,
  isAdmin,
  getPermissionName,
  isValidPermission
} from '@/lib/auth/permissions';

describe('Permission System', () => {

  describe('Viewer Role Permissions', () => {
    const role = 'viewer';

    it('should have read-only permissions', () => {
      // Viewer CAN view data
      expect(hasPermission(role, Permission.VIEW_INVOICES)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_TRANSACTIONS)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_CENSUS)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_CATEGORIES)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_SYNC_LOGS)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_MERCHANT_SETTINGS)).toBe(true);
    });

    it('should have export permissions', () => {
      expect(hasPermission(role, Permission.EXPORT_INVOICES)).toBe(true);
      expect(hasPermission(role, Permission.EXPORT_TRANSACTIONS)).toBe(true);
      expect(hasPermission(role, Permission.EXPORT_CENSUS)).toBe(true);
    });

    it('should NOT have any write permissions', () => {
      // Viewer CANNOT modify data
      expect(hasPermission(role, Permission.UPDATE_INVOICE_STATUS)).toBe(false);
      expect(hasPermission(role, Permission.EDIT_INVOICE_DATA)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_TRANSACTION_STATUS)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_MEMBERSHIP_STATUS)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_PRODUCT_CATEGORY)).toBe(false);
    });

    it('should NOT have category management permissions', () => {
      expect(hasPermission(role, Permission.CREATE_CATEGORY)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_CATEGORY)).toBe(false);
      expect(hasPermission(role, Permission.DELETE_CATEGORY)).toBe(false);
    });

    it('should NOT have admin permissions', () => {
      expect(hasPermission(role, Permission.TRIGGER_MANUAL_SYNC)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_MERCHANT_SETTINGS)).toBe(false);
    });

    it('should be marked as read-only', () => {
      expect(canWrite(role)).toBe(false);
      expect(isAdmin(role)).toBe(false);
    });

    it('should have exactly 9 permissions', () => {
      const permissions = getRolePermissions(role);
      expect(permissions).toHaveLength(9);
    });
  });

  describe('User Role Permissions', () => {
    const role = 'user';

    it('should have all viewer permissions', () => {
      // User inherits all viewer permissions
      expect(hasPermission(role, Permission.VIEW_INVOICES)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_TRANSACTIONS)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_CENSUS)).toBe(true);
      expect(hasPermission(role, Permission.VIEW_CATEGORIES)).toBe(true);
      expect(hasPermission(role, Permission.EXPORT_INVOICES)).toBe(true);
      expect(hasPermission(role, Permission.EXPORT_TRANSACTIONS)).toBe(true);
    });

    it('should have standard write permissions', () => {
      // User CAN update statuses
      expect(hasPermission(role, Permission.UPDATE_INVOICE_STATUS)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_TRANSACTION_STATUS)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_MEMBERSHIP_STATUS)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_PRODUCT_CATEGORY)).toBe(true);
    });

    it('should NOT have category management permissions', () => {
      // User CANNOT manage categories (admin only)
      expect(hasPermission(role, Permission.CREATE_CATEGORY)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_CATEGORY)).toBe(false);
      expect(hasPermission(role, Permission.DELETE_CATEGORY)).toBe(false);
    });

    it('should NOT have admin permissions', () => {
      expect(hasPermission(role, Permission.EDIT_INVOICE_DATA)).toBe(false);
      expect(hasPermission(role, Permission.TRIGGER_MANUAL_SYNC)).toBe(false);
      expect(hasPermission(role, Permission.UPDATE_MERCHANT_SETTINGS)).toBe(false);
    });

    it('should be marked as can write but not admin', () => {
      expect(canWrite(role)).toBe(true);
      expect(isAdmin(role)).toBe(false);
    });

    it('should have exactly 13 permissions (9 viewer + 4 user)', () => {
      const permissions = getRolePermissions(role);
      expect(permissions).toHaveLength(13);
    });
  });

  describe('Admin Role Permissions', () => {
    const role = 'admin';

    it('should have all user permissions', () => {
      // Admin inherits all user permissions
      expect(hasPermission(role, Permission.VIEW_INVOICES)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_INVOICE_STATUS)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_TRANSACTION_STATUS)).toBe(true);
    });

    it('should have category management permissions', () => {
      // Admin CAN manage categories
      expect(hasPermission(role, Permission.CREATE_CATEGORY)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_CATEGORY)).toBe(true);
      expect(hasPermission(role, Permission.DELETE_CATEGORY)).toBe(true);
    });

    it('should have admin-only permissions', () => {
      expect(hasPermission(role, Permission.EDIT_INVOICE_DATA)).toBe(true);
      expect(hasPermission(role, Permission.TRIGGER_MANUAL_SYNC)).toBe(true);
      expect(hasPermission(role, Permission.UPDATE_MERCHANT_SETTINGS)).toBe(true);
    });

    it('should be marked as can write and is admin', () => {
      expect(canWrite(role)).toBe(true);
      expect(isAdmin(role)).toBe(true);
    });

    it('should have exactly 19 permissions (13 user + 6 admin)', () => {
      const permissions = getRolePermissions(role);
      expect(permissions).toHaveLength(19);
    });
  });

  describe('Permission Hierarchy', () => {
    it('viewer permissions should be subset of user permissions', () => {
      const viewerPerms = getRolePermissions('viewer');
      const userPerms = getRolePermissions('user');

      viewerPerms.forEach(perm => {
        expect(userPerms).toContain(perm);
      });
    });

    it('user permissions should be subset of admin permissions', () => {
      const userPerms = getRolePermissions('user');
      const adminPerms = getRolePermissions('admin');

      userPerms.forEach(perm => {
        expect(adminPerms).toContain(perm);
      });
    });

    it('should maintain proper permission counts', () => {
      const viewerCount = getRolePermissions('viewer').length;
      const userCount = getRolePermissions('user').length;
      const adminCount = getRolePermissions('admin').length;

      expect(userCount).toBeGreaterThan(viewerCount);
      expect(adminCount).toBeGreaterThan(userCount);
    });
  });

  describe('Category Management Permissions (Critical)', () => {
    it('only admin should create categories', () => {
      expect(hasPermission('viewer', Permission.CREATE_CATEGORY)).toBe(false);
      expect(hasPermission('user', Permission.CREATE_CATEGORY)).toBe(false);
      expect(hasPermission('admin', Permission.CREATE_CATEGORY)).toBe(true);
    });

    it('only admin should update categories', () => {
      expect(hasPermission('viewer', Permission.UPDATE_CATEGORY)).toBe(false);
      expect(hasPermission('user', Permission.UPDATE_CATEGORY)).toBe(false);
      expect(hasPermission('admin', Permission.UPDATE_CATEGORY)).toBe(true);
    });

    it('only admin should delete categories', () => {
      expect(hasPermission('viewer', Permission.DELETE_CATEGORY)).toBe(false);
      expect(hasPermission('user', Permission.DELETE_CATEGORY)).toBe(false);
      expect(hasPermission('admin', Permission.DELETE_CATEGORY)).toBe(true);
    });

    it('all roles should view categories', () => {
      expect(hasPermission('viewer', Permission.VIEW_CATEGORIES)).toBe(true);
      expect(hasPermission('user', Permission.VIEW_CATEGORIES)).toBe(true);
      expect(hasPermission('admin', Permission.VIEW_CATEGORIES)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should format permission names correctly', () => {
      expect(getPermissionName(Permission.VIEW_INVOICES)).toBe('View Invoices');
      expect(getPermissionName(Permission.CREATE_CATEGORY)).toBe('Create Category');
      expect(getPermissionName(Permission.UPDATE_MERCHANT_SETTINGS)).toBe('Update Merchant Settings');
    });

    it('should validate permission strings', () => {
      expect(isValidPermission('view_invoices')).toBe(true);
      expect(isValidPermission('create_category')).toBe(true);
      expect(isValidPermission('invalid_permission')).toBe(false);
      expect(isValidPermission('')).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    it('should not grant unexpected permissions to viewer', () => {
      const viewerPerms = getRolePermissions('viewer');
      const writePerms = [
        Permission.UPDATE_INVOICE_STATUS,
        Permission.EDIT_INVOICE_DATA,
        Permission.CREATE_CATEGORY,
        Permission.UPDATE_CATEGORY,
        Permission.DELETE_CATEGORY,
        Permission.TRIGGER_MANUAL_SYNC,
        Permission.UPDATE_MERCHANT_SETTINGS
      ];

      writePerms.forEach(perm => {
        expect(viewerPerms).not.toContain(perm);
      });
    });

    it('should not grant admin permissions to user', () => {
      const userPerms = getRolePermissions('user');
      const adminOnlyPerms = [
        Permission.EDIT_INVOICE_DATA,
        Permission.CREATE_CATEGORY,
        Permission.UPDATE_CATEGORY,
        Permission.DELETE_CATEGORY,
        Permission.TRIGGER_MANUAL_SYNC,
        Permission.UPDATE_MERCHANT_SETTINGS
      ];

      adminOnlyPerms.forEach(perm => {
        expect(userPerms).not.toContain(perm);
      });
    });

    it('should handle all 18 defined permissions', () => {
      const allPermissions = Object.values(Permission);
      expect(allPermissions).toHaveLength(18);

      // Ensure each permission is handled by at least one role
      allPermissions.forEach(perm => {
        const hasAtLeastOneRole =
          hasPermission('viewer', perm) ||
          hasPermission('user', perm) ||
          hasPermission('admin', perm);

        expect(hasAtLeastOneRole).toBe(true);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('viewer should only read and export data', () => {
      const viewer = 'viewer';

      // Can view and export
      expect(hasPermission(viewer, Permission.VIEW_INVOICES)).toBe(true);
      expect(hasPermission(viewer, Permission.EXPORT_INVOICES)).toBe(true);

      // Cannot modify
      expect(hasPermission(viewer, Permission.UPDATE_INVOICE_STATUS)).toBe(false);
      expect(hasPermission(viewer, Permission.CREATE_CATEGORY)).toBe(false);
    });

    it('nurse (user) should manage daily operations but not categories', () => {
      const nurse = 'user';

      // Can do daily tasks
      expect(hasPermission(nurse, Permission.VIEW_INVOICES)).toBe(true);
      expect(hasPermission(nurse, Permission.UPDATE_INVOICE_STATUS)).toBe(true);
      expect(hasPermission(nurse, Permission.UPDATE_TRANSACTION_STATUS)).toBe(true);
      expect(hasPermission(nurse, Permission.UPDATE_MEMBERSHIP_STATUS)).toBe(true);

      // Cannot manage categories
      expect(hasPermission(nurse, Permission.CREATE_CATEGORY)).toBe(false);
      expect(hasPermission(nurse, Permission.DELETE_CATEGORY)).toBe(false);

      // Cannot trigger syncs
      expect(hasPermission(nurse, Permission.TRIGGER_MANUAL_SYNC)).toBe(false);
    });

    it('clinic admin should have full control', () => {
      const clinicAdmin = 'admin';

      // Can do everything
      expect(hasPermission(clinicAdmin, Permission.VIEW_INVOICES)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.UPDATE_INVOICE_STATUS)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.EDIT_INVOICE_DATA)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.CREATE_CATEGORY)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.UPDATE_CATEGORY)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.DELETE_CATEGORY)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.TRIGGER_MANUAL_SYNC)).toBe(true);
      expect(hasPermission(clinicAdmin, Permission.UPDATE_MERCHANT_SETTINGS)).toBe(true);
    });
  });
});
