'use client';

import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppBar() {
  const { user, logout, isSuperAdmin } = useAuth();

  if (!user) {
    return null;
  }

  // Get initials from email
  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Get user role display name
  const getUserRole = () => {
    if (user.user.role === 'super_admin') {
      return 'Super Admin';
    }

    // For tenant users, get their role from tenantAccess
    if (user.user.role === 'tenant_user' && user.currentMerchantId) {
      const currentTenant = user.tenantAccess.find(
        (access) => access.merchantId === user.currentMerchantId
      );

      if (currentTenant) {
        switch (currentTenant.tenantRole) {
          case 'admin':
            return 'Admin (Full Control)';
          case 'user':
            return 'User (Standard Access)';
          case 'viewer':
            return 'Viewer (Read Only)';
          default:
            return 'Tenant User';
        }
      }
    }

    return 'Tenant User';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Breadcrumbs - Left side */}
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 hover:bg-accent"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials(user.user.email)}
              </div>

              {/* User info - hidden on mobile */}
              <div className="hidden md:flex flex-col items-start text-sm">
                <span className="font-medium">{user.user.email.split('@')[0]}</span>
                <span className="text-xs text-muted-foreground">{getUserRole()}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.user.email.split('@')[0]}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground font-medium mt-1">
                  {getUserRole()}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
