import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { getAllMerchants } from '@/lib/auth/database';

interface MerchantData {
  merchant_id: number;
  environment: string;
  is_active: boolean;
  created_at: string;
}

interface MerchantsApiResponse {
  success: boolean;
  merchants?: MerchantData[];
  error?: string;
}

export async function GET(): Promise<NextResponse<MerchantsApiResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    // Fetch all merchants from database
    const merchants = await getAllMerchants();

    return NextResponse.json({
      success: true,
      merchants,
    });

  } catch (error) {
    console.error('Get merchants error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}