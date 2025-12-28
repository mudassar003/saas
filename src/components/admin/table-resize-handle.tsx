import { Header } from '@tanstack/react-table';
import { GripVertical } from 'lucide-react';

interface TableResizeHandleProps<TData> {
  header: Header<TData, unknown>;
}

export function TableResizeHandle<TData>({ header }: TableResizeHandleProps<TData>) {
  return (
    <div
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      className={`
        absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none
        hover:bg-primary/20 dark:hover:bg-primary/30
        ${header.column.getIsResizing() ? 'bg-primary/30 dark:bg-primary/40' : ''}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {header.column.getIsResizing() && (
        <GripVertical className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
      )}
    </div>
  );
}
