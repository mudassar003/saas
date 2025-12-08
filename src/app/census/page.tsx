'use client';

import { useState, useEffect } from 'react';
import { CensusTable } from '@/components/census/census-table';
import { CensusFilters } from '@/components/census/census-filters';
import { SyncDialog } from '@/components/sync/sync-dialog';
import { Pagination } from '@/components/ui/pagination';
import { getDateRange } from '@/lib/date-filters';

type TabKey = 'all' | 'trt' | 'weight_loss' | 'peptides' | 'ed' | 'cancellations';

interface TabConfig {
  key: TabKey;
  label: string;
  description: string;
}

// Patient census record type - following enterprise-grade typing standards
interface PatientCensusRecord {
  id: string;
  customer_name: string;
  product_name: string | null;
  product_category: string | null;
  membership_status: string;
  amount: number;
  last_payment_date: string;
  transaction_count: number;
  source: string | null;
  fulfillment_type: string | null;
  google_review_submitted: boolean | null;
  referral_source: string | null;
  ordered_by_provider: boolean | null;
  ordered_by_provider_at: string | null;
  created_at: string;
}

interface FilterState {
  search: string;
  category: string;
  membershipStatus: string;
  googleReview: string;
  referralSource: string;
  fulfillmentType: string;
  dateRange: string;
  activeTab: TabKey;
}

interface ApiResponse {
  success: boolean;
  data: {
    records: PatientCensusRecord[];
    recordCount: number;
    statistics: {
      total: number;
      byCategory: {
        TRT: number;
        'Weight Loss': number;
        Peptides: number;
        ED: number;
        Other: number;
        Uncategorized: number;
      };
      byMembershipStatus: {
        active: number;
        canceled: number;
        paused: number;
      };
      tabCounts: Record<TabKey, number>;
    };
  };
}

export default function CensusPage() {
  const [patients, setPatients] = useState<PatientCensusRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    membershipStatus: 'all',
    googleReview: 'all',
    referralSource: 'all',
    fulfillmentType: 'all',
    dateRange: 'all',
    activeTab: 'all'
  });

  // Tab configuration following transaction page pattern
  const tabs: TabConfig[] = [
    { key: 'all', label: 'All Active', description: 'All active recurring patients' },
    { key: 'trt', label: 'TRT', description: 'Testosterone therapy patients' },
    { key: 'weight_loss', label: 'Weight Loss', description: 'Weight management patients' },
    { key: 'peptides', label: 'Peptides', description: 'Peptide therapy patients' },
    { key: 'ed', label: 'ED', description: 'Erectile dysfunction patients' },
    { key: 'cancellations', label: 'Cancellations', description: 'Canceled or paused memberships' }
  ];
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(0);
  
  // Statistics state for patient census
  const [statistics, setStatistics] = useState({
    total: 0,
    byCategory: {
      TRT: 0,
      'Weight Loss': 0,
      Peptides: 0,
      ED: 0,
      Other: 0,
      Uncategorized: 0
    },
    byMembershipStatus: {
      active: 0,
      canceled: 0,
      paused: 0
    },
    tabCounts: {
      all: 0,
      trt: 0,
      weight_loss: 0,
      peptides: 0,
      ed: 0,
      cancellations: 0
    } as Record<TabKey, number>
  });


  // Load patient census data - optimized with proper error handling
  useEffect(() => {
    const loadPatientCensus = async (): Promise<void> => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('limit', pageSize.toString());
        params.append('offset', ((currentPage - 1) * pageSize).toString());
        
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.category !== 'all') {
          params.append('category', filters.category);
        }
        if (filters.membershipStatus !== 'all') {
          params.append('membershipStatus', filters.membershipStatus);
        }
        if (filters.googleReview !== 'all') {
          params.append('googleReview', filters.googleReview);
        }
        if (filters.referralSource !== 'all') {
          params.append('referralSource', filters.referralSource);
        }
        if (filters.fulfillmentType !== 'all') {
          params.append('fulfillmentType', filters.fulfillmentType);
        }
        
        const dateRange = getDateRange(filters.dateRange);
        if (dateRange.start) {
          params.append('dateStart', dateRange.start);
        }
        if (dateRange.end) {
          params.append('dateEnd', dateRange.end);
        }

        params.append('activeTab', filters.activeTab);
        
        const response = await fetch(`/api/census?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          setPatients(result.data.records);
          setTotalCount(result.data.recordCount);
          setTotalPages(Math.ceil(result.data.recordCount / pageSize));
          setStatistics(result.data.statistics);
        } else {
          console.error('API returned error:', result);
          setPatients([]);
        }
      } catch (error) {
        console.error('Error loading patient census:', error);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    loadPatientCensus();
  }, [filters, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);


  const handleSyncComplete = (): void => {
    // Refresh the census data after sync
    const currentFilters = filters;
    setFilters({ ...currentFilters }); // Triggers useEffect to reload data
  };

  const handleTabChange = (tabKey: TabKey): void => {
    setFilters(prevFilters => ({
      ...prevFilters,
      activeTab: tabKey,
      // Reset certain filters when switching tabs
      category: tabKey === 'all' || tabKey === 'cancellations' ? 'all' : 
               tabKey === 'trt' ? 'TRT' :
               tabKey === 'weight_loss' ? 'Weight Loss' :
               tabKey === 'peptides' ? 'Peptides' :
               tabKey === 'ed' ? 'ED' : 'all',
      membershipStatus: tabKey === 'cancellations' ? 'all' : 'active'
    }));
  };

  return (
    <div className="w-full">
      <div className="container mx-auto py-3 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Patient Census Dashboard
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                <span className="text-muted-foreground">Total Patients:</span>
                <span className="font-semibold text-foreground">{statistics.total}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-success/10 rounded border border-success/20">
                <span className="text-success">Active:</span>
                <span className="font-semibold text-success">
                  {statistics.byMembershipStatus.active}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-warning/10 rounded border border-warning/20">
                <span className="text-warning">Paused:</span>
                <span className="font-semibold text-warning">
                  {statistics.byMembershipStatus.paused}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-error/10 rounded border border-error/20">
                <span className="text-error">Canceled:</span>
                <span className="font-semibold text-error">
                  {statistics.byMembershipStatus.canceled}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SyncDialog onSyncComplete={handleSyncComplete} />
          </div>
        </div>

        {/* Tab Navigation - Following transaction page pattern */}
        <div className="bg-card border-b border-border mb-4">
          <div className="flex items-center">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200
                  ${filters.activeTab === tab.key
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
                title={tab.description}
              >
                {tab.label}
                {statistics.tabCounts[tab.key] > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                    {statistics.tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <CensusFilters
            onFiltersChange={setFilters}
            resultsCount={patients.length}
            totalCount={totalCount}
            statistics={statistics}
            activeTab={filters.activeTab}
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <CensusTable
          patients={patients}
          loading={loading}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6">
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