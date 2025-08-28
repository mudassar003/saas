# Senior Developer Code Writing Guide - SaaS Multi-Tenant Architecture

## Project Context & Standards

### Our Architecture Foundation
- **Stack**: Next.js 15 + TypeScript + Prisma + PostgreSQL
- **Pattern**: Multi-tenant SaaS with Row-Level Security (RLS)
- **Auth**: NextAuth.js + Database Sessions (HIPAA compliant)
- **Database**: Supabase → AWS RDS migration ready
- **Deployment**: Vercel with enterprise scalability

---

## 🎯 Senior Developer Best Practices (2025)

### **1. TypeScript Mastery - Enterprise Grade**

#### ✅ **DO: Strict Type Safety**
```typescript
// Explicit return types and strict configurations
interface CreateUserRequest {
  email: string
  name: string
  tenantId: bigint
  role: TenantRole
}

interface CreateUserResponse {
  success: boolean
  user: User | null
  error?: string
}

export async function createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
  try {
    // Implementation with proper error handling
  } catch (error) {
    return { success: false, user: null, error: error.message }
  }
}
```

#### ❌ **DON'T: Type System Violations**
```typescript
// NEVER do this - kills type safety
const userData: any = await fetchUser() // ❌
function handleData(data: any): any { return data } // ❌

// Don't use implicit types in enterprise code
const user = await getUser() // ❌ - What type is user?
```

#### ✅ **DO: Advanced TypeScript Patterns**
```typescript
// Conditional types for multi-tenant operations
type TenantOperation<T extends string> = T extends 'read' 
  ? { action: 'read'; tenantId: bigint }
  : T extends 'write'
  ? { action: 'write'; tenantId: bigint; data: unknown }
  : never

// Branded types for tenant isolation
type TenantId = bigint & { readonly __brand: 'TenantId' }
type UserId = string & { readonly __brand: 'UserId' }

// Generic database operations with constraints
interface TenantAwareRepository<T extends { merchantId: bigint }> {
  findByTenant(tenantId: TenantId): Promise<T[]>
  create(data: Omit<T, 'id' | 'createdAt'>): Promise<T>
}
```

### **2. Database Architecture - Multi-Tenant Excellence**

#### ✅ **DO: Proper Tenant Isolation**
```typescript
// Always filter by tenant in all queries
export class InvoiceService {
  static async getInvoices(tenantId: bigint, options: FilterOptions): Promise<Invoice[]> {
    return prisma.invoice.findMany({
      where: {
        merchantId: tenantId, // ✅ Always include tenant filter
        ...options.filters
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Use RLS as defense in depth
  static async createInvoice(data: CreateInvoiceData, userId: string): Promise<Invoice> {
    // Set RLS context before operation
    await prisma.$executeRaw`SET app.current_user_id = ${userId}`
    
    return prisma.invoice.create({ data })
  }
}
```

#### ❌ **DON'T: Tenant Isolation Violations**
```typescript
// NEVER query without tenant context
const allInvoices = await prisma.invoice.findMany() // ❌ Security risk!

// Don't trust client-side tenant ID
export async function getInvoices(clientTenantId: string) { // ❌
  return prisma.invoice.findMany({
    where: { merchantId: BigInt(clientTenantId) } // ❌ Can be manipulated
  })
}
```

#### ✅ **DO: Database Pattern Excellence**
```typescript
// Shared schema with tenant_id pattern (our choice)
export class TenantAwareDAL {
  private static async validateTenantAccess(userId: string, tenantId: bigint): Promise<boolean> {
    const membership = await prisma.userTenant.findFirst({
      where: { userId, merchantId: tenantId }
    })
    return !!membership
  }

  static async secureQuery<T>(
    userId: string, 
    tenantId: bigint, 
    operation: (tenantId: bigint) => Promise<T>
  ): Promise<T> {
    // Validate user has access to tenant
    const hasAccess = await this.validateTenantAccess(userId, tenantId)
    if (!hasAccess) {
      throw new Error('Tenant access denied')
    }

    return operation(tenantId)
  }
}
```

