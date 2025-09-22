'use client';

import Cookies from 'js-cookie';

const COOKIE_NAME = 'auth-token';

/**
 * Get auth token from client-side cookie
 */
export function getClientAuthCookie(): string | null {
  return Cookies.get(COOKIE_NAME) || null;
}

/**
 * Remove auth token from client-side cookie
 */
export function removeClientAuthCookie(): void {
  Cookies.remove(COOKIE_NAME, { path: '/' });
}

/**
 * Check if user is authenticated (client-side)
 */
export function isClientAuthenticated(): boolean {
  return !!getClientAuthCookie();
}