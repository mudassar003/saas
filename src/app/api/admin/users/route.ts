import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { getAllUsersWithPasswords } from '@/lib/auth/database';
import { UserWithPassword } from '@/lib/auth/types';

interface UsersApiResponse {
  success: boolean;
  users?: UserWithPassword[];
  error?: string;
}

export async function GET(): Promise<NextResponse<UsersApiResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    // Fetch all users with passwords from database
    const users = await getAllUsersWithPasswords();

    return NextResponse.json({
      success: true,
      users,
    });

  } catch (error) {
    console.error('Get users error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}