### **3. Next.js 15 Architecture Patterns**

#### ✅ **DO: Server Components + Client Components Strategy**
```typescript
// Server Component - Data fetching with auth
export default async function DashboardPage({
  params
}: {
  params: Promise<{ tenantId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  
  const { tenantId } = await params
  const tenantIdBigInt = BigInt(tenantId)
  
  // Server-side tenant validation
  await validateTenantAccess(session.user.id, tenantIdBigInt)
  
  // Fetch data server-side with proper tenant context
  const invoices = await InvoiceService.getInvoices(tenantIdBigInt, {})
  
  return <DashboardClient initialData={invoices} tenantId={tenantIdBigInt} />
}

// Client Component - Interactivity
'use client'
export function DashboardClient({ initialData, tenantId }: DashboardClientProps) {
  const [invoices, setInvoices] = useState(initialData)
  
  return (
    <div>
      <InvoiceFilters onFilter={handleFilter} />
      <InvoiceTable invoices={invoices} />
    </div>
  )
}
```

#### ❌ **DON'T: Anti-Patterns**
```typescript
// Don't fetch data in client components without caching
'use client'
export function BadDashboard() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    // ❌ Client-side data fetching without caching
    fetch('/api/invoices').then(res => res.json()).then(setData)
  }, [])
  
  return <div>{data.map(...)}</div> // ❌ No loading states, error handling
}

// Don't mix server and client logic
export default function MixedComponent() {
  const session = await getServerSession() // ❌ Server logic
  const [state, setState] = useState() // ❌ Client logic in same component
}
```

#### ✅ **DO: Proper API Route Architecture**
```typescript
// API routes with proper validation and error handling
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId } = await params
    const tenantIdBigInt = BigInt(tenantId)

    // Authorization check
    const hasAccess = await validateTenantAccess(session.user.id, tenantIdBigInt)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Input validation
    const { searchParams } = new URL(request.url)
    const filterSchema = z.object({
      status: z.enum(['all', 'paid', 'pending']).default('all'),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0)
    })

    const filters = filterSchema.parse({
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    // Business logic
    const { invoices, totalCount } = await InvoiceService.getInvoices(tenantIdBigInt, filters)

    return NextResponse.json({
      success: true,
      data: { invoices, totalCount }
    })

  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### **4. Security Patterns - Enterprise Grade**

#### ✅ **DO: Defense in Depth**
```typescript
// Multiple layers of security
export class SecurityService {
  // Layer 1: Authentication
  static async validateSession(request: NextRequest): Promise<Session | null> {
    return await getServerSession(authOptions)
  }

  // Layer 2: Authorization  
  static async validateTenantAccess(userId: string, tenantId: bigint): Promise<boolean> {
    const membership = await prisma.userTenant.findFirst({
      where: { userId, merchantId: tenantId }
    })
    return !!membership
  }

  // Layer 3: Input Validation
  static validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data)
  }

  // Layer 4: RLS Enforcement
  static async setRLSContext(userId: string): Promise<void> {
    await prisma.$executeRaw`SET app.current_user_id = ${userId}`
  }
}

// Middleware for API protection
export async function withAuth<T>(
  handler: (request: NextRequest, context: { session: Session }) => Promise<T>
) {
  return async (request: NextRequest) => {
    const session = await SecurityService.validateSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return handler(request, { session })
  }
}
```

#### ❌ **DON'T: Security Anti-Patterns**
```typescript
// Don't trust client-side data
export async function updateInvoice(invoiceId: string, data: any) { // ❌
  // No validation of ownership/tenant access
  return prisma.invoice.update({
    where: { id: invoiceId },
    data // ❌ Unvalidated input
  })
}

