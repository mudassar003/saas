# User Management System Implementation Guide

## Project Context & Requirements

### Current System State
- **Next.js 15** + **TypeScript** + **Supabase PostgreSQL**
- **Existing Tables**: `invoices`, `transactions`, `mx_merchant_configs`, `users` (basic)
- **Current Auth**: No authentication system (needs implementation)
- **Target**: Multi-tenant SaaS for medical practices (private/internal use)

### Strategic Requirements
- **Database Portability**: Must support future migration to AWS RDS (HIPAA compliant)
- **No Vendor Lock-in**: Custom auth implementation using NextAuth.js + PostgreSQL
- **Multi-Tenant**: 4 user roles with proper tenant isolation
- **Security**: Row-Level Security (RLS) for data isolation
- **Private Entity**: No 2FA needed, admin-only user creation

---

## User Roles & Access Levels

### 1. **Super Admin** - Global System Administrators
- **Access**: All tenants, all data, full CRUD
- **Capabilities**:
  - Create/manage tenants (medical practices)
  - Create/manage all user types
  - View any tenant's data
  - System configuration and settings
  - Initial data onboarding for tenants

### 2. **Investor** - Read-Only Global Observers  
- **Access**: All tenants, read-only
- **Capabilities**:
  - View all tenant dashboards and analytics
  - Switch between tenant contexts
  - Export reports and data
- **Restrictions**: No create/update/delete operations

### 3. **Tenant Admin** - Single Tenant Administrators
- **Access**: Own tenant only, full CRUD within tenant
- **Capabilities**:
  - Manage tenant users (create/delete staff)
  - Trigger data sync from MX Merchant
  - Full access to tenant's invoices/transactions
  - Update tenant settings
- **Restrictions**: Cannot access other tenants

### 4. **Tenant User** - Limited Single Tenant Users
- **Access**: Own tenant only, mostly read-only
- **Capabilities**:
  - View tenant dashboards
  - update all updateable columns all permission of admin only cant use manual sync
- **Restrictions**: No user management, no admin functions

---

## Database Schema Implementation

### Phase 1: Essential Tables Only

#### 1. Enhanced Users Table
```sql
-- Extend existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS global_role TEXT CHECK (global_role IN ('superadmin', 'investor'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_global_role ON users(global_role) WHERE global_role IS NOT NULL;
```

#### 2. User-Tenant Membership Table
```sql
CREATE TABLE IF NOT EXISTS user_tenants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  merchant_id BIGINT REFERENCES mx_merchant_configs(merchant_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  PRIMARY KEY (user_id, merchant_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_tenants_merchant ON user_tenants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_role ON user_tenants(user_id, role);
```

#### 3. Sessions Table (Database Sessions for HIPAA)
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
```

#### 4. Optional: Tenant Display Names
```sql
-- Add friendly name to existing mx_merchant_configs
ALTER TABLE mx_merchant_configs ADD COLUMN IF NOT EXISTS tenant_name TEXT;
```

---

## NextAuth.js Implementation

### Configuration Structure
```typescript
// pages/api/auth/[...nextauth].ts
export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "database",  // HIPAA compliant
    maxAge: 72 * 60 * 60    // 72 hours
  },
  
  adapter: CustomPostgreSQLAdapter, // Our custom adapter
  
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        return await authenticateUser(credentials)
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.global_role || 'tenant_user'
        token.tenant_id = user.merchant_id
        token.is_tenant_admin = user.is_tenant_admin
      }
      return token
    },
    
    async session({ session, user, token }) {
      session.user.role = token.role
      session.user.tenant_id = token.tenant_id
      session.user.is_tenant_admin = token.is_tenant_admin
      return session
    }
  },
  
  pages: {
    signIn: '/auth/signin',    // Custom login page
    error: '/auth/error'       // Custom error page
  }
}
```

### Authentication Logic
```typescript
// lib/auth.ts
export async function authenticateUser(credentials: { email: string, password: string }) {
  // 1. Find user by email
  const user = await getUserByEmail(credentials.email)
  if (!user || !user.is_active) return null
  
  // 2. Verify password
  const isValid = await bcrypt.compare(credentials.password, user.password_hash)
  if (!isValid) return null
  
  // 3. Get tenant associations and roles
  const tenantMemberships = await getUserTenantMemberships(user.id)
  
  // 4. Update last login
  await updateLastLogin(user.id)
  
  // 5. Return user object with role context
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    global_role: user.global_role,
    merchant_id: tenantMemberships[0]?.merchant_id || null,
    is_tenant_admin: tenantMemberships.some(m => m.role === 'admin'),
    tenants: tenantMemberships
  }
}
```

---

## Row Level Security (RLS) Implementation

### Enable RLS on All Tables
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mx_merchant_configs ENABLE ROW LEVEL SECURITY;
```

