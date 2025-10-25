'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractDetailCard } from '@/components/contract/contract-detail-card';
import { ContractPaymentHistory } from '@/components/contract/contract-payment-history';
import { Contract } from '@/types/contract';

interface ContractDetailResponse {
  success: boolean;
  data: {
    contract: Contract;
    source: 'database' | 'api';
  };
}

export default function ContractDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const contractId = parseInt(resolvedParams.id);

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contract details
  const loadContract = async (fetchFresh: boolean = false) => {
    if (fetchFresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (fetchFresh) params.append('fetchFresh', 'true');

      const response = await fetch(
        `/api/contracts/${contractId}${params.toString() ? `?${params.toString()}` : ''}`
      );

      if (!response.ok) {
        throw new Error('Failed to load contract');
      }

      const result: ContractDetailResponse = await response.json();

      if (result.success) {
        setContract(result.data.contract as Contract);
        setError(null);
      } else {
        setError('Failed to load contract details');
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const handleRefresh = () => {
    loadContract(true);
  };

  const handleBack = () => {
    window.location.href = '/contracts';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="container mx-auto py-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-lg text-muted-foreground">{error || 'Contract not found'}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Contract #{contract.contract_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {contract.customer_name}
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Baseball Card Design - Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Baseball Card - Takes 1 column */}
        <div className="lg:col-span-1">
          <ContractDetailCard contract={contract} />
        </div>

        {/* Payment History - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ContractPaymentHistory contractId={contract.mx_contract_id} />
        </div>
      </div>
    </div>
  );
}
