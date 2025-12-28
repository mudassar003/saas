'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Store,
  ChevronLeft,
  Menu,
  Shield,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview and metrics',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management',
  },
  {
    title: 'Tenants',
    href: '/admin/tenants',
    icon: Building2,
    description: 'Tenant configuration',
  },
  {
    title: 'Merchants',
    href: '/admin/merchants',
    icon: Store,
    description: 'Merchant integrations',
  },
  {
    title: 'Activity',
    href: '/admin/activity',
    icon: Activity,
    description: 'Activity logs',
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Admin Panel</span>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden lg:block fixed top-0 left-0 z-30 h-screen border-r bg-card transition-all duration-300',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">Admin Panel</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
            >
              <ChevronLeft
                className={cn(
                  'h-4 w-4 transition-transform',
                  collapsed && 'rotate-180'
                )}
              />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    'hover:bg-muted dark:hover:bg-muted/50',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={cn('h-4 w-4', collapsed ? 'h-5 w-5' : '')} />
                  {!collapsed && (
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div
                        className={cn(
                          'text-xs',
                          isActive
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
            <Link
              href="/"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-muted dark:hover:bg-muted/50',
                collapsed && 'justify-center'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              {!collapsed && <span>Back to App</span>}
            </Link>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="lg:hidden fixed top-0 left-0 z-50 h-screen w-64 border-r bg-card">
              <div className="flex h-16 items-center justify-between px-4 border-b">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Admin Panel</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              <nav className="p-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        'hover:bg-muted dark:hover:bg-muted/50',
                        isActive && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div
                          className={cn(
                            'text-xs',
                            isActive
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          )}
                        >
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
                <Link
                  href="/"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted dark:hover:bg-muted/50"
                  onClick={() => setMobileOpen(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to App</span>
                </Link>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 transition-all duration-300',
            'lg:ml-64',
            collapsed && 'lg:ml-16'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
