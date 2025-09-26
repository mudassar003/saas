import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { createServerClient } from '@/lib/supabase-server';

interface TenantData {
  id: string;
  merchant_id: number;
  consumer_key: string;
  consumer_secret: string;
  environment: string;
  webhook_secret: string | null;
  tenant_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantsApiResponse {
  success: boolean;
  tenants?: TenantData[];
  error?: string;
}

interface CreateTenantApiResponse {
  success: boolean;
  tenant?: TenantData;
  error?: string;
}

// Validation schema for creating tenant
const createTenantSchema = z.object({
  tenant_name: z.string().min(1, 'Tenant name is required').max(255, 'Tenant name too long'),
  merchant_id: z.number().positive('Merchant ID must be a positive number'),
  consumer_key: z.string().min(1, 'Consumer key is required'),
  consumer_secret: z.string().min(1, 'Consumer secret is required'),
  environment: z.enum(['production', 'sandbox']),
  webhook_secret: z.string().optional(),
});

export async function GET(): Promise<NextResponse<TenantsApiResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    const supabase = createServerClient();

    // Fetch all tenant configurations
    const { data: tenants, error } = await supabase
      .from('mx_merchant_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tenants: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      tenants: tenants || [],
    });

  } catch (error) {
    console.error('Get tenants error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateTenantApiResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    // Parse and validate request body
    const body = await request.json();
    const tenantData = createTenantSchema.parse(body);

    const supabase = createServerClient();

    // Check if merchant_id already exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('mx_merchant_configs')
      .select('merchant_id')
      .eq('merchant_id', tenantData.merchant_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error checking existing tenant: ${checkError.message}`);
    }

    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID already exists' },
        { status: 409 }
      );
    }

    // Create new tenant
    const { data: newTenant, error: createError } = await supabase
      .from('mx_merchant_configs')
      .insert({
        tenant_name: tenantData.tenant_name,
        merchant_id: tenantData.merchant_id,
        consumer_key: tenantData.consumer_key,
        consumer_secret: tenantData.consumer_secret, // TODO: Encrypt in production
        environment: tenantData.environment,
        webhook_secret: tenantData.webhook_secret || null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create tenant: ${createError.message}`);
    }

    return NextResponse.json({
      success: true,
      tenant: newTenant,
    });

  } catch (error) {
    console.error('Create tenant error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || 'Invalid input'
        },
        { status: 400 }
      );
    }

    // Handle duplicate errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}