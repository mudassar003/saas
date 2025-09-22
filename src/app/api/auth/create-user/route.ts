import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser } from '@/lib/auth/database';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { CreateUserRequest } from '@/lib/auth/types';

// Force Node.js runtime for this route
export const runtime = 'nodejs';

// Validation schema
const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['super_admin', 'tenant_user']),
  merchantId: z.number().optional(),
  tenantRole: z.enum(['admin', 'user', 'viewer']).optional(),
}).refine((data) => {
  // If role is tenant_user, merchantId is required
  if (data.role === 'tenant_user' && !data.merchantId) {
    return false;
  }
  return true;
}, {
  message: 'Merchant ID is required for tenant users',
  path: ['merchantId'],
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    // Parse and validate request body
    const body = await request.json();
    const userData = createUserSchema.parse(body) as CreateUserRequest;

    // Create user
    const newUser = await createUser({
      ...userData,
      email: userData.email.toLowerCase().trim(),
    });

    // Return success response (without password hash)
    return NextResponse.json({
      success: true,
      user: newUser,
    });

  } catch (error) {
    console.error('Create user error:', error);

    // Handle authentication errors
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

    // Handle database errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}