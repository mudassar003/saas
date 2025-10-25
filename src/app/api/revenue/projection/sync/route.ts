import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentMerchantId } from '@/lib/auth/api-utils';
import { createMXClientForMerchant } from '@/lib/mx-merchant-client';
import { transformMXContractToContract } from '@/lib/mx-merchant-client';
import { ContractSyncResponse } from '@/types/contract';

/**
 * POST /api/revenue/projection/sync
 * Fetch fresh contract data from MX Merchant API and save to database
 *
 * This endpoint:
 * 1. Fetches all contracts from MX Merchant API (with pagination)
 * 2. Saves/updates contracts in database (upsert)
 * 3. Returns sync statistics
 *
 * @security Requires authentication - uses getCurrentMerchantId for tenant isolation
 */
export async function POST(request: NextRequest) {
  const syncStartTime = Date.now();

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

    console.log('[Contract Sync] Starting sync for merchant:', merchantId);

    // Parse request body (optional status filter)
    const body = await request.json().catch(() => ({}));
    const statusFilter = body.status as 'Active' | 'Completed' | 'Cancelled' | undefined;

    // Create MX Merchant client for this merchant
    const mxClient = await createMXClientForMerchant(merchantId.toString());

    // Fetch ALL contracts from API (with pagination handled automatically)
    console.log('[Contract Sync] Fetching contracts from MX Merchant API...');
    const contractsResponse = await mxClient.getAllContracts(
      merchantId.toString(),
      statusFilter || 'Active' // Default: fetch only Active contracts
    );

    const { records: mxContracts, recordCount } = contractsResponse;
    console.log(`[Contract Sync] Fetched ${mxContracts.length} contracts (total: ${recordCount})`);

    if (mxContracts.length === 0) {
      return NextResponse.json<ContractSyncResponse>({
        success: true,
        message: 'No contracts found',
        stats: {
          totalFetched: 0,
          newRecords: 0,
          updatedRecords: 0,
          apiCalls: 0,
          syncDuration: `${(Date.now() - syncStartTime) / 1000}s`
        },
        lastSyncedAt: new Date().toISOString()
      });
    }

    // Track new vs updated records
    let newRecords = 0;
    let updatedRecords = 0;

    // Upsert contracts to database (batch operation)
    console.log('[Contract Sync] Upserting contracts to database...');

    for (const mxContract of mxContracts) {
      // Transform MX Contract to our internal format
      const contractData = transformMXContractToContract(mxContract);

      // Check if contract already exists
      const { data: existing } = await supabaseAdmin
        .from('contracts')
        .select('id')
        .eq('mx_contract_id', mxContract.id)
        .eq('merchant_id', merchantId)
        .single();

      if (existing) {
        // Update existing contract
        const { error } = await supabaseAdmin
          .from('contracts')
          .update({
            ...contractData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[Contract Sync] Error updating contract:', error);
        } else {
          updatedRecords++;
        }
      } else {
        // Insert new contract
        const { error } = await supabaseAdmin
          .from('contracts')
          .insert({
            ...contractData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('[Contract Sync] Error inserting contract:', error);
        } else {
          newRecords++;
        }
      }
    }

    const syncDuration = (Date.now() - syncStartTime) / 1000;
    const apiCalls = Math.ceil(mxContracts.length / 100); // API pagination: 100 per request

    console.log('[Contract Sync] Sync completed:', {
      totalFetched: mxContracts.length,
      newRecords,
      updatedRecords,
      duration: `${syncDuration}s`
    });

    return NextResponse.json<ContractSyncResponse>({
      success: true,
      message: `Successfully synced ${mxContracts.length} contracts`,
      stats: {
        totalFetched: mxContracts.length,
        newRecords,
        updatedRecords,
        apiCalls,
        syncDuration: `${syncDuration.toFixed(2)}s`
      },
      lastSyncedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Contract Sync] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to sync contracts'
      },
      { status: 500 }
    );
  }
}
