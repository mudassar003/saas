import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils';
import { Contract } from '@/types/contract';

/**
 * GET /api/contracts
 * List all contracts with filtering and pagination
 *
 * Query Parameters:
 * - limit: Number of records per page (default: 50)
 * - offset: Pagination offset (default: 0)
 * - status: Filter by status ('Active', 'Completed', 'Cancelled', 'Inactive', 'all')
 * - search: Search by customer name or contract name
 *
 * @security Requires authentication - uses getCurrentMerchantId for tenant isolation
 */
export async function GET(request: NextRequest) {
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

    console.log('[Contracts API] Fetching contracts for merchant:', merchantId);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const dateStart = searchParams.get('dateStart') || undefined;
    const dateEnd = searchParams.get('dateEnd') || undefined;

    // Build query - fetch ALL filtered contracts (no pagination yet)
    // We'll sort and paginate in JavaScript for proper "Active-first" behavior across pages
    let query = supabaseAdmin
      .from('contracts')
      .select('*', { count: 'exact' })
      .range(0, 999999); // Fetch all filtered records (up to 1M)

    // Apply merchant filtering (CRITICAL for multi-tenancy)
    query = applyMerchantFilter(query, merchantId);

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply search filter
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,contract_name.ilike.%${search}%`);
    }

    // Date range filtering - FIXED: Use PostgreSQL date casting for accurate date-only comparison
    // Filter by next_bill_date (when the contract will bill next)
    if (dateStart) {
      query = query.gte('next_bill_date::date', dateStart);
    }
    if (dateEnd) {
      query = query.lte('next_bill_date::date', dateEnd);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Contracts API] Error fetching contracts:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch contracts from database'
        },
        { status: 500 }
      );
    }

    const allFilteredContracts = (data || []) as Contract[];

    // Custom sort: Active contracts first (newest to oldest), then others (newest to oldest)
    // This ensures ALL Active contracts appear before any other status across ALL pages
    allFilteredContracts.sort((a, b) => {
      // Priority: Active = 0, others = 1
      const priorityA = a.status === 'Active' ? 0 : 1;
      const priorityB = b.status === 'Active' ? 0 : 1;

      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Active (0) comes before others (1)
      }

      // Within same priority, sort by created_at DESC (newest first)
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // DESC (newest first)
    });

    // Apply pagination manually after sorting
    const contracts = allFilteredContracts.slice(offset, offset + limit);
    const totalFilteredCount = allFilteredContracts.length;

    // Calculate statistics from ENTIRE database (not just current page)
    // Fetch total counts for each status (ignoring pagination/filters)
    // IMPORTANT: Select all columns (or at least status + merchant_id) so the merchant filter works properly
    // CRITICAL: Supabase defaults to 1000 row limit - use .range() to bypass this limit
    // Using range(0, 999999) fetches up to 1 million rows, bypassing the default 1000 row limit
    let totalStatsQuery = supabaseAdmin
      .from('contracts')
      .select('*', { count: 'exact' })
      .range(0, 999999); // Fetch all rows (bypasses Supabase's default 1000 row limit)

    // Apply merchant filtering only (no pagination, no status filter, no search)
    totalStatsQuery = applyMerchantFilter(totalStatsQuery, merchantId);

    const { data: allContracts, error: statsError } = await totalStatsQuery;

    if (statsError) {
      console.error('[Contracts API] Error fetching statistics:', statsError);
    }

    const allContractsData = (allContracts || []) as Contract[];

    const statistics = {
      total: allContractsData.length,
      active: allContractsData.filter(c => c.status === 'Active').length,
      completed: allContractsData.filter(c => c.status === 'Completed').length,
      cancelled: allContractsData.filter(c => c.status === 'Cancelled').length,
      inactive: allContractsData.filter(c => c.status === 'Inactive').length,
      deleted: allContractsData.filter(c => c.status === 'Deleted').length
    };

    console.log('[Contracts API] Returning', contracts.length, 'contracts (filtered total:', totalFilteredCount, '), Stats:', statistics);

    return NextResponse.json({
      success: true,
      data: {
        records: contracts,
        recordCount: totalFilteredCount,
        statistics
      }
    });

  } catch (error) {
    console.error('[Contracts API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to fetch contracts'
      },
      { status: 500 }
    );
  }
}
