import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils';
import { Contract } from '@/types/contract';
import { ProjectionResponse } from '@/types/contract';
import {
  calculateTotalMRR,
  calculateProjectedRevenue,
  getDailyProjections,
  parseDateRange
} from '@/lib/revenue-calculations';

/**
 * POST /api/revenue/projection/generate
 * Generate revenue projection report from database (instant, no API calls)
 *
 * This endpoint:
 * 1. Queries contracts from local database (fast)
 * 2. Queries transactions for current revenue metrics
 * 3. Calculates projected revenue based on next_bill_date
 * 4. Returns comprehensive ProjectionResponse
 *
 * @security Requires authentication - uses getCurrentMerchantId for tenant isolation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // CRITICAL SECURITY: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request);

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant ID not found. Please ensure you are logged in.'
        },
        { status: 401 }
      );
    }

    console.log('[Revenue Projection] Generating report for merchant:', merchantId);

    // Parse request body for date range
    const body = await request.json().catch(() => ({}));
    const preset = body.preset as '7days' | '30days' | '90days' | null;
    const customStart = body.startDate as string | undefined;
    const customEnd = body.endDate as string | undefined;

    // Parse date range (defaults to 30 days if not specified)
    const { startDate, endDate, days } = parseDateRange(preset, customStart, customEnd);

    console.log('[Revenue Projection] Date range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days
    });

    // Fetch ALL active contracts from database
    let contractsQuery = supabaseAdmin
      .from('contracts')
      .select('*')
      .order('next_bill_date', { ascending: true });

    // Apply merchant filtering
    contractsQuery = applyMerchantFilter(contractsQuery, merchantId);

    const { data: contracts, error: contractsError } = await contractsQuery;

    if (contractsError) {
      console.error('[Revenue Projection] Error fetching contracts:', contractsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch contracts from database'
        },
        { status: 500 }
      );
    }

    const allContracts = (contracts || []) as Contract[];
    console.log(`[Revenue Projection] Fetched ${allContracts.length} contracts from database`);

    // Get last sync time from most recently updated contract
    const lastSyncedAt = allContracts.length > 0
      ? allContracts.reduce((latest, contract) => {
          const contractSync = new Date(contract.last_synced_at || contract.updated_at);
          return contractSync > latest ? contractSync : latest;
        }, new Date(0))
      : null;

    // Calculate metrics
    const activeContracts = allContracts.filter(c => c.status === 'Active');
    const cancelledContracts = allContracts.filter(c => c.status === 'Cancelled');
    const completedContracts = allContracts.filter(c => c.status === 'Completed');

    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyRecurringRevenue = calculateTotalMRR(activeContracts);

    // Calculate projected revenue for selected date range
    const projectedTotal = calculateProjectedRevenue(allContracts, startDate, endDate);
    const upcomingPayments = getDailyProjections(allContracts, startDate, endDate);

    console.log('[Revenue Projection] Projection calculated:', {
      projectedTotal,
      upcomingPaymentsCount: upcomingPayments.length,
      monthlyRecurringRevenue
    });

    // Fetch current revenue from transactions table (within date range)
    let transactionsQuery = supabaseAdmin
      .from('transactions')
      .select('amount, status, raw_data')
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());

    // Apply merchant filtering
    transactionsQuery = applyMerchantFilter(transactionsQuery, merchantId);

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) {
      console.error('[Revenue Projection] Error fetching transactions:', transactionsError);
      // Continue without transaction data (non-critical)
    }

    // Calculate current revenue metrics
    const transactionList = transactions || [];

    // Filter for revenue-generating transactions only (exclude Returns based on raw_data.type)
    const approvedTransactions = transactionList.filter(t => {
      // Must be Approved or Settled
      const isApproved = t.status === 'Approved' || t.status === 'Settled';

      // Check raw_data.type to exclude Returns (most reliable method)
      const transactionType = t.raw_data?.type as string | undefined;
      const isNotReturn = transactionType !== 'Return';

      return isApproved && isNotReturn;
    });

    // Get Return transactions separately (based on raw_data.type = 'Return')
    const returnTransactions = transactionList.filter(t => {
      const isApproved = t.status === 'Approved' || t.status === 'Settled';
      const transactionType = t.raw_data?.type as string | undefined;
      const isReturn = transactionType === 'Return';
      return isApproved && isReturn;
    });

    const declinedTransactions = transactionList.filter(t => t.status === 'Declined');

    // Calculate revenue: Gross Sales - Returns = Net Revenue
    const grossRevenue = approvedTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const returnsTotal = Math.abs(returnTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0));
    const currentRevenueTotal = grossRevenue - returnsTotal;

    const currentTransactionCount = approvedTransactions.length;
    const averageTransaction = currentTransactionCount > 0 ? grossRevenue / currentTransactionCount : 0;

    const duration = (Date.now() - startTime) / 1000;

    console.log('[Revenue Projection] Report generated successfully:', {
      duration: `${duration.toFixed(2)}s`,
      currentRevenue: currentRevenueTotal,
      projectedRevenue: projectedTotal,
      totalContracts: allContracts.length,
      activeContracts: activeContracts.length
    });

    // Return comprehensive projection response
    return NextResponse.json<ProjectionResponse>({
      success: true,
      data: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days
        },
        currentRevenue: {
          total: currentRevenueTotal,
          transactionCount: currentTransactionCount,
          averageTransaction
        },
        projectedRevenue: {
          total: projectedTotal,
          contractCount: upcomingPayments.reduce((sum, day) => sum + day.count, 0),
          upcomingPayments
        },
        metrics: {
          totalTransactions: transactionList.length,
          approvedTransactions: approvedTransactions.length,
          declinedTransactions: declinedTransactions.length,
          activeContracts: activeContracts.length,
          cancelledContracts: cancelledContracts.length,
          completedContracts: completedContracts.length,
          monthlyRecurringRevenue
        },
        lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
        dataSource: 'database'
      }
    });

  } catch (error) {
    console.error('[Revenue Projection] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to generate revenue projection'
      },
      { status: 500 }
    );
  }
}
