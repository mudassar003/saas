import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { createServerClient } from '@/lib/supabase-server';

interface ProductCategory {
  id: string;
  merchant_id: number;
  product_name: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoriesApiResponse {
  success: boolean;
  categories?: ProductCategory[];
  error?: string;
}

interface CreateCategoryApiResponse {
  success: boolean;
  category?: ProductCategory;
  error?: string;
}

// Validation schema for creating/updating category
const categorySchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  category: z.enum(['TRT', 'Weight Loss', 'Peptides', 'ED', 'Other', 'Uncategorized']),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
): Promise<NextResponse<CategoriesApiResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    const { merchantId } = await params;
    const merchantIdNumber = parseInt(merchantId);

    if (isNaN(merchantIdNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch all product categories for this merchant
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('merchant_id', merchantIdNumber)
      .eq('is_active', true)
      .order('product_name');

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });

  } catch (error) {
    console.error('Get categories error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
): Promise<NextResponse<CreateCategoryApiResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    const { merchantId } = await params;
    const merchantIdNumber = parseInt(merchantId);

    if (isNaN(merchantIdNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const categoryData = categorySchema.parse(body);

    const supabase = createServerClient();

    // Check if product already has a category mapping
    const { data: existingCategory, error: checkError } = await supabase
      .from('product_categories')
      .select('id')
      .eq('merchant_id', merchantIdNumber)
      .eq('product_name', categoryData.product_name)
      .eq('is_active', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Error checking existing category: ${checkError.message}`);
    }

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Product already has a category mapping' },
        { status: 409 }
      );
    }

    // Create new category mapping
    const { data: newCategory, error: createError } = await supabase
      .from('product_categories')
      .insert({
        merchant_id: merchantIdNumber,
        product_name: categoryData.product_name,
        category: categoryData.category,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create category: ${createError.message}`);
    }

    return NextResponse.json({
      success: true,
      category: newCategory,
    });

  } catch (error) {
    console.error('Create category error:', error);

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
    if (error instanceof Error && error.message.includes('already has a category')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}