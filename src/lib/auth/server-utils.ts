import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWTPayload, UserSession } from './types';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Hash password using bcrypt (SERVER ONLY)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Verify password against hash (SERVER ONLY)
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT token (SERVER ONLY)
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'saas-auth',
    algorithm: 'HS256', // Explicitly set algorithm for Edge Runtime compatibility
  });
}

/**
 * Verify JWT token (SERVER ONLY)
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Edge Runtime compatible JWT verification using Web Crypto API
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      return null;
    }

    // Decode payload to check expiration
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    ) as JWTPayload;

    // Check if token is expired
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      return null;
    }

    // Create signature to verify
    const encoder = new TextEncoder();
    const data = encoder.encode(`${header}.${payload}`);
    const secretKey = encoder.encode(JWT_SECRET);

    // Import secret key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate signature
    const expectedSignature = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignatureB64 = Buffer.from(expectedSignature).toString('base64url');

    // Compare signatures
    if (signature !== expectedSignatureB64) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    console.error('Edge token verification failed:', error);
    return null;
  }
}

/**
 * Set authentication cookie (SERVER ONLY)
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get authentication cookie (SERVER ONLY)
 */
export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Remove authentication cookie (SERVER ONLY)
 */
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get current user session from cookie (SERVER ONLY)
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) {
    // Invalid token, remove cookie
    await removeAuthCookie();
    return null;
  }

  // CRITICAL FIX: Fetch fresh user data with tenant access from database
  const { getUserById } = await import('./database');
  const freshSession = await getUserById(payload.userId);

  if (!freshSession) {
    // User not found, remove invalid cookie
    await removeAuthCookie();
    return null;
  }

  return freshSession;
}

/**
 * Check if user has access to specific merchant (SERVER ONLY)
 */
export function hasAccessToMerchant(session: UserSession | null, merchantId: number): boolean {
  if (!session) return false;

  // Super admin has access to all merchants
  if (session.user.role === 'super_admin') return true;

  // Tenant user must have specific access
  return session.tenantAccess.some(
    access => access.merchantId === merchantId && access.isActive
  );
}

/**
 * Validate merchant access for API routes (SERVER ONLY)
 */
export async function validateMerchantAccess(merchantId: number): Promise<boolean> {
  const session = await getCurrentUser();
  return hasAccessToMerchant(session, merchantId);
}

/**
 * Require authentication (throws if not authenticated) (SERVER ONLY)
 */
export async function requireAuth(): Promise<UserSession> {
  const session = await getCurrentUser();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

/**
 * Require super admin access (throws if not super admin) (SERVER ONLY)
 */
export async function requireSuperAdmin(): Promise<UserSession> {
  const session = await requireAuth();
  if (session.user.role !== 'super_admin') {
    throw new Error('Super admin access required');
  }
  return session;
}