'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut, User } from 'lucide-react';

export function AuthenticatedHeader() {
  const { user, logout, isAuthenticated, isSuperAdmin } = useAuth();

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
            </>
          )}
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
    </header>
  );
}