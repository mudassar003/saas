'use client';

import { useMemo, useState } from 'react';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, EyeOff, Copy, Check, RotateCcw } from 'lucide-react';
import { UserWithPassword } from '@/lib/auth/types';
import { formatDateTime } from '@/lib/utils';
import { useAdminTable } from '@/hooks/use-admin-table';
import { TableHeaderControls } from './table-header-controls';
import { TableResizeHandle } from './table-resize-handle';
import { TableSortHeader } from './table-sort-header';
import { ExportButton } from './export-button';
import { ExportColumn, formatters } from '@/lib/export-utils';

interface UserTableProps {
  users: UserWithPassword[];
  loading: boolean;
  onRefresh: () => void;
}

const STORAGE_KEY = 'admin-user-table-preferences';

export function UserTable({ users, loading, onRefresh }: UserTableProps): React.JSX.Element {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedPasswords, setCopiedPasswords] = useState<Set<string>>(new Set());
  const [resettingPasswords, setResettingPasswords] = useState<Set<string>>(new Set());

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
        onRefresh();
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

  // Define columns
  const columns = useMemo<ColumnDef<UserWithPassword>[]>(
    () => [
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        size: 250,
        minSize: 200,
        maxSize: 350,
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'name',
        accessorFn: (row) =>
          row.firstName || row.lastName
            ? `${row.firstName || ''} ${row.lastName || ''}`.trim()
            : '-',
        header: 'Name',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Role',
        size: 150,
        minSize: 120,
        maxSize: 200,
        cell: ({ getValue }) => {
          const role = getValue() as UserWithPassword['role'];
          const variant = role === 'super_admin' ? 'destructive' : 'secondary';
          const label = role === 'super_admin' ? 'Super Admin' : 'Tenant User';

          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        id: 'is_active',
        accessorKey: 'isActive',
        header: 'Status',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ getValue }) => {
          const isActive = getValue() as boolean;
          return (
            <Badge variant={isActive ? 'default' : 'outline'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        id: 'password',
        accessorKey: 'originalPassword',
        header: 'Password',
        size: 280,
        minSize: 250,
        maxSize: 350,
        enableSorting: false,
        cell: ({ row, getValue }) => {
          const userId = row.original.id;
          const password = getValue() as string;
          const isVisible = visiblePasswords.has(userId);
          const isCopied = copiedPasswords.has(userId);
          const isResetting = resettingPasswords.has(userId);

          return (
            <div className="flex items-center gap-2 max-w-xs">
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                {isVisible ? password : maskPasswordHash(password)}
              </code>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePasswordVisibility(userId)}
                  className="h-6 w-6 p-0"
                  title={isVisible ? 'Hide password' : 'Show password'}
                >
                  {isVisible ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
                {password !== '[PASSWORD_NOT_SET]' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPasswordHash(userId, password)}
                    className="h-6 w-6 p-0"
                    title="Copy password"
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetUserPassword(userId)}
                  disabled={isResetting}
                  className="h-6 w-6 p-0"
                  title="Reset password"
                >
                  <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          );
        },
      },
      {
        id: 'last_login',
        accessorKey: 'lastLoginAt',
        header: 'Last Login',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          return (
            <span className="text-sm text-muted-foreground">
              {value ? formatDateTime(value) : 'Never'}
            </span>
          );
        },
      },
      {
        id: 'created_at',
        accessorKey: 'createdAt',
        header: 'Created',
        size: 180,
        minSize: 150,
        maxSize: 250,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
    ],
    [visiblePasswords, copiedPasswords, resettingPasswords]
  );

  // Use admin table hook
  const {
    table,
    showLeftShadow,
    showRightShadow,
    scrollContainerRef,
    handleScroll,
    handleKeyDown,
  } = useAdminTable({
    data: users,
    columns,
    storageKey: STORAGE_KEY,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
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

  // Export columns definition (exclude password for security)
  const exportColumns: ExportColumn<UserWithPassword>[] = [
    { header: 'Email', accessor: 'email' },
    {
      header: 'Name',
      accessor: (row) =>
        row.firstName || row.lastName
          ? `${row.firstName || ''} ${row.lastName || ''}`.trim()
          : '-',
    },
    {
      header: 'Role',
      accessor: (row) => (row.role === 'super_admin' ? 'Super Admin' : 'Tenant User'),
    },
    { header: 'Status', accessor: (row) => (row.isActive ? 'Active' : 'Inactive') },
    { header: 'Last Login', accessor: 'lastLoginAt', formatter: formatters.dateTime },
    { header: 'Created', accessor: 'createdAt', formatter: formatters.dateTime },
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <TableHeaderControls
        table={table}
        recordCount={users.length}
        recordLabel="user"
      >
        <ExportButton data={users} columns={exportColumns} filename="users" />
      </TableHeaderControls>

      {/* Table Container */}
      <div className="relative border rounded-lg overflow-hidden">
        {/* Scroll Shadows */}
        {showLeftShadow && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
        )}
        {showRightShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
        )}

        {/* Scrollable Table */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="overflow-x-auto focus:outline-none"
          style={{
            maxHeight: '70vh',
            willChange: 'scroll-position',
          }}
        >
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="sticky top-0 z-20 bg-muted shadow-sm border-r border-border/50 last:border-r-0 px-4 py-3 text-left text-sm font-semibold text-muted-foreground"
                      style={{
                        width: header.getSize(),
                        position: 'relative',
                        willChange: 'transform',
                        transform: 'translateZ(0)',
                        contain: 'layout style paint',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <TableSortHeader column={header.column}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableSortHeader>
                      </div>
                      {header.column.getCanResize() && (
                        <TableResizeHandle header={header} />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody style={{ contain: 'layout style paint' }}>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-r border-border/30 last:border-r-0 px-4 py-3 text-sm"
                      style={{
                        width: cell.column.getSize(),
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
