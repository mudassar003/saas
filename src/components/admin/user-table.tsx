'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, EyeOff, Copy, Check, RotateCcw } from 'lucide-react';
import { UserWithPassword } from '@/lib/auth/types';
import { formatDateTime } from '@/lib/utils';

interface UserTableProps {
  users: UserWithPassword[];
  loading: boolean;
  onRefresh: () => void;
}

export function UserTable({ users, loading, onRefresh }: UserTableProps): React.JSX.Element {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedPasswords, setCopiedPasswords] = useState<Set<string>>(new Set());
  const [resettingPasswords, setResettingPasswords] = useState<Set<string>>(new Set());

  const getRoleBadgeVariant = (role: UserWithPassword['role']): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'tenant_user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): 'default' | 'destructive' | 'outline' | 'secondary' => {
    return isActive ? 'default' : 'outline';
  };

  const togglePasswordVisibility = (userId: string): void => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const copyPasswordHash = async (userId: string, password: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPasswords(prev => new Set(prev).add(userId));

      // Remove copied state after 2 seconds
      setTimeout(() => {
        setCopiedPasswords(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const resetUserPassword = async (userId: string): Promise<void> => {
    try {
      setResettingPasswords(prev => new Set(prev).add(userId));

      const newPassword = prompt('Enter new password:');
      if (!newPassword) {
        setResettingPasswords(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        return;
      }

      if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        setResettingPasswords(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error || 'Failed to reset password');
      } else {
        alert('Password reset successfully');
        onRefresh(); // Refresh the user list to get updated data
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert('Failed to reset password');
    } finally {
      setResettingPasswords(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const maskPasswordHash = (password: string): string => {
    if (password === '[PASSWORD_NOT_SET]') return password;
    return '••••••••••••••••••••••••••••••••••••••••••••••••••••';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading users...
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No users found</p>
        <Button
          variant="outline"
          onClick={onRefresh}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.firstName || user.lastName
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role === 'super_admin' ? 'Super Admin' : 'Tenant User'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.isActive)}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 max-w-xs">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                      {visiblePasswords.has(user.id) ? user.originalPassword : maskPasswordHash(user.originalPassword)}
                    </code>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="h-6 w-6 p-0"
                      >
                        {visiblePasswords.has(user.id) ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      {user.originalPassword !== '[PASSWORD_NOT_SET]' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyPasswordHash(user.id, user.originalPassword)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedPasswords.has(user.id) ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetUserPassword(user.id)}
                        disabled={resettingPasswords.has(user.id)}
                        className="h-6 w-6 p-0"
                      >
                        <RotateCcw className={`h-3 w-3 ${resettingPasswords.has(user.id) ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.lastLoginAt
                    ? formatDateTime(user.lastLoginAt)
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  {formatDateTime(user.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}