// Don't expose sensitive data
export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true, // ❌ Never expose password hashes
      // ... other fields
    }
  })
}
```

### **5. Performance & Scalability Patterns**

#### ✅ **DO: Optimized Database Queries**
```typescript
// Efficient pagination with proper indexing
export class PerformantQueries {
  static async getPaginatedInvoices(tenantId: bigint, options: PaginationOptions) {
    // Use cursor-based pagination for large datasets
    const invoices = await prisma.invoice.findMany({
      where: { merchantId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: options.limit + 1, // Take one extra to check if there's a next page
      ...(options.cursor && { cursor: { id: options.cursor } }),
      include: {
        _count: {
          select: { invoiceItems: true }
        }
      }
    })

    const hasNextPage = invoices.length > options.limit
    if (hasNextPage) invoices.pop()

    return {
      invoices,
      hasNextPage,
      nextCursor: invoices[invoices.length - 1]?.id
    }
  }

  // Batch operations for efficiency
  static async bulkUpdateInvoices(tenantId: bigint, updates: BulkUpdateData[]) {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.invoice.update({
          where: { 
            id: update.id,
            merchantId: tenantId // Always include tenant filter
          },
          data: update.data
        })
      }
    })
  }
}
```

#### ✅ **DO: Caching Strategy**
```typescript
// Multi-layer caching approach
import { unstable_cache } from 'next/cache'

export const getCachedTenantData = unstable_cache(
  async (tenantId: bigint) => {
    return prisma.invoice.findMany({
      where: { merchantId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  },
  ['tenant-dashboard'],
  { 
    revalidate: 300, // 5 minutes
    tags: [`tenant-${tenantId}`] 
  }
)

// Cache invalidation
export async function invalidateTenantCache(tenantId: bigint) {
  revalidateTag(`tenant-${tenantId}`)
}
```

---

## ❌ Critical Mistakes to Avoid

### **1. Tenant Data Leakage**
```typescript
// ❌ NEVER: Query without tenant context
const invoices = await prisma.invoice.findMany() // Exposes all tenants' data

// ❌ NEVER: Trust client-provided tenant ID
export async function API(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') // ❌ Can be spoofed
  return getInvoices(tenantId)
}

// ✅ ALWAYS: Derive tenant from authenticated user
export async function API(req: NextRequest) {
  const session = await getServerSession()
  const tenantId = await getUserTenant(session.user.id)
  return getInvoices(tenantId)
}
```

### **2. Authentication/Authorization Bypasses**
```typescript
// ❌ NEVER: Skip auth checks
export async function deleteInvoice(invoiceId: string) {
  return prisma.invoice.delete({ where: { id: invoiceId } }) // ❌
}

// ✅ ALWAYS: Validate permissions
export async function deleteInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId },
    include: { merchant: true }
  })
  
  if (!invoice) throw new Error('Invoice not found')
  
  const hasAccess = await validateTenantAccess(userId, invoice.merchantId)
  if (!hasAccess) throw new Error('Access denied')
  
  return prisma.invoice.delete({ where: { id: invoiceId } })
}
```

### **3. Type Safety Violations**
```typescript
// ❌ NEVER: Use `any` in enterprise code
function processData(data: any): any { return data } // ❌

// ❌ NEVER: Ignore TypeScript errors
// @ts-ignore ❌
const result = unsafeOperation()

// ✅ ALWAYS: Proper typing
interface ProcessedData {
  id: string
  processedAt: Date
  status: 'success' | 'error'
}

function processData(data: RawData): ProcessedData {
  // Proper implementation with type safety
}
```

### **4. Performance Anti-Patterns**
```typescript
// ❌ NEVER: N+1 query problems
async function getInvoicesWithItems() {
  const invoices = await prisma.invoice.findMany()
  
  // ❌ This creates N+1 queries
  for (const invoice of invoices) {
    invoice.items = await prisma.invoiceItem.findMany({
      where: { invoiceId: invoice.id }
    })
  }
  return invoices
}

