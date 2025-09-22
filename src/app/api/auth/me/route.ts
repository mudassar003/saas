import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-utils';
import { getUserById } from '@/lib/auth/database';

export async function GET(): Promise<NextResponse> {
  try {
    // Get current user from cookie
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const freshSession = await getUserById(session.user.id);
    if (!freshSession) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: freshSession,
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}