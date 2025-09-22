import { NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth/server-utils';

export async function POST(): Promise<NextResponse> {
  try {
    // Remove authentication cookie
    await removeAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}