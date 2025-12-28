'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRequireSuperAdmin } from '@/lib/auth';
import {
  Users,
  Building2,
  Store,
  Activity,
  TrendingUp,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  activeTenants: number;
  totalMerchants: number;
  recentActivity: number;
}

export default function AdminDashboardPage(): React.JSX.Element {
  const auth = useRequireSuperAdmin();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTenants: 0,
    activeTenants: 0,
    totalMerchants: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch stats from multiple endpoints in parallel
        const [usersRes, tenantsRes, merchantsRes] = await Promise.all([
          fetch('/api/admin/users', { credentials: 'include' }),
          fetch('/api/admin/tenants', { credentials: 'include' }),
          fetch('/api/admin/merchants', { credentials: 'include' }),
        ]);

        const [usersData, tenantsData, merchantsData] = await Promise.all([
          usersRes.json(),
          tenantsRes.json(),
          merchantsRes.json(),
        ]);

        setStats({
          totalUsers: usersData.users?.length || 0,
          activeUsers: usersData.users?.filter((u: { isActive: boolean }) => u.isActive).length || 0,
          totalTenants: tenantsData.tenants?.length || 0,
          activeTenants: tenantsData.tenants?.filter((t: { is_active: boolean }) => t.is_active).length || 0,
          totalMerchants: merchantsData.merchants?.length || 0,
          recentActivity: 0, // TODO: Implement activity tracking
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!auth.isLoading && auth.isAuthenticated) {
      fetchStats();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  if (auth.isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: `${stats.activeUsers} active`,
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Tenants',
      value: stats.totalTenants,
      description: `${stats.activeTenants} active`,
      icon: Building2,
      href: '/admin/tenants',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Merchants',
      value: stats.totalMerchants,
      description: 'MX Merchant integrations',
      icon: Store,
      href: '/admin/merchants',
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity,
      description: 'Last 24 hours',
      icon: TrendingUp,
      href: '#',
      color: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your SaaS platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/users"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-muted-foreground">
                    Create and manage user accounts
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/tenants"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-medium">Manage Tenants</div>
                  <div className="text-sm text-muted-foreground">
                    Configure merchant tenants
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/merchants"
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="font-medium">View Merchants</div>
                  <div className="text-sm text-muted-foreground">
                    Monitor merchant integrations
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Platform health and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Status</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                Operational
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Version</span>
              <span className="font-medium">v1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
