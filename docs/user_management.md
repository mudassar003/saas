# User Management System Implementation Guide

## Overview
Implement enterprise-grade multi-tenant authentication for medical practice SaaS using Next.js 15 + PostgreSQL + NextAuth.js.

## Current System Analysis
- **Existing**: Transaction processing system with 5 tables (`invoices`, `transactions`, `mx_merchant_configs`, `product_categories`, `sync_logs`)
- **Missing**: Authentication, authorization, multi-tenant isolation
- **Goal**: Secure multi-tenant system with 4 user roles

---

## Required Dependencies
```bash
npm install next-auth bcryptjs @upstash/ratelimit @upstash/redis zod
npm install @types/bcryptjs --save-dev
```

## Database Schema Changes

### 1. Create Authentication Tables
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  global_role TEXT CHECK (global_role IN ('superadmin', 'investor')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-tenant relationships
CREATE TABLE user_tenants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  merchant_id BIGINT REFERENCES mx_merchant_configs(merchant_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, merchant_id)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Enable Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mx_merchant_configs ENABLE ROW LEVEL SECURITY;

-- Create helper function
CREATE OR REPLACE FUNCTION user_is_member_of_tenant(p_user_id UUID, p_merchant_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = p_user_id AND merchant_id = p_merchant_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Data access policies
CREATE POLICY "tenant_data_access" ON transactions
FOR SELECT USING (
  user_is_member_of_tenant(auth.uid(), merchant_id)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND global_role IN ('superadmin', 'investor')
  )
);

-- Apply similar policies to invoices, mx_merchant_configs tables
```

---

## Implementation Requirements

### 1. Input Validation (Zod Schemas)
**File**: `lib/validation/auth-schemas.ts`

**Requirements**:
- Email validation with max 255 chars
- Password: min 8 chars, uppercase, lowercase, number, special char
- Name: 2-255 chars, letters/spaces only
- Role enum validation
- Export TypeScript types

### 2. Error Handling System
**File**: `lib/types/errors.ts`

**Requirements**:
- Define error types: `AuthenticationError`, `AuthorizationError`, `ValidationError`
- Use Result pattern: `Result<T, E> = { success: true; data: T } | { success: false; error: E }`
- Create utility functions for error creation

### 3. Security Middleware
**File**: `middleware.ts`

**Requirements**:
- Rate limiting: 5 login attempts per 15 minutes
- CSRF protection for POST requests
- Origin validation
- Security headers

### 4. Repository Pattern (DAL)
**File**: `lib/repositories/user-repository.ts`

**Requirements**:
- Interface `IUserRepository` with all CRUD operations
- Caching layer (5-minute TTL for user data)
- Password hashing with bcrypt (12 rounds)
- Transaction safety for user creation
- Proper error handling and logging

### 5. NextAuth.js Configuration
**File**: `pages/api/auth/[...nextauth].ts`

**Requirements**:
- Database session strategy (8-hour sessions)
- Credentials provider with validation
- Security event logging
- Permission-based JWT tokens
- Secure cookie settings

### 6. API Routes with Authorization
**Files**: `app/api/users/route.ts`, `app/api/tenants/route.ts`

**Requirements**:
- Input validation on all endpoints
- Role-based authorization checks
- Proper error responses
- Audit logging for admin actions

---

## User Roles & Permissions

### Role Hierarchy
1. **Super Admin**: Global access, create tenants
2. **Investor**: Read-only access to all tenants
3. **Tenant Admin**: Full access to own tenant, manage users
4. **Tenant User**: Read-only access to own tenant data

### Authorization Logic
```typescript
// Check if user can access tenant data
function canAccessTenant(userRole: string, userTenants: number[], targetTenant: number): boolean {
  if (userRole === 'superadmin' || userRole === 'investor') return true;
  return userTenants.includes(targetTenant);
}

// Check if user can manage tenant
function canManageTenant(userRole: string, userTenants: TenantMembership[], targetTenant: number): boolean {
  if (userRole === 'superadmin') return true;
  return userTenants.some(t => t.merchant_id === targetTenant && t.role === 'admin');
}
```

---

## Implementation Phases

### Phase 1: Security Foundation (Week 1)
1. Create input validation schemas
2. Implement error handling system  
3. Set up security middleware
4. Create database tables with RLS policies

### Phase 2: Authentication Core (Week 2)
1. Build repository pattern with caching
2. Configure NextAuth.js with security hardening
3. Create authentication logic with proper error handling
4. Add security event logging

### Phase 3: Authorization & APIs (Week 3)
1. Build user management API routes
2. Implement tenant management for Super Admins
3. Add role-based authorization middleware
4. Create permission checking utilities

### Phase 4: UI & Testing (Week 4)
1. Build login/logout pages
2. Create role-based dashboard routing
3. Add user management interfaces
4. Comprehensive security testing

---

## Critical Security Requirements

### Must-Have Security Features
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: All user input validated with Zod
- **SQL Injection Protection**: Use parameterized queries only
- **XSS Protection**: Sanitize all output
- **CSRF Protection**: Token validation on state-changing operations
- **Session Security**: HTTP-only cookies, proper expiration
- **Audit Logging**: Log all authentication and authorization events

### Compliance Requirements (HIPAA/SOC2)
- Database sessions (not JWT tokens)
- Comprehensive audit trails
- User data encryption at rest
- Secure password policies
- Session timeout controls

---

## Production Checklist

### Security Hardening
- [ ] Rate limiting implemented and tested
- [ ] All inputs validated with Zod schemas
- [ ] RLS policies tested for data isolation
- [ ] Security headers configured
- [ ] Audit logging functional

### Performance & Monitoring
- [ ] Database queries optimized with proper indexing
- [ ] Caching layer implemented for user data
- [ ] Error monitoring configured
- [ ] Health checks for authentication services

### Testing
- [ ] Unit tests for all authentication logic
- [ ] Integration tests for API routes
- [ ] Security penetration testing
- [ ] Multi-tenant isolation verified

**Estimated Timeline**: 4-6 weeks for production-ready implementation

**Key Success Metrics**: Zero security vulnerabilities, <100ms authentication response time, 99.9% uptime