### Helper Function for Membership Check
```sql
CREATE OR REPLACE FUNCTION user_is_member_of_tenant(p_user_id UUID, p_merchant_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = p_user_id AND merchant_id = p_merchant_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Data Table Policies (Transactions, Invoices)
```sql
-- SELECT: User can read if they belong to tenant OR are global admin/investor
CREATE POLICY "tenant_select" ON transactions
FOR SELECT
USING (
  user_is_member_of_tenant(auth.uid(), merchant_id)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND global_role IN ('superadmin', 'investor')
  )
);

-- INSERT: Only tenant members or superadmin
CREATE POLICY "tenant_insert" ON transactions
FOR INSERT
WITH CHECK (
  user_is_member_of_tenant(auth.uid(), merchant_id)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND global_role = 'superadmin'
  )
);

-- UPDATE: Only tenant admins or superadmin
CREATE POLICY "tenant_update" ON transactions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.merchant_id = transactions.merchant_id 
    AND ut.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND global_role = 'superadmin'
  )
);
```

### Administrative Table Policies
```sql
-- mx_merchant_configs: Only superadmin can manage tenants
CREATE POLICY "superadmin_tenants" ON mx_merchant_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND global_role = 'superadmin'
  )
);

-- user_tenants: Superadmin or tenant admin can manage memberships
CREATE POLICY "membership_management" ON user_tenants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND global_role = 'superadmin'
  )
  OR (
    auth.uid() IN (
      SELECT ut2.user_id FROM user_tenants ut2 
      WHERE ut2.merchant_id = user_tenants.merchant_id 
      AND ut2.role = 'admin'
    )
  )
);
```

---

## API Routes Implementation

### User Management APIs

#### Create User (POST /api/users)
```typescript
// Protected: Super Admin or Tenant Admin only
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { email, name, password, merchant_id, role } = await request.json()
  
  // Authorization check
  if (session.user.role !== 'superadmin') {
    // Tenant Admin can only create users for their tenant
    if (!canManageTenant(session.user.id, merchant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  
  // Create user and membership
  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await createUser({ email, name, password_hash: hashedPassword, created_by: session.user.id })
  await createUserTenantMembership(user.id, merchant_id, role)
  
  return NextResponse.json({ success: true, user })
}
```

#### List Users (GET /api/users)
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  let users
  if (session.user.role === 'superadmin') {
    users = await getAllUsers()
  } else if (session.user.is_tenant_admin) {
    users = await getTenantUsers(session.user.tenant_id)
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  return NextResponse.json({ users })
}
```

### Tenant Management APIs

#### Create Tenant (POST /api/tenants) - Super Admin Only
```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const { tenant_name, merchant_id, consumer_key, consumer_secret, admin_email, admin_name } = await request.json()
  
  // Create tenant and initial admin user
  const tenant = await createTenant({
    tenant_name,
    merchant_id,
    consumer_key,
    consumer_secret,
    created_by: session.user.id
  })
  
  const adminUser = await createUser({
    email: admin_email,
    name: admin_name,
    password_hash: await bcrypt.hash(generateTempPassword(), 12),
    created_by: session.user.id
  })
  
  await createUserTenantMembership(adminUser.id, merchant_id, 'admin')
  
  return NextResponse.json({ success: true, tenant, admin_user: adminUser })
}
```

---

## UI Components & Pages

### Dashboard Routes by Role

#### Super Admin Dashboard
- **Route**: `/admin/dashboard`
- **Features**:
  - List all tenants
  - Create new tenants
  - Tenant impersonation/switching
  - Global user management
  - System health metrics

#### Investor Dashboard  
- **Route**: `/investor/dashboard`
- **Features**:
  - Tenant selection dropdown
  - Read-only analytics across tenants
  - Export functionality
  - Financial metrics and reports

#### Tenant Admin Dashboard
- **Route**: `/dashboard` (default after login)
- **Features**:
  - Tenant data management
  - User management for tenant
  - Data sync triggers
  - Tenant settings

#### Tenant User Dashboard
- **Route**: `/dashboard` (limited view)
- **Features**:
  - View tenant data
  - Limited export capabilities
  - Basic reporting

### Auth Pages
- **Login**: `/auth/signin` - Email/password form
- **Error**: `/auth/error` - Auth error handling

---

## Data Access Layer (DAL)

### User Management Functions
```typescript
// lib/user-dal.ts
export class UserDAL {
  static async createUser(userData: CreateUserData): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create user: ${error.message}`)
    return data
  }
  
  static async getUserWithTenants(userId: string): Promise<UserWithTenants | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        user_tenants (
          merchant_id,
          role,
          mx_merchant_configs (
            tenant_name,
            merchant_id
          )
        )
      `)
      .eq('id', userId)
      .single()
    
    return error ? null : data
  }
  
  static async createUserTenantMembership(userId: string, merchantId: number, role: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_tenants')
      .insert({ user_id: userId, merchant_id: merchantId, role })
    
    if (error) throw new Error(`Failed to create membership: ${error.message}`)
  }
}
```