// ✅ ALWAYS: Use includes or batch operations
async function getInvoicesWithItems() {
  return prisma.invoice.findMany({
    include: { invoiceItems: true } // Single query with join
  })
}
```

### **5. Error Handling Sins**
```typescript
// ❌ NEVER: Silent failures
try {
  await riskyOperation()
} catch (error) {
  // ❌ Swallow errors silently
}

// ❌ NEVER: Expose internal errors to client
catch (error) {
  throw new Error(error.message) // ❌ May expose sensitive info
}

// ✅ ALWAYS: Proper error handling
try {
  await riskyOperation()
} catch (error) {
  // Log for debugging
  console.error('Operation failed:', error)
  
  // Return safe error to client
  throw new Error('Operation failed. Please try again.')
}
```

---

## 🏗️ Architecture Decision Records (ADRs)

### **When to Use Different Patterns**

#### **Multi-Tenant Database Strategies**
1. **Shared Schema + Tenant ID** (Our Choice)
   - ✅ Use for: 100-1000+ tenants, cost efficiency, simple maintenance
   - ❌ Avoid for: Strict regulatory requirements, custom schemas per tenant

2. **Schema Per Tenant**
   - ✅ Use for: Medium isolation needs, custom configurations per tenant
   - ❌ Avoid for: High tenant counts, simple applications

3. **Database Per Tenant**
   - ✅ Use for: Strict compliance, enterprise clients, custom performance needs
   - ❌ Avoid for: Cost-sensitive applications, high tenant counts

#### **Authentication Strategies**
1. **NextAuth + Database Sessions** (Our Choice)
   - ✅ Use for: HIPAA compliance, audit trails, enterprise requirements
   - ❌ Avoid for: Simple applications, high-performance real-time apps

2. **JWT Tokens**
   - ✅ Use for: Stateless applications, microservices, mobile apps
   - ❌ Avoid for: Compliance requirements, session management needs

---

## 📊 Code Quality Metrics & KPIs

### **Measurable Quality Standards**
- **Type Coverage**: >95% (use `typescript-coverage-report`)
- **Test Coverage**: >80% unit tests, >60% integration tests
- **Performance**: <200ms API response times
- **Security**: Zero tenant data leakage incidents
- **Maintainability**: <10 complexity per function

### **Code Review Checklist**
- [ ] All queries include tenant filtering
- [ ] Authentication/authorization checks present
- [ ] Input validation with Zod schemas
- [ ] Proper error handling and logging
- [ ] TypeScript strict mode compliance
- [ ] Performance considerations (N+1 queries, pagination)
- [ ] Security review (no data exposure, proper sanitization)

---

## 🔄 Continuous Improvement

### **Monthly Architecture Reviews**
1. **Security Audit**: Review all API endpoints for tenant isolation
2. **Performance Analysis**: Check query performance, identify bottlenecks
3. **Type Safety**: Ensure no `any` types in production code
4. **Database Optimization**: Review indexes, query patterns
5. **Code Quality**: Run linting, complexity analysis, dependency updates

### **Team Knowledge Sharing**
- Weekly architecture discussions
- Code review best practices
- Security incident post-mortems
- Performance optimization case studies

---

## 🎯 Success Metrics

### **Technical KPIs**
- **Zero Data Leakage**: No tenant can access another tenant's data
- **Sub-200ms Response**: 95th percentile API response times
- **99.9% Uptime**: High availability with proper error handling
- **100% Type Safety**: No runtime type errors in production

### **Developer Experience KPIs**
- **Fast Onboarding**: New developers productive within 1 week
- **Low Bug Rate**: <1 bug per 100 lines of code
- **High Confidence**: Developers can modify code without fear
- **Efficient Reviews**: Code reviews completed within 24 hours

This guide establishes the foundation for writing enterprise-grade, secure, and scalable multi-tenant SaaS code that can handle growth from hundreds to thousands of tenants while maintaining performance, security, and developer productivity.