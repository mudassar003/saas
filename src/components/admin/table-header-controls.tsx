import { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableHeaderControlsProps<TData> {
  table: Table<TData>;
  recordCount: number;
  recordLabel?: string;
  children?: React.ReactNode;
}

export function TableHeaderControls<TData>({
  table,
  recordCount,
  recordLabel = 'record',
  children,
}: TableHeaderControlsProps<TData>) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm text-muted-foreground">
        Showing {recordCount} {recordLabel}
        {recordCount !== 1 ? 's' : ''}
      </div>

      <div className="flex items-center gap-2">
        {children}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {table.getAllLeafColumns().map((column) => {
                const columnName = typeof column.columnDef.header === 'string'
                  ? column.columnDef.header
                  : column.id;

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {columnName}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
