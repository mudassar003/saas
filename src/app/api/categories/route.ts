import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentMerchantId, applyMerchantFilter, requirePermission } from '@/lib/auth/api-utils';
import { Permission } from '@/lib/auth/permissions';

// TypeScript interfaces for type safety
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

interface CategoryApiResponse {
  success: boolean;
  category?: ProductCategory;
  error?: string;
}

interface DeleteApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Validation schema for creating/updating category
// Matches database constraint exactly
const categorySchema = z.object({
  product_name: z.string()
    .min(1, 'Product name is required')
    .max(500, 'Product name must be 500 characters or less')
    .trim(),
  category: z.enum(['TRT', 'Weight Loss', 'Peptides', 'ED', 'Other', 'Uncategorized'], {
    message: 'Invalid category',
  }),
});

type CategoryFormData = z.infer<typeof categorySchema>;

/**
 * GET /api/categories
 * Fetch all product categories for current user's merchant
 * Security: Automatically filtered by merchant_id (tenant users see only their merchant)
 */
export async function GET(request: NextRequest): Promise<NextResponse<CategoriesApiResponse>> {
  try {
    // SECURITY LAYER 1: Get current user's merchant access
    // Returns null for super_admin (all merchants), merchant_id for tenant users
    const merchantId = await getCurrentMerchantId(request);

    console.log('Fetching categories for merchant:', merchantId || 'all (super admin)');

    // Build query with merchant filtering
    let query = supabaseAdmin
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('product_name', { ascending: true });

    // SECURITY LAYER 2: Apply merchant filter
    // Tenant users can only see categories for their merchant
    query = applyMerchantFilter(query, merchantId);

    const { data: categories, error } = await query;

    if (error) {
      console.error('Database error fetching categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });

  } catch (error) {
    console.error('Get categories error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create new product category for current user's merchant
 * Security: Category automatically assigned to user's merchant_id
 * Permission Required: CREATE_CATEGORY (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse<CategoryApiResponse>> {
  try {
    // SECURITY LAYER 1: Check permission (admin only)
    await requirePermission(request, Permission.CREATE_CATEGORY);

    // SECURITY LAYER 2: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request);

    // Validate: Tenant users must have a merchant_id
    if (merchantId === null) {
      // Super admin trying to create without specifying merchant - not allowed via this endpoint
      // Super admins should use /api/admin/tenants/{merchantId}/categories instead
      return NextResponse.json(
        { success: false, error: 'Super admin must use admin endpoint to create categories' },
        { status: 403 }
      );
    }

    console.log('Creating category for merchant:', merchantId);

    // Parse and validate request body
    const body = await request.json();

    // SECURITY LAYER 2: Validate input with Zod schema
    const validationResult = categorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || 'Invalid input'
        },
        { status: 400 }
      );
    }

    const categoryData: CategoryFormData = validationResult.data;

    // SECURITY LAYER 3: Check if product already has a category mapping for this merchant
    let checkQuery = supabaseAdmin
      .from('product_categories')
      .select('id')
      .eq('product_name', categoryData.product_name)
      .eq('is_active', true);

    // Apply merchant filter to check query
    checkQuery = applyMerchantFilter(checkQuery, merchantId);

    const { data: existingCategory, error: checkError } = await checkQuery.single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing category:', checkError);
      throw new Error(`Error checking existing category: ${checkError.message}`);
    }

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'This product already has a category mapping' },
        { status: 409 }
      );
    }

    // SECURITY LAYER 4: Create category with merchant_id enforced
    const { data: newCategory, error: createError } = await supabaseAdmin
      .from('product_categories')
      .insert({
        merchant_id: merchantId, // Enforce merchant_id from authenticated user
        product_name: categoryData.product_name,
        category: categoryData.category,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Database error creating category:', createError);
      throw new Error(`Failed to create category: ${createError.message}`);
    }

    console.log('Category created successfully:', newCategory.id);

    return NextResponse.json({
      success: true,
      category: newCategory,
    }, { status: 201 });

  } catch (error) {
    console.error('Create category error:', error);

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories?id={categoryId}
 * Update existing product category
 * Security: Users can only update categories for their merchant
 * Permission Required: UPDATE_CATEGORY (admin only)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse<CategoryApiResponse>> {
  try {
    // SECURITY LAYER 1: Check permission (admin only)
    await requirePermission(request, Permission.UPDATE_CATEGORY);

    // SECURITY LAYER 2: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request);

    // Get category ID from query params
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    console.log('Updating category:', categoryId, 'for merchant:', merchantId || 'all');

    // Parse and validate request body
    const body = await request.json();

    // SECURITY LAYER 2: Validate input with Zod schema
    const validationResult = categorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message || 'Invalid input'
        },
        { status: 400 }
      );
    }

    const categoryData: CategoryFormData = validationResult.data;

    // SECURITY LAYER 3: Check for duplicate product name (excluding current category)
    let checkQuery = supabaseAdmin
      .from('product_categories')
      .select('id')
      .eq('product_name', categoryData.product_name)
      .eq('is_active', true)
      .neq('id', categoryId);

    // Apply merchant filter
    checkQuery = applyMerchantFilter(checkQuery, merchantId);

    const { data: existingCategory, error: checkError } = await checkQuery.single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing category:', checkError);
      throw new Error(`Error checking existing category: ${checkError.message}`);
    }

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Another product already has this name' },
        { status: 409 }
      );
    }

    // SECURITY LAYER 4: Update category with merchant filter applied
    let updateQuery = supabaseAdmin
      .from('product_categories')
      .update({
        product_name: categoryData.product_name,
        category: categoryData.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId);

    // CRITICAL: Apply merchant filter to prevent updating other merchants' categories
    updateQuery = applyMerchantFilter(updateQuery, merchantId);

    const { data: updatedCategory, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) {
      // Check if it's a "not found" error (could mean unauthorized access)
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Category not found or access denied' },
          { status: 404 }
        );
      }
      console.error('Database error updating category:', updateError);
      throw new Error(`Failed to update category: ${updateError.message}`);
    }

    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found or access denied' },
        { status: 404 }
      );
    }

    console.log('Category updated successfully:', updatedCategory.id);

    return NextResponse.json({
      success: true,
      category: updatedCategory,
    });

  } catch (error) {
    console.error('Update category error:', error);

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories?id={categoryId}
 * Soft delete product category (set is_active to false)
 * Security: Users can only delete categories for their merchant
 * Permission Required: DELETE_CATEGORY (admin only)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<DeleteApiResponse>> {
  try {
    // SECURITY LAYER 1: Check permission (admin only)
    await requirePermission(request, Permission.DELETE_CATEGORY);

    // SECURITY LAYER 2: Get current user's merchant access
    const merchantId = await getCurrentMerchantId(request);

    // Get category ID from query params
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting category:', categoryId, 'for merchant:', merchantId || 'all');

    // SECURITY LAYER 2: Soft delete with merchant filter applied
    let deleteQuery = supabaseAdmin
      .from('product_categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId);

    // CRITICAL: Apply merchant filter to prevent deleting other merchants' categories
    deleteQuery = applyMerchantFilter(deleteQuery, merchantId);

    const { data, error: deleteError } = await deleteQuery
      .select()
      .single();

    if (deleteError) {
      // Check if it's a "not found" error (could mean unauthorized access)
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Category not found or access denied' },
          { status: 404 }
        );
      }
      console.error('Database error deleting category:', deleteError);
      throw new Error(`Failed to delete category: ${deleteError.message}`);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Category not found or access denied' },
        { status: 404 }
      );
    }

    console.log('Category deleted successfully:', categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });

  } catch (error) {
    console.error('Delete category error:', error);

    // Handle permission errors
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
