// Authentication types for multi-tenant system
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'super_admin' | 'tenant_user';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantAccess {
  merchantId: number;
  tenantRole: 'admin' | 'user' | 'viewer';
  isActive: boolean;
}

export interface UserSession {
  user: User;
  tenantAccess: TenantAccess[];
  currentMerchantId?: number; // Active merchant for tenant users
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  role: 'super_admin' | 'tenant_user';
  merchantId?: number; // Required for tenant_user
  tenantRole?: 'admin' | 'user' | 'viewer';
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  error?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'super_admin' | 'tenant_user';
  currentMerchantId?: number;
  iat?: number;
  exp?: number;
}