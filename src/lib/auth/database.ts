import { createServerClient } from '@/lib/supabase-server';
import { User, TenantAccess, UserSession, CreateUserRequest } from './types';
import { hashPassword } from './server-utils';

/**
 * Get user by email with tenant access
 */
export async function getUserByEmail(email: string): Promise<UserSession | null> {
  const supabase = createServerClient();

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (userError || !user) {
    return null;
  }

  // Get tenant access
  const { data: tenantAccess, error: tenantError } = await supabase
    .from('user_tenants')
    .select('merchant_id, tenant_role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (tenantError) {
    console.error('Error fetching tenant access:', tenantError);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    tenantAccess: (tenantAccess || []).map((access): TenantAccess => ({
      merchantId: access.merchant_id,
      tenantRole: access.tenant_role,
      isActive: access.is_active,
    })),
    currentMerchantId: tenantAccess?.[0]?.merchant_id, // Default to first merchant
  };
}

/**
 * Get user by ID with tenant access
 */
export async function getUserById(userId: string): Promise<UserSession | null> {
  const supabase = createServerClient();

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single();

  if (userError || !user) {
    return null;
  }

  // Get tenant access
  const { data: tenantAccess, error: tenantError } = await supabase
    .from('user_tenants')
    .select('merchant_id, tenant_role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (tenantError) {
    console.error('Error fetching tenant access:', tenantError);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    tenantAccess: (tenantAccess || []).map((access): TenantAccess => ({
      merchantId: access.merchant_id,
      tenantRole: access.tenant_role,
      isActive: access.is_active,
    })),
    currentMerchantId: tenantAccess?.[0]?.merchant_id,
  };
}

/**
 * Create a new user with optional tenant access
 */
export async function createUser(userData: CreateUserRequest): Promise<User> {
  const supabase = createServerClient();

  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email: userData.email,
      first_name: userData.firstName || null,
      last_name: userData.lastName || null,
      password_hash: passwordHash,
      role: userData.role,
    })
    .select()
    .single();

  if (userError) {
    throw new Error(`Failed to create user: ${userError.message}`);
  }

  // Create tenant access if provided
  if (userData.role === 'tenant_user' && userData.merchantId) {
    const { error: tenantError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: user.id,
        merchant_id: userData.merchantId,
        tenant_role: userData.tenantRole || 'user',
      });

    if (tenantError) {
      // Rollback user creation if tenant access creation fails
      await supabase.from('users').delete().eq('id', user.id);
      throw new Error(`Failed to create tenant access: ${tenantError.message}`);
    }
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/**
 * Update user last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update last login:', error);
  }
}

/**
 * Get all users (for super admin)
 */
export async function getAllUsers(): Promise<User[]> {
  const supabase = createServerClient();

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return (users || []).map((user): User => ({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));
}

/**
 * Get all merchants (for super admin)
 */
export async function getAllMerchants() {
  const supabase = createServerClient();

  const { data: merchants, error } = await supabase
    .from('mx_merchant_configs')
    .select('merchant_id, environment, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch merchants: ${error.message}`);
  }

  return merchants || [];
}