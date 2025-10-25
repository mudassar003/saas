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

    // Build query
    let query = supabaseAdmin
      .from('contracts')
      .select('*', { count: 'exact' })
      .order('next_bill_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

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

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

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

    const contracts = (data || []) as Contract[];

    // Calculate statistics
    const statistics = {
      total: count || 0,
      active: contracts.filter(c => c.status === 'Active').length,
      completed: contracts.filter(c => c.status === 'Completed').length,
      cancelled: contracts.filter(c => c.status === 'Cancelled').length,
      inactive: contracts.filter(c => c.status === 'Inactive').length
    };

    console.log('[Contracts API] Returning', contracts.length, 'contracts (total:', count, ')');

    return NextResponse.json({
      success: true,
      data: {
        records: contracts,
        recordCount: count || 0,
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
