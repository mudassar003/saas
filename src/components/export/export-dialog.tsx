'use client';

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ExportOptions } from '@/types/invoice';

interface ExportDialogProps {
  invoices: unknown[];
  onExport: (options: ExportOptions) => void;
}

export function ExportDialog({ invoices, onExport }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    include_products: false,
    export_scope: 'filtered', // 'filtered' or 'all'
    date_range: {
      from: '',
      to: ''
    }
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Always call the main export function
      await onExport(exportOptions);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
          <DialogDescription>
            Export invoices to Excel or CSV format with custom date range and options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Scope Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Scope</label>
            <Select 
              value={exportOptions.export_scope} 
              onValueChange={(value: 'filtered' | 'all') => 
                setExportOptions(prev => ({ ...prev, export_scope: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filtered">
                  <div className="flex items-center gap-2">
                    <span>Current view ({invoices.length} invoices)</span>
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>All invoices (with date range)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Selection (when export_scope is 'all') */}
          {exportOptions.export_scope === 'all' && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">From Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={exportOptions.date_range?.from || ''}
                      onChange={(e) => 
                        setExportOptions(prev => ({ 
                          ...prev, 
                          date_range: { 
                            ...prev.date_range, 
                            from: e.target.value 
                          } 
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">To Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={exportOptions.date_range?.to || ''}
                      onChange={(e) => 
                        setExportOptions(prev => ({ 
                          ...prev, 
                          date_range: { 
                            ...prev.date_range, 
                            to: e.target.value 
                          } 
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to export all invoices from the beginning or to the current date.
              </p>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value: 'excel' | 'csv') => 
                setExportOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Products Option */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Additional Options</label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-products"
                checked={exportOptions.include_products}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, include_products: checked as boolean }))
                }
              />
              <label htmlFor="include-products" className="text-sm">
                Include product details
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {exportOptions.include_products 
                ? "⚠️ This will be slower as it requires additional API calls to get product details."
                : "Export will include basic invoice data only (fast)."
              }
            </p>
          </div>

          {/* Export Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export will include:</label>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <div className="grid grid-cols-2 gap-1">
                <span>• Invoice ID</span>
                <span>• Invoice Number</span>
                <span>• Customer Name</span>
                <span>• Status</span>
                <span>• Amount</span>
                <span>• Date</span>
                <span>• Data Sent Status</span>
                <span>• Internal Link</span>
                {exportOptions.include_products && (
                  <span className="col-span-2 text-orange-600">• Product Details</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}