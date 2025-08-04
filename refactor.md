# 🔄 Supabase to Prisma ORM Migration Guide

## 📋 Project Overview
**Project**: GameDay Men's Health Invoice Management System  
**Current Stack**: Next.js 14, TypeScript, Supabase  
**Target Stack**: Next.js 14, TypeScript, Prisma ORM  
**Migration Goal**: Replace Supabase client with Prisma ORM while maintaining all functionality

## 🎯 Migration Objectives
- [ ] Replace Supabase database client with Prisma ORM
- [ ] Maintain all existing functionality and API contracts
- [ ] Preserve data integrity and workflow states
- [ ] Improve type safety and developer experience
- [ ] Keep all existing environment variables except database connection

## ⚠️ Recent Changes
**ALL Export Functionality Removed**: Both Excel and CSV export functionality have been completely removed from the project. No export features remain.

## 📁 File Structure Analysis

### 🗑️ Files to DELETE
```
src/lib/supabase.ts - Supabase client configuration and types
```

### 🗑️ Files ALREADY REMOVED (Export Functionality Cleanup)
```
src/app/api/export/                           - DELETED: Entire export API directory
├── excel/route.ts                           - DELETED: Excel export functionality  
└── csv/route.ts                             - DELETED: CSV export functionality
src/components/export/                       - DELETED: Entire export components directory
└── export-dialog.tsx                       - DELETED: Export dialog component
```

### 📦 Dependencies REMOVED
```
excel4node   - REMOVED: Excel file generation library
papaparse    - REMOVED: CSV parsing/generation library
@types/papaparse - REMOVED: TypeScript types for papaparse
```

### 🆕 Files to CREATE
```
prisma/
├── schema.prisma              # Database schema definition
├── migrations/                # Auto-generated migration files
└── seed.ts                   # Database seeding script

src/lib/prisma.ts             # Prisma client singleton
```

### 🔧 Files to REFACTOR (Priority Order)

#### 1. **CRITICAL - Core Data Layer**
```
src/lib/dal.ts                # Complete rewrite - ALL database operations
src/lib/sync-service.ts       # Major refactor - sync operations
```

#### 2. **HIGH - API Routes**
```
src/app/api/invoices/route.ts                    # Invoice CRUD operations
src/app/api/transactions/route.ts                # Transaction operations
src/app/api/transactions/[id]/route.ts           # Individual transaction
src/app/api/invoices/[id]/data-sent/route.ts     # Invoice status updates
src/app/api/sync/transactions/route.ts           # Transaction sync
src/app/api/sync/logs/route.ts                   # Sync logging
src/app/api/sync/setup/route.ts                  # Sync configuration
src/app/api/webhooks/mx-merchant/route.ts        # Webhook handling
src/app/api/check-updates/route.ts               # Update checking
src/app/api/data-sent/route.ts                   # Data sent tracking
```

#### 3. **MEDIUM - Server Actions & Pages**
```
src/app/dashboard/invoices/[id]/actions.ts       # Server actions
src/app/dashboard/invoices/[id]/page.tsx         # Invoice detail page
src/app/dashboard/page.tsx                       # Main dashboard
```

#### 4. **LOW - Components (Indirect Usage)**
```
src/components/sync/sync-dialog.tsx              # Sync UI components
src/components/sync/sync-dashboard.tsx           # Sync dashboard
src/components/invoice/invoice-table.tsx         # Invoice display
```

## 🗄️ Database Schema Migration

### Required Tables in Prisma Schema
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  
  @@map("users")
}

model MxMerchantConfig {
  id                    String   @id @default(cuid())
  user_id               String   @unique
  mx_merchant_user_guid String
  base_url              String
  access_token          String
  token_expires_at      DateTime?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  
  @@map("mx_merchant_configs")
}

model Invoice {
  id                      String    @id @default(cuid())
  mx_invoice_id           String    @unique
  invoice_number          String
  patient_name            String?
  patient_email           String?
  invoice_date            DateTime
  due_date                DateTime?
  amount                  Decimal   @db.Decimal(10,2)
  status                  String
  
  // Workflow fields - CRITICAL to preserve
  data_sent_status        String?   @default("pending")
  data_sent_at            DateTime?
  ordered_by_provider_at  DateTime?
  
  // MX Merchant fields
  mx_created_at           DateTime
  mx_updated_at           DateTime
  
  created_at              DateTime  @default(now())
  updated_at              DateTime  @updatedAt
  
  // Relations
  items                   InvoiceItem[]
  
  @@map("invoices")
  @@index([data_sent_status])
  @@index([invoice_date])
  @@index([mx_invoice_id])
}

