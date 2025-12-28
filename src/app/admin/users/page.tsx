'use client';

import { useState, useEffect } from 'react';
import { UserTable } from '@/components/admin/user-table';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useRequireSuperAdmin } from '@/lib/auth';
import { User, UserWithPassword } from '@/lib/auth/types';
import { Plus } from 'lucide-react';

interface UsersApiResponse {
  success: boolean;
  users?: UserWithPassword[];
  error?: string;
}

export default function AdminUsersPage(): React.JSX.Element {
  const auth = useRequireSuperAdmin();
  const [users, setUsers] = useState<UserWithPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', {
        credentials: 'include',
      });

      const result: UsersApiResponse = await response.json();

      if (!result.success || !result.users) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setUsers(result.users);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = (newUser: User): void => {
    // Convert User to UserWithPassword for consistency
    const userWithPassword: UserWithPassword = {
      ...newUser,
      passwordHash: '[NEWLY_CREATED]', // Placeholder for newly created users
      originalPassword: '[NEWLY_CREATED]' // Placeholder for newly created users
    };
    setUsers(prevUsers => [userWithPassword, ...prevUsers]);
    setCreateDialogOpen(false);
  };

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      fetchUsers();
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header Section - Separate Div */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage system users and their permissions
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert variant="destructive">
            {error}
          </Alert>
        </div>
      )}

      {/* Table Section - Separate Div */}
      <div>
        <UserTable
          users={users}
          loading={loading}
          onRefresh={fetchUsers}
        />
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={handleUserCreated}
      />
    </>
  );
}