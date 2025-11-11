'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show breadcrumbs on home/login pages
  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  // Split the pathname into segments
  const segments = pathname.split('/').filter(Boolean);

  // Map of paths to friendly names
  const pathNames: Record<string, string> = {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    contracts: 'Contracts',
    revenue: 'Revenue',
    census: 'Census',
    admin: 'Administration',
    users: 'Users',
    merchants: 'Merchants',
    tenants: 'Tenants',
    categories: 'Categories',
    settings: 'Settings',
    invoices: 'Invoices',
  };

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = pathNames[segment] || segment;
    const isLast = index === segments.length - 1;

    // Check if segment is an ID (number)
    const isId = /^\d+$/.test(segment);

    return {
      href,
      label: isId ? `#${segment}` : label,
      isLast,
      isId,
    };
  });

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {/* Home link */}
      <Link
        href="/transactions"
        className="flex items-center hover:text-foreground transition-colors"
        title="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                'hover:text-foreground transition-colors',
                crumb.isId && 'font-mono text-xs'
              )}
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
