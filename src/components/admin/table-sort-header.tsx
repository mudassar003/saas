import { Column } from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface TableSortHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  children: React.ReactNode;
}

export function TableSortHeader<TData, TValue>({
  column,
  children,
}: TableSortHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <>{children}</>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      className="flex items-center gap-2 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}
