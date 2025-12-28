'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CreditCard,
  FileText,
  TrendingUp,
  Users,
  User,
  Store,
  Building2,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { CategoryManagementDialog } from '@/components/categories/category-management-dialog';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();

  // Main navigation items
  const mainNavigation: NavGroup = {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
      { label: 'Transactions', href: '/transactions', icon: CreditCard },
      { label: 'Contracts', href: '/contracts', icon: FileText },
      { label: 'Revenue', href: '/revenue', icon: TrendingUp },
      { label: 'Census', href: '/census', icon: Users },
    ],
  };

  // Admin navigation items (only visible for super admin)
  const adminNavigation: NavGroup = {
    title: 'Administration',
    items: [
      { label: 'Users', href: '/admin/users', icon: User },
      { label: 'Merchants', href: '/admin/merchants', icon: Store },
      { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
      { label: 'Activity', href: '/admin/activity', icon: Activity },
    ],
  };

  // Settings navigation (no Categories here, it's a dialog button)
  const settingsNavigation: NavItem[] = [
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] transition-all duration-300 ease-in-out border-r border-[hsl(var(--border))]',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand Section */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-[hsl(var(--border))]">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-accent))]">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">SaaS</span>
              </Link>
            )}
            {collapsed && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-accent))] mx-auto">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            )}
          </div>

          {/* Navigation Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin py-4">
            {/* Main Navigation */}
            <NavSection
              title={mainNavigation.title}
              items={mainNavigation.items}
              collapsed={collapsed}
              isActiveLink={isActiveLink}
            />

            {/* Admin Navigation (only for super admin) */}
            {isSuperAdmin && (
              <NavSection
                title={adminNavigation.title}
                items={adminNavigation.items}
                collapsed={collapsed}
                isActiveLink={isActiveLink}
              />
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="border-t border-[hsl(var(--border))] p-2 space-y-1">
            {/* Categories Button */}
            <button
              onClick={() => setCategoriesDialogOpen(true)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                'text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[hsl(var(--sidebar-accent))]/10 hover:text-[hsl(var(--sidebar-accent))]',
                collapsed && 'justify-center'
              )}
              title={collapsed ? 'Categories' : undefined}
            >
              <Tag className={cn('h-5 w-5 flex-shrink-0', collapsed && 'h-6 w-6')} />
              {!collapsed && <span>Categories</span>}
            </button>

            {/* Settings Link */}
            {settingsNavigation.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isActiveLink(item.href)}
              />
            ))}
          </div>

          {/* Collapse Toggle Button */}
          <div className="border-t border-[hsl(var(--border))] p-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium transition-colors',
                'hover:bg-[hsl(var(--sidebar-accent))]/10 hover:text-[hsl(var(--sidebar-accent))]'
              )}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Categories Management Dialog */}
      <CategoryManagementDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      />

      {/* Spacer to prevent content from going under sidebar */}
      <div className={cn('transition-all duration-300', collapsed ? 'w-16' : 'w-64')} />
    </>
  );
}

interface NavSectionProps {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  isActiveLink: (href: string) => boolean;
}

function NavSection({ title, items, collapsed, isActiveLink }: NavSectionProps) {
  return (
    <div className="mb-6 px-2">
      {!collapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--sidebar-muted))]">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={isActiveLink(item.href)}
          />
        ))}
      </nav>
    </div>
  );
}

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

function NavLink({ item, collapsed, isActive }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-[hsl(var(--sidebar-accent))] text-white shadow-md'
          : 'text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[hsl(var(--sidebar-accent))]/10 hover:text-[hsl(var(--sidebar-accent))]',
        collapsed && 'justify-center'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', collapsed && 'h-6 w-6')} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}
