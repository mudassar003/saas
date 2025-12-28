import { useState, useEffect, useRef } from 'react';
import {
  ColumnDef,
  VisibilityState,
  SortingState,
  ColumnSizingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface UseAdminTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  storageKey: string;
  enableSorting?: boolean;
  enableColumnResizing?: boolean;
}

interface UseAdminTableReturn<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  columnVisibility: VisibilityState;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
  columnSizing: ColumnSizingState;
  sorting: SortingState;
  showLeftShadow: boolean;
  showRightShadow: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function useAdminTable<TData>({
  data,
  columns,
  storageKey,
  enableSorting = true,
  enableColumnResizing = true,
}: UseAdminTableOptions<TData>): UseAdminTableReturn<TData> {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { visibility, sizing, sorting: savedSorting } = JSON.parse(saved);
        if (visibility) setColumnVisibility(visibility);
        if (sizing) setColumnSizing(sizing);
        if (savedSorting && enableSorting) setSorting(savedSorting);
      }
    } catch (error) {
      console.error(`Failed to load ${storageKey} preferences:`, error);
    }
  }, [storageKey, enableSorting]);

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          visibility: columnVisibility,
          sizing: columnSizing,
          sorting: enableSorting ? sorting : undefined,
        })
      );
    } catch (error) {
      console.error(`Failed to save ${storageKey} preferences:`, error);
    }
  }, [columnVisibility, columnSizing, sorting, storageKey, enableSorting]);

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    enableColumnResizing,
    columnResizeMode: 'onChange',
    state: {
      columnVisibility,
      columnSizing,
      sorting: enableSorting ? sorting : undefined,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: enableSorting ? setSorting : undefined,
  });

  // Handle scroll indicators
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      container.scrollLeft -= scrollAmount;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      container.scrollLeft += scrollAmount;
    }
  };

  return {
    table,
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    sorting,
    showLeftShadow,
    showRightShadow,
    scrollContainerRef,
    handleScroll,
    handleKeyDown,
  };
}
