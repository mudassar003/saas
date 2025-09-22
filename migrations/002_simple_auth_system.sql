-- Simple Multi-Tenant Authentication System
-- Compatible with PostgreSQL/Supabase, portable to AWS RDS
-- Run this script in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE - Main authentication table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  role VARCHAR(20) NOT NULL DEFAULT 'tenant_user',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add role constraint with proper validation
ALTER TABLE users ADD CONSTRAINT chk_user_role
  CHECK (role IN ('super_admin', 'tenant_user'));

-- Add email format constraint (basic validation)
ALTER TABLE users ADD CONSTRAINT chk_user_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 2. USER_TENANTS TABLE - Links users to specific merchants
CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id BIGINT NOT NULL, -- Links to mx_merchant_configs.merchant_id
  tenant_role VARCHAR(20) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one user-tenant relationship per user per merchant
  CONSTRAINT unique_user_merchant UNIQUE(user_id, merchant_id)
);

-- Add tenant role constraint
ALTER TABLE user_tenants ADD CONSTRAINT chk_tenant_role
  CHECK (tenant_role IN ('admin', 'user', 'viewer'));

-- 3. PERFORMANCE INDEXES

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);

-- User_tenants table indexes
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_merchant_id ON user_tenants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_active ON user_tenants(merchant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_tenants_lookup ON user_tenants(user_id, merchant_id, is_active);

-- 4. UPDATE TIMESTAMP TRIGGERS (PostgreSQL function)

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tenants_updated_at ON user_tenants;
CREATE TRIGGER update_user_tenants_updated_at
  BEFORE UPDATE ON user_tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. CREATE DEFAULT SUPER ADMIN (Optional - Comment out if not needed)
-- Password: 'admin123' (change immediately after first login)
-- Hash generated with bcrypt rounds=12
/*
INSERT INTO users (email, first_name, last_name, password_hash, role, is_active)
VALUES (
  'admin@company.com',
  'Super',
  'Admin',
  '$2b$12$LQv3c1yqBwEHFpA9cRGjf.JnZ7rSWQvD8xKlOcKtx8kKsGqH4kGyu', -- admin123
  'super_admin',
  true
)
ON CONFLICT (email) DO NOTHING;
*/

-- 6. SECURITY POLICIES (Row Level Security) - Optional for enhanced security
-- Uncomment if you want RLS enabled

/*
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY users_own_data ON users
  FOR ALL USING (id = current_user_id());

-- Policy: Users can see tenant relationships they belong to
CREATE POLICY user_tenants_own_data ON user_tenants
  FOR ALL USING (user_id = current_user_id());

-- Function to get current user ID (implement based on your session management)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Implement your session user ID logic here
  -- Example: RETURN COALESCE(current_setting('app.current_user_id', true)::UUID, NULL);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- 7. USEFUL QUERIES FOR APPLICATION

-- Query: Get user with tenant access
/*
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_active,
  u.last_login_at,
  COALESCE(
    json_agg(
      json_build_object(
        'merchant_id', ut.merchant_id,
        'tenant_role', ut.tenant_role,
        'is_active', ut.is_active
      )
    ) FILTER (WHERE ut.merchant_id IS NOT NULL),
    '[]'::json
  ) as tenant_access
FROM users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id AND ut.is_active = true
WHERE u.email = 'user@example.com' AND u.is_active = true
GROUP BY u.id;
*/

-- Query: Get all users for a specific tenant (for super admin)
/*
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  ut.tenant_role,
  ut.is_active as tenant_access_active,
  ut.created_at as access_granted_at
FROM users u
JOIN user_tenants ut ON u.id = ut.user_id
WHERE ut.merchant_id = 1000095245
  AND u.is_active = true
  AND ut.is_active = true
ORDER BY u.created_at DESC;
*/

-- Query: Get all tenants for super admin
/*
SELECT
  mc.merchant_id,
  mc.environment,
  mc.is_active,
  mc.created_at,
  COUNT(DISTINCT ut.user_id) as user_count
FROM mx_merchant_configs mc
LEFT JOIN user_tenants ut ON mc.merchant_id = ut.merchant_id AND ut.is_active = true
WHERE mc.is_active = true
GROUP BY mc.merchant_id, mc.environment, mc.is_active, mc.created_at
ORDER BY mc.created_at DESC;
*/

COMMENT ON TABLE users IS 'Main authentication table for multi-tenant SaaS application';
COMMENT ON TABLE user_tenants IS 'Links users to specific merchant tenants with role-based access';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash of user password (never store plain text)';
COMMENT ON COLUMN user_tenants.merchant_id IS 'Links to mx_merchant_configs.merchant_id for tenant isolation';
COMMENT ON COLUMN user_tenants.tenant_role IS 'Tenant-specific role: admin, user, or viewer';