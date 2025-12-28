'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function User1Page() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User1 Test Page</h1>
          <p className="text-muted-foreground mt-2">
            Simple test page to debug layout issues
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Simple Table */}
      <div className="border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-3">John Doe</td>
              <td className="px-4 py-3">john@example.com</td>
              <td className="px-4 py-3">Admin</td>
              <td className="px-4 py-3">Active</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3">Jane Smith</td>
              <td className="px-4 py-3">jane@example.com</td>
              <td className="px-4 py-3">User</td>
              <td className="px-4 py-3">Active</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-3">Bob Johnson</td>
              <td className="px-4 py-3">bob@example.com</td>
              <td className="px-4 py-3">Viewer</td>
              <td className="px-4 py-3">Inactive</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Debug Info */}
      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded">
        <p className="font-mono text-sm">
          <strong>Debug Info:</strong><br/>
          - This is a simple HTML table<br/>
          - No complex components<br/>
          - Just header + table + this debug box<br/>
          - If this looks wrong, the issue is in the layout
        </p>
      </div>
    </div>
  );
}