---

## Implementation Phases

### Phase 1: Database Setup
1. Run schema migrations for new tables
2. Set up RLS policies
3. Create helper functions
4. Seed initial Super Admin user

### Phase 2: NextAuth Configuration
1. Install and configure NextAuth.js
2. Create custom PostgreSQL adapter
3. Implement authentication logic
4. Set up session management

### Phase 3: API Routes
1. User management endpoints
2. Tenant management endpoints  
3. Role-based authorization middleware
4. Data access validation

### Phase 4: UI Implementation
1. Login/logout pages
2. Role-based dashboard components
3. User management interfaces
4. Tenant management (Super Admin)

### Phase 5: Testing & Security
1. Test all role permissions
2. Verify RLS policy effectiveness
3. Security audit and penetration testing
4. Performance optimization

---

## Security Considerations

### Password Security
- **bcrypt** with salt rounds ≥ 12
- Minimum 8 character passwords
- No password reuse (future enhancement)

### Session Security
- Database sessions (HIPAA compliant)
- 8-hour session timeout
- Secure HTTP-only cookies
- CSRF protection enabled

### Data Protection
- RLS policies on all multi-tenant tables
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Access Control
- Role-based permissions at API level
- Database-level enforcement via RLS
- Tenant isolation guaranteed
- Audit trail ready (future phase)

---

## Migration Strategy (Future AWS RDS)

This implementation is designed for easy migration:

1. **Database Export**: Standard PostgreSQL dump/restore
2. **Schema Compatibility**: All SQL is standard PostgreSQL
3. **No Vendor Dependencies**: Pure NextAuth.js + PostgreSQL
4. **Environment Variables**: Easy credential switching
5. **HIPAA Ready**: Database sessions and audit trail support

---

## Next Steps for Implementation

1. **First**: Set up Prisma ORM for type-safe database operations
2. **Then**: Follow this guide for user management system
3. **Testing**: Implement with test users and roles
4. **Production**: Deploy with proper environment configuration

This system provides enterprise-grade security, scalability, and compliance readiness while maintaining database portability and avoiding vendor lock-in.