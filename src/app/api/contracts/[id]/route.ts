import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentMerchantId, applyMerchantFilter } from '@/lib/auth/api-utils';
import { createMXClientForMerchant } from '@/lib/mx-merchant-client';
import { Contract } from '@/types/contract';

/**
 * GET /api/contracts/[id]
 * Get contract details from database and optionally fetch fresh data from MX Merchant API
 *
 * Query Parameters:
 * - fetchFresh: If 'true', fetches latest contract details from MX Merchant API
 *
 * @security Requires authentication - validates merchant access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const contractId = parseInt(id);

    if (isNaN(contractId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid contract ID'
        },
        { status: 400 }
      );
    }

    console.log('[Contract Detail API] Fetching contract:', contractId, 'for merchant:', merchantId);

    const { searchParams } = new URL(request.url);
    const fetchFresh = searchParams.get('fetchFresh') === 'true';

    if (fetchFresh) {
      // Fetch fresh data from MX Merchant API
      console.log('[Contract Detail API] Fetching fresh data from MX Merchant API');

      const mxClient = await createMXClientForMerchant(merchantId.toString());
      const mxContract = await mxClient.getContractDetail(contractId);

      // Verify merchant ownership
      if (mxContract.merchantId !== Number(merchantId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Contract belongs to different merchant'
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          contract: mxContract,
          source: 'api'
        }
      });
    }

    // Fetch from database
    let query = supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('mx_contract_id', contractId)
      .single();

    // Apply merchant filtering
    query = applyMerchantFilter(query, merchantId);

    const { data, error } = await query;

    if (error) {
      console.error('[Contract Detail API] Error:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Contract not found'
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch contract'
        },
        { status: 500 }
      );
    }

    const contract = data as Contract;

    console.log('[Contract Detail API] Contract found:', contract.contract_name);

    return NextResponse.json({
      success: true,
      data: {
        contract,
        source: 'database'
      }
    });

  } catch (error) {
    console.error('[Contract Detail API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to fetch contract details'
      },
      { status: 500 }
    );
  }
}
