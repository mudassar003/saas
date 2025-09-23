import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { resetUserPassword } from '@/lib/auth/database';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

interface ResetPasswordResponse {
  success: boolean;
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    const { userId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const { newPassword } = resetPasswordSchema.parse(body);

    // Reset the user's password
    await resetUserPassword(userId, newPassword);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Reset password error:', error);

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

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}