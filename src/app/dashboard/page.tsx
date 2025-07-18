'use client';

import { useState, useEffect } from 'react';
import { InvoiceTable } from '@/components/invoice/invoice-table';
import { InvoiceFilters } from '@/components/invoice/invoice-filters';
import { ExportDialog } from '@/components/export/export-dialog';
import { SyncDialog } from '@/components/sync/sync-dialog';
import { Pagination } from '@/components/ui/pagination';
import { Invoice, DataSentUpdate, ExportOptions } from '@/types/invoice';
interface FilterState {
  search: string;
  status: string;
  dataSent: string;
  dateRange: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    records: Invoice[];
    recordCount: number;
    totals: {
      grandTotalAmount: string;
    };
    statistics: {
      total: number;
      dataSent: number;
      dataNotSent: number;
      pending: number;
    };
  };
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [, setGrandTotal] = useState('0');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    dataSent: 'all',
    dateRange: 'all'
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    total: 0,
    dataSent: 0,
    dataNotSent: 0,
    pending: 0
  });

  // Convert date range filter to actual dates
  const getDateRange = (dateRange: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return {
          start: yearStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      default:
        return { start: undefined, end: undefined };
    }
  };

  // Load invoices from API
  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('limit', pageSize.toString());
        params.append('offset', ((currentPage - 1) * pageSize).toString());
        
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.status !== 'all') {
          params.append('status', filters.status);
        }
        if (filters.dataSent !== 'all') {
          params.append('dataSentStatus', filters.dataSent);
        }
        
        // Add date range filtering
        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.start) {
          params.append('dateStart', dateRange.start);
        }
        if (dateRange.end) {
          params.append('dateEnd', dateRange.end);
        }
        
        // Make API call
        const response = await fetch(`/api/invoices?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          setInvoices(result.data.records);
          setTotalCount(result.data.recordCount);
          setTotalPages(Math.ceil(result.data.recordCount / pageSize));
          setGrandTotal(result.data.totals.grandTotalAmount);
          setStatistics(result.data.statistics);
        } else {
          console.error('API returned error:', result);
        }
      } catch (error) {
        console.error('Error loading invoices:', error);
        // Fallback to empty array on error
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [filters, currentPage, pageSize]); // Reload when filters or pagination change

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Since we're filtering on the server, just use the invoices directly
  const filteredInvoices = invoices;

  const handleUpdateDataSent = async (update: DataSentUpdate) => {
    try {
      // Make API call to update data sent status
      const response = await fetch(`/api/invoices/${update.invoice_id}/data-sent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: update.status,
          notes: update.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update data sent status');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Dashboard - API response data:', result.data);
        console.log('Dashboard - ordered_by_provider_at from API:', result.data.ordered_by_provider_at);
        
        // Update local state with the response data
        setInvoices(prev => prev.map(invoice => 
          invoice.id === update.invoice_id 
            ? { 
                ...invoice, 
                data_sent_status: result.data.data_sent_status,
                data_sent_at: result.data.data_sent_at,
                data_sent_by: result.data.data_sent_by,
                data_sent_notes: result.data.data_sent_notes,
                ordered_by_provider_at: result.data.ordered_by_provider_at
              }
            : invoice
        ));
      } else {
        console.error('API returned error:', result);
      }
    } catch (error) {
      console.error('Error updating data sent status:', error);
      // Could add toast notification here
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    // Find the invoice to get mx_invoice_id
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      // Navigate to invoice detail page using mx_invoice_id
      window.location.href = `/dashboard/invoices/${invoice.mx_invoice_id}`;
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      console.log('Export options:', options);
      
      // Determine the API endpoint
      const endpoint = options.format === 'excel' ? '/api/export/excel' : '/api/export/csv';
      
      // Prepare export filters based on export scope
      let exportFilters = {};
      
      if (options.export_scope === 'filtered') {
        // Use current dashboard filters
        const dateRange = getDateRange(filters.dateRange);
        exportFilters = {
          search: filters.search,
          status: filters.status,
          dataSentStatus: filters.dataSent,
          dateStart: dateRange.start,
          dateEnd: dateRange.end
        };
      } else {
        // Use only date range from export dialog
        exportFilters = {
          search: '',
          status: 'all',
          dataSentStatus: 'all',
          dateStart: options.date_range?.from || '',
          dateEnd: options.date_range?.to || ''
        };
      }
      
      console.log('Export filters:', exportFilters);
      
      // Make the export request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeProducts: options.include_products,
          exportScope: options.export_scope,
          filters: exportFilters
        })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export API error:', errorText);
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }
      
      // Get the file content
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Export returned empty file');
      }
      
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `GameDay_Invoices_${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Export completed successfully');
      
    } catch (error) {
      console.error('Export error:', error);
      throw error; // Re-throw to be caught by the export dialog
    }
  };

  const handleSyncComplete = () => {
    // Refresh the invoice data after sync
    const currentFilters = filters;
    setFilters({ ...currentFilters }); // This will trigger the useEffect to reload data
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Invoice Management</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Not Selected:</span>
              <span className="font-semibold text-gray-600">
                {statistics.pending}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Data Sent:</span>
              <span className="font-semibold text-green-600">
                {statistics.dataSent}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Not Sent:</span>
              <span className="font-semibold text-red-600">
                {statistics.dataNotSent}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncDialog onSyncComplete={handleSyncComplete} />
          <ExportDialog 
            invoices={filteredInvoices} 
            onExport={handleExport}
          />
        </div>
      </div>

      <div className="space-y-3">
        <InvoiceFilters
          onFiltersChange={setFilters}
          resultsCount={invoices.length}
          totalCount={totalCount}
        />

        <InvoiceTable
          invoices={filteredInvoices}
          onUpdateDataSent={handleUpdateDataSent}
          onViewInvoice={handleViewInvoice}
          loading={loading}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          className="mt-4"
        />
      </div>
    </div>
  );
}