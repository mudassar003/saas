'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { AppBar } from './app-bar';
import { useAuth } from '@/lib/auth';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client before rendering auth-dependent UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pages that should not have the app shell (sidebar + app bar)
  const publicPages = ['/login', '/signup', '/forgot-password'];
  const isPublicPage = publicPages.includes(pathname);

  // Don't show app shell on public pages
  if (isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading state while:
  // 1. Component hasn't mounted on client yet (prevents hydration mismatch)
  // 2. Auth is being checked
  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* App Bar */}
        <AppBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-surface p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