model InvoiceItem {
  id               String  @id @default(cuid())
  invoice_id       String
  mx_item_id       String?
  product_name     String
  quantity         Int
  unit_price       Decimal @db.Decimal(10,2)
  total_price      Decimal @db.Decimal(10,2)
  
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  
  // Relations
  invoice          Invoice @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
  
  @@map("invoice_items")
  @@index([invoice_id])
}

model Transaction {
  id                    String   @id @default(cuid())
  mx_transaction_id     String   @unique
  mx_invoice_id         String?
  amount                Decimal  @db.Decimal(10,2)
  status                String
  payment_method        String?
  transaction_date      DateTime
  
  // MX Merchant fields
  mx_created_at         DateTime
  mx_updated_at         DateTime
  
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  
  @@map("transactions")
  @@index([mx_invoice_id])
  @@index([transaction_date])
}

model SyncLog {
  id                String    @id @default(cuid())
  sync_type         String    // 'invoices', 'transactions', 'invoice_products'
  status            String    // 'running', 'completed', 'failed'
  started_at        DateTime  @default(now())
  completed_at      DateTime?
  error_message     String?
  records_processed Int?      @default(0)
  records_total     Int?      @default(0)
  
  @@map("sync_logs")
  @@index([sync_type, status])
  @@index([started_at])
}
```

## 🔧 Implementation Steps

### Phase 1: Setup Prisma
```bash
# 1. Install Prisma
npm install prisma @prisma/client
npm install -D prisma

# 2. Initialize Prisma
npx prisma init

# 3. Create schema (copy above schema to prisma/schema.prisma)

# 4. Generate client
npx prisma generate

# 5. Run initial migration
npx prisma migrate dev --name init
```

### Phase 2: Create Prisma Client
Create `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Phase 3: Refactor Core Data Layer

#### `src/lib/dal.ts` - Complete Rewrite Required

**BEFORE (Supabase):**
```typescript
import { supabaseAdmin } from './supabase'

export class DAL {
  async getInvoices(page: number, limit: number, filters: any) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .range((page - 1) * limit, page * limit - 1)
    
    return { data, error }
  }
}
```

**AFTER (Prisma):**
```typescript
import { prisma } from './prisma'

export class DAL {
  async getInvoices(page: number, limit: number, filters: any) {
    try {
      const data = await prisma.invoice.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: true
        },
        orderBy: {
          invoice_date: 'desc'
        }
      })
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}
```

#### Key Methods to Refactor in DAL:

1. **User Management**
```typescript
// OLD: supabaseAdmin.from('users').upsert()
// NEW: prisma.user.upsert()
async upsertUser(userData: any) {
  return await prisma.user.upsert({
    where: { email: userData.email },
    update: userData,
    create: userData
  })
}
```

2. **Bulk Invoice Insert**
```typescript
// OLD: supabaseAdmin.from('invoices').insert()
// NEW: prisma.invoice.createMany()
async bulkInsertInvoices(invoices: any[]) {
  return await prisma.invoice.createMany({
    data: invoices,
    skipDuplicates: true
  })
}
```

3. **Complex Queries with Relations**
```typescript
// OLD: Complex Supabase joins
// NEW: Prisma relations
async getInvoiceById(id: string) {
  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true
    }
  })
}
```

### Phase 4: Update API Routes

#### Pattern for API Route Migration:
```typescript
// BEFORE (Supabase)
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin.from('invoices').select('*')
  return Response.json(data)
}

// AFTER (Prisma)
import { prisma } from '@/lib/prisma'

export async function GET() {
  const data = await prisma.invoice.findMany()
  return Response.json(data)
}
```

### Phase 5: Update Type Imports

#### Remove Supabase Types:
```typescript
// DELETE these imports
import { Tables, Inserts, Updates } from '@/lib/supabase'
type InvoiceType = Tables<'invoices'>
```

#### Add Prisma Types:
```typescript
// ADD these imports
import { Invoice, InvoiceItem } from '@prisma/client'
type InvoiceWithItems = Invoice & { items: InvoiceItem[] }
```

#### Updated Export Types (All Export Removed):
```typescript
// REMOVED: ExportOptions interface completely deleted
// No export functionality remains in the system
```

## 🔄 Specific Migration Patterns

