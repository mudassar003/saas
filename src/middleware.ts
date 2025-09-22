import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth/server-utils';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/transactions',
  '/setup',
  '/transaction-setup',
  '/census',
];

// Admin-only routes (super admin required)
const adminRoutes = [
  '/admin',
];

// API routes that require authentication
const protectedApiRoutes = [
  '/api/invoices',
  '/api/transactions',
  '/api/sync',
  '/api/data-sent',
  '/api/check-updates',
  '/api/census',
];

// API routes that require super admin
const adminApiRoutes = [
  '/api/auth/create-user',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-protected routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));
  const isAdminApiRoute = adminApiRoutes.some(route => pathname.startsWith(route));

  if (!isProtectedRoute && !isAdminRoute && !isProtectedApiRoute && !isAdminApiRoute) {
    return NextResponse.next();
  }

  // Get auth token from cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login for page routes
    if (isProtectedRoute || isAdminRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Verify token
  const payload = await verifyTokenEdge(token);

  if (!payload) {
    // Invalid token - clear cookie and redirect/respond
    const response = isProtectedApiRoute || isAdminApiRoute
      ? NextResponse.json(
          { success: false, error: 'Invalid authentication token' },
          { status: 401 }
        )
      : (() => {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        })();

    // Clear invalid cookie
    response.cookies.delete('auth-token');
    return response;
  }

  // Check super admin access for admin routes
  if ((isAdminRoute || isAdminApiRoute) && payload.role !== 'super_admin') {
    if (isAdminApiRoute) {
      return NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // Redirect to dashboard for page routes
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add user info to request headers for API routes
  if (isProtectedApiRoute || isAdminApiRoute) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);
    if (payload.currentMerchantId) {
      requestHeaders.set('x-current-merchant-id', payload.currentMerchantId.toString());
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - / (home page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|^/$).*)',
  ],
};