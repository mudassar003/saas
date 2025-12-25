import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils';
import { Contract } from '@/types/contract';
import { ProjectionResponse } from '@/types/contract';
import {
  calculateTotalMRR,
  calculateProjectedRevenue,
  getDailyProjections,
  getDailyProjectionsWithCategories,
  parseDateRange
} from '@/lib/revenue-calculations';
import { differenceInDays } from 'date-fns';

/**
 * POST /api/revenue/projection/generate
 * Generate revenue projection report with actual vs projected split
 *
 * This endpoint:
 * 1. Queries transactions from local database for actual revenue (past)
 * 2. Queries contracts from local database for projected revenue (future)
 * 3. Splits data based on cutoff date (today)
 * 4. Returns comprehensive ProjectionResponse with actual and projected breakdown
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
    const preset = body.preset as 'thisMonth' | 'nextMonth' | 'next7days' | 'next30days' | 'next90days' | null;
    const customStart = body.startDate as string | undefined;
    const customEnd = body.endDate as string | undefined;

    // Parse date range (defaults to thisMonth if not specified)
    const { startDate, endDate, days } = parseDateRange(preset, customStart, customEnd);

    // Calculate cutoff date (today) for splitting actual vs projected
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const cutoffDate = todayUTC;

    // Calculate days completed and days remaining
    const daysCompleted = Math.max(0, differenceInDays(cutoffDate, startDate));
    const daysRemaining = Math.max(0, differenceInDays(endDate, cutoffDate));

    console.log('[Revenue Projection] Date range:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      cutoff: cutoffDate.toISOString(),
      days,
      daysCompleted,
      daysRemaining
    });

    // ============================================
    // PART 1: ACTUAL REVENUE (Historical Data)
    // ============================================

    // Fetch actual transactions from database (within date range, before cutoffDate)
    let actualTransactionsQuery = supabaseAdmin
      .from('transactions')
      .select('amount, status, raw_data, transaction_date, customer_name, product_category')
      .gte('transaction_date', startDate.toISOString())
      .lt('transaction_date', cutoffDate.toISOString()); // BEFORE today

    // Apply merchant filtering
    actualTransactionsQuery = applyMerchantFilter(actualTransactionsQuery, merchantId);

    const { data: actualTransactions, error: actualTransactionsError } = await actualTransactionsQuery;

    if (actualTransactionsError) {
      console.error('[Revenue Projection] Error fetching actual transactions:', actualTransactionsError);
      // Continue without actual transaction data (non-critical)
    }

    const actualTransactionList = actualTransactions || [];

    // Filter for revenue-generating transactions only (exclude Returns based on raw_data.type)
    const approvedActualTransactions = actualTransactionList.filter(t => {
      // Must be Approved or Settled
      const isApproved = t.status === 'Approved' || t.status === 'Settled';

      // Check raw_data.type to exclude Returns (most reliable method)
      const transactionType = t.raw_data?.type as string | undefined;
      const isNotReturn = transactionType !== 'Return';

      return isApproved && isNotReturn;
    });

    // Get Return transactions separately (based on raw_data.type = 'Return')
    const returnTransactions = actualTransactionList.filter(t => {
      const isApproved = t.status === 'Approved' || t.status === 'Settled';
      const transactionType = t.raw_data?.type as string | undefined;
      const isReturn = transactionType === 'Return';
      return isApproved && isReturn;
    });

    // Calculate actual revenue: Gross Sales - Returns = Net Revenue
    const grossActualRevenue = approvedActualTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const returnsTotal = Math.abs(returnTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0));
    const actualRevenueTotal = grossActualRevenue - returnsTotal;

    const actualTransactionCount = approvedActualTransactions.length;
    const averageActualTransaction = actualTransactionCount > 0 ? grossActualRevenue / actualTransactionCount : 0;

    // Build daily breakdown for actual revenue (with product categories)
    type DayEntry = {
      amount: number;
      count: number;
      customers: string[];
      categoryMap: Map<string, {
        amount: number;
        count: number;
        customers: string[];
      }>;
    };

    const actualDailyMap = new Map<string, DayEntry>();

    approvedActualTransactions.forEach(tx => {
      const txDate = new Date(tx.transaction_date);
      const dateKey = txDate.toISOString().split('T')[0].split(' ')[0]; // YYYY-MM-DD
      const category = tx.product_category || 'Uncategorized';
      const customerName = tx.customer_name || 'Unknown';

      let dayEntry = actualDailyMap.get(dateKey);
      if (!dayEntry) {
        dayEntry = {
          amount: 0,
          count: 0,
          customers: [],
          categoryMap: new Map()
        };
        actualDailyMap.set(dateKey, dayEntry);
      }

      dayEntry.amount += parseFloat(tx.amount.toString());
      dayEntry.count += 1;
      if (!dayEntry.customers.includes(customerName)) {
        dayEntry.customers.push(customerName);
      }

      let categoryEntry = dayEntry.categoryMap.get(category);
      if (!categoryEntry) {
        categoryEntry = {
          amount: 0,
          count: 0,
          customers: []
        };
        dayEntry.categoryMap.set(category, categoryEntry);
      }

      categoryEntry.amount += parseFloat(tx.amount.toString());
      categoryEntry.count += 1;
      if (!categoryEntry.customers.includes(customerName)) {
        categoryEntry.customers.push(customerName);
      }
    });

    const actualDailyBreakdown = Array.from(actualDailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
        customers: data.customers,
        categoryBreakdown: Array.from(data.categoryMap.entries())
          .map(([category, categoryData]) => ({
            category,
            amount: categoryData.amount,
            count: categoryData.count,
            customers: categoryData.customers
          }))
          .sort((a, b) => b.amount - a.amount)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ============================================
    // PART 2: PROJECTED REVENUE (Future Data)
    // ============================================

    // Fetch ALL contracts from database
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

    // Build customer-to-category map from transaction history
    let allTransactionsQuery = supabaseAdmin
      .from('transactions')
      .select('customer_name, product_category, transaction_date')
      .eq('source', 'Recurring') // Only recurring transactions
      .not('product_category', 'is', null)
      .order('transaction_date', { ascending: false });

    allTransactionsQuery = applyMerchantFilter(allTransactionsQuery, merchantId);

    const { data: categoryTransactions } = await allTransactionsQuery;

    // Map each customer to their most common product category
    const customerCategoryMap = new Map<string, string>();
    const customerCategoryCount = new Map<string, Map<string, number>>();

    (categoryTransactions || []).forEach((tx: { customer_name: string; product_category: string }) => {
      if (!tx.customer_name || !tx.product_category) return;

      const categoryMap = customerCategoryCount.get(tx.customer_name) || new Map<string, number>();
      const currentCount = categoryMap.get(tx.product_category) || 0;
      categoryMap.set(tx.product_category, currentCount + 1);
      customerCategoryCount.set(tx.customer_name, categoryMap);
    });

    // Determine most common category for each customer
    customerCategoryCount.forEach((categoryMap, customerName) => {
      let mostCommonCategory = 'Uncategorized';
      let maxCount = 0;

      categoryMap.forEach((count, category) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonCategory = category;
        }
      });

      customerCategoryMap.set(customerName, mostCommonCategory);
    });

    console.log(`[Revenue Projection] Mapped ${customerCategoryMap.size} customers to categories`);

    // Calculate projected revenue for selected date range (FROM cutoffDate onwards)
    const projectedTotal = calculateProjectedRevenue(allContracts, cutoffDate, endDate);
    const upcomingPayments = getDailyProjectionsWithCategories(
      allContracts,
      cutoffDate,
      endDate,
      customerCategoryMap
    );

    console.log('[Revenue Projection] Projection calculated:', {
      actualTotal: actualRevenueTotal,
      projectedTotal,
      upcomingPaymentsCount: upcomingPayments.length,
      monthlyRecurringRevenue
    });

    // ============================================
    // PART 3: COMBINED METRICS
    // ============================================

    const monthlyExpectedTotal = actualRevenueTotal + projectedTotal;
    const actualPercentage = monthlyExpectedTotal > 0
      ? (actualRevenueTotal / monthlyExpectedTotal) * 100
      : 0;
    const projectedPercentage = monthlyExpectedTotal > 0
      ? (projectedTotal / monthlyExpectedTotal) * 100
      : 0;

    // Get declined transactions (for metrics)
    const declinedTransactions = actualTransactionList.filter(t => t.status === 'Declined');

    const duration = (Date.now() - startTime) / 1000;

    console.log('[Revenue Projection] Report generated successfully:', {
      duration: `${duration.toFixed(2)}s`,
      actualRevenue: actualRevenueTotal,
      projectedRevenue: projectedTotal,
      monthlyTotal: monthlyExpectedTotal,
      totalContracts: allContracts.length,
      activeContracts: activeContracts.length
    });

    // Return comprehensive projection response with actual vs projected split
    return NextResponse.json<ProjectionResponse>({
      success: true,
      data: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
          cutoffDate: cutoffDate.toISOString(),
          daysCompleted,
          daysRemaining
        },
        actualRevenue: {
          total: actualRevenueTotal,
          transactionCount: actualTransactionCount,
          averageTransaction: averageActualTransaction,
          dailyBreakdown: actualDailyBreakdown
        },
        projectedRevenue: {
          total: projectedTotal,
          contractCount: upcomingPayments.reduce((sum, day) => sum + day.count, 0),
          upcomingPayments
        },
        monthlyTotal: {
          expected: monthlyExpectedTotal,
          actualPercentage,
          projectedPercentage
        },
        metrics: {
          totalTransactions: actualTransactionList.length,
          approvedTransactions: approvedActualTransactions.length,
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