### 1. Query Patterns
```typescript
// Supabase → Prisma Query Mapping

// SELECT with filtering
supabaseAdmin.from('invoices').select('*').eq('status', 'paid')
→ prisma.invoice.findMany({ where: { status: 'paid' } })

// SELECT with pagination
supabaseAdmin.from('invoices').select('*').range(0, 9)
→ prisma.invoice.findMany({ skip: 0, take: 10 })

// INSERT single
supabaseAdmin.from('invoices').insert(data)
→ prisma.invoice.create({ data })

// INSERT multiple
supabaseAdmin.from('invoices').insert(dataArray)
→ prisma.invoice.createMany({ data: dataArray })

// UPDATE
supabaseAdmin.from('invoices').update(data).eq('id', id)
→ prisma.invoice.update({ where: { id }, data })

// DELETE
supabaseAdmin.from('invoices').delete().eq('id', id)
→ prisma.invoice.delete({ where: { id } })

// Complex joins
supabaseAdmin.from('invoices').select('*, invoice_items(*)')
→ prisma.invoice.findMany({ include: { items: true } })
```

### 2. Error Handling Patterns
```typescript
// Supabase pattern
const { data, error } = await supabaseAdmin.from('table').select('*')
if (error) throw error
return data

// Prisma pattern
try {
  const data = await prisma.table.findMany()
  return data
} catch (error) {
  throw error
}
```

### 3. Transaction Patterns
```typescript
// Supabase (limited transaction support)
// Multiple separate calls

// Prisma (full transaction support)
await prisma.$transaction(async (tx) => {
  await tx.invoice.create({ data: invoiceData })
  await tx.invoiceItem.createMany({ data: itemsData })
})
```

## 🧪 Environment Variables

### Update `.env.local`:
```bash
# REMOVE these Supabase variables:
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# ADD this Prisma variable:
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# KEEP all existing MX Merchant and other variables:
MX_MERCHANT_BASE_URL=
MX_MERCHANT_CLIENT_ID=
MX_MERCHANT_CLIENT_SECRET=
# ... etc
```

## 🧪 Testing Strategy

### 1. Data Integrity Tests
```typescript
// Test workflow field preservation
const invoice = await prisma.invoice.findFirst({
  where: { data_sent_status: 'sent' }
})
expect(invoice.data_sent_at).toBeTruthy()
expect(invoice.ordered_by_provider_at).toBeTruthy()
```

### 2. API Contract Tests
```typescript
// Ensure API responses remain unchanged
const response = await fetch('/api/invoices')
const data = await response.json()
expect(data).toHaveProperty('invoices')
expect(data.invoices[0]).toHaveProperty('mx_invoice_id')
```

### 3. Performance Tests
```typescript
// Test bulk operations
const startTime = performance.now()
await prisma.invoice.createMany({ data: largeBatch })
const endTime = performance.now()
expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
```

## ⚠️ Critical Migration Notes

### 1. **PRESERVE WORKFLOW DATA**
- `data_sent_status` - Critical for invoice workflow
- `data_sent_at` - Timestamp tracking
- `ordered_by_provider_at` - Provider order tracking

### 2. **MAINTAIN API CONTRACTS**
- All existing API endpoints must return same data structure
- Pagination formats must remain consistent
- Error response formats must match

### 3. **MX MERCHANT INTEGRATION**
- All `mx_*` fields must be preserved exactly
- Webhook handling must remain functional
- API token management must work seamlessly

### 4. **PERFORMANCE REQUIREMENTS**
- Bulk invoice inserts must handle 1000+ records
- Dashboard loading must remain under 2 seconds
- Export functionality must handle large datasets

### 5. **TRANSACTION SAFETY**
- Use Prisma transactions for multi-table operations
- Ensure rollback capability for failed operations
- Maintain data consistency during sync operations

## 🚀 Deployment Checklist

### Pre-Migration
- [ ] Backup current database
- [ ] Test Prisma schema generation
- [ ] Verify all environment variables
- [ ] Run local development tests

### Migration
- [ ] Install Prisma packages
- [ ] Create schema and run migrations
- [ ] Update all DAL methods
- [ ] Refactor API routes
- [ ] Update type imports
- [ ] Test all functionality locally

### Post-Migration
- [ ] Verify sync operations work
- [ ] Test invoice workflow states
- [ ] Validate export functionality
- [ ] Check MX Merchant integration
- [ ] Monitor performance metrics
- [ ] Update documentation

## 🔍 Validation Tests

Run these commands to verify migration success:

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Check database connection
npx prisma db pull

# 3. Validate schema
npx prisma validate

# 4. Run development server
npm run dev

# 5. Test critical endpoints
curl http://localhost:3000/api/invoices
curl http://localhost:3000/api/transactions
curl http://localhost:3000/api/sync/logs
```

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Next.js with Prisma](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/using-prisma-with-nextjs)

---

**Migration Complexity**: High  
**Estimated Time**: 3-5 days  
**Risk Level**: Medium (with proper testing)  
**Business Impact**: None (if executed correctly)

---



