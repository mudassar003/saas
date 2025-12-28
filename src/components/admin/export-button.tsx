import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportColumn, exportToCSV } from '@/lib/export-utils';

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  disabled = false,
}: ExportButtonProps<T>) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    try {
      setExporting(true);
      exportToCSV(data, columns, filename);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || exporting || data.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
