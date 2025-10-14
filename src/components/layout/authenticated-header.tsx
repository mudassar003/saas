'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CategoryManagementDialog } from '@/components/categories/category-management-dialog';
import { LogOut, User, Tag } from 'lucide-react';

export function AuthenticatedHeader() {
  const { user, logout, isAuthenticated, isSuperAdmin, isLoading } = useAuth();
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">Automation Dashboard</h1>
        </div>
        <ThemeToggle />
      </header>
    );
  }

  if (!isAuthenticated) {
    return (
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">Automation Dashboard</h1>
        </div>
        <ThemeToggle />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold">Automation Dashboard</h1>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Invoices
          </Link>
          <Link
            href="/transactions"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Transactions
          </Link>
          <Link
            href="/census"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Census
          </Link>
          {isSuperAdmin && (
            <>
              <Link
                href="/admin/users"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/merchants"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Merchants
              </Link>
              <Link
                href="/admin/tenants"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Tenants
              </Link>
            </>
          )}
          {/* Categories button for ALL authenticated users (tenant users and super admin) */}
          <button
            onClick={() => setCategoriesDialogOpen(true)}
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <Tag className="h-3.5 w-3.5" />
            Categories
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          <span>{user?.user.email}</span>
          {isSuperAdmin && (
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
              Admin
            </span>
          )}
        </div>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Category Management Dialog */}
      <CategoryManagementDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      />
    </header>
  );
}