import { NextRequest, NextResponse } from 'next/server';
import { getCurrentMerchantId } from '@/lib/auth/api-utils';
import { createMXClientForMerchant } from '@/lib/mx-merchant-client';
import { MXPayment } from '@/types/invoice';

/**
 * GET /api/contracts/[id]/payments
 * Get payment history for a specific contract from MX Merchant API
 *
 * Query Parameters:
 * - limit: Number of records to return (default: 999)
 * - offset: Pagination offset (default: 0)
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

    console.log('[Contract Payments API] Fetching payment history for contract:', contractId);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '999');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch payment history from MX Merchant API
    const mxClient = await createMXClientForMerchant(merchantId.toString());
    const paymentsResponse = await mxClient.getContractPayments(contractId, limit, offset);

    console.log('[Contract Payments API] Found', paymentsResponse.recordCount, 'payments');

    // Calculate payment statistics
    const payments = paymentsResponse.records || [];
    const statistics = {
      total: paymentsResponse.recordCount,
      settled: payments.filter((p: MXPayment) => p.status === 'Settled').length,
      approved: payments.filter((p: MXPayment) => p.status === 'Approved').length,
      declined: payments.filter((p: MXPayment) => p.status === 'Declined').length,
      totalAmount: payments
        .filter((p: MXPayment) => p.status === 'Settled' || p.status === 'Approved')
        .reduce((sum: number, p: MXPayment) => sum + parseFloat(p.amount || '0'), 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        payments: paymentsResponse.records,
        recordCount: paymentsResponse.recordCount,
        statistics
      }
    });

  } catch (error) {
    console.error('[Contract Payments API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to fetch contract payment history'
      },
      { status: 500 }
    );
  }
}
