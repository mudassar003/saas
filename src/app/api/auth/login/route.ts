import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, updateLastLogin } from '@/lib/auth/database';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth/server-utils';
import { AuthResponse } from '@/lib/auth/types';

// Force Node.js runtime for this route
export const runtime = 'nodejs';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Get user by email
    const userSession = await getUserByEmail(email.toLowerCase().trim());
    if (!userSession) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get password hash from database (need direct query for security)
    const { createServerClient } = await import('@/lib/supabase-server');
    const supabase = createServerClient();
    const { data: userData, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userData.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await updateLastLogin(userSession.user.id);

    // Generate JWT token
    const token = generateToken({
      userId: userSession.user.id,
      email: userSession.user.email,
      role: userSession.user.role,
      currentMerchantId: userSession.currentMerchantId,
    });

    // Set HTTP-only cookie
    await setAuthCookie(token);

    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      user: {
        ...userSession,
        user: {
          ...userSession.user,
          // Remove sensitive fields from response
          lastLoginAt: new Date().toISOString(),
        },
      },
    });

  } catch (error) {
    console.error('Login error:', error);

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
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}