# GameDay Men's Health - MX Merchant Transaction & Invoice Sync System

## Current Problem Statement

Client Requirement: "MX Merchant tracks all 'Transactions' but every 'Transaction' does not have a corresponding 'Invoice'. If we are just pulling 'Invoice' data, then we will miss some of the 'Transactions'. Example: If there are 10 transactions, only 8 may have corresponding invoices. So, we need every 'Transaction' captured, and then associate all available 'Invoices' to the 'Transactions'."

Current Issue: The system only fetches invoices via GET /checkout/v3/invoice, missing standalone transactions (QuickPay, POS payments without invoices).

---

## What's Currently Implemented

### MX Merchant Integration (Invoice-Only)
Current endpoints used:
- GET /checkout/v3/invoice              # List all invoices with pagination
- GET /checkout/v3/invoice/{invoiceId}  # Get invoice details with products

### Data Storage Strategy
- Supabase Database: All invoice data stored locally
- Initial Sync: Full historical invoice sync via /api/sync/setup
- Incremental Sync: Cron job + manual sync for new/updated invoices
- Sync Logging: Complete audit trail in sync_logs table

### Current Database Schema
What we have:
- invoices          # MX Merchant invoice data + nurse workflow
- invoice_items     # Product details from invoices
- sync_logs         # Audit trail
- users             # Clerk authentication
- mx_merchant_configs # API credentials

### Dashboard Features
- Invoice table with filtering and pagination
- Nurse workflow tracking ("Ordered by Provider")
- Export capabilities (Excel/CSV)
- Auto-sync monitoring

---

## What's Missing (The Core Problem)

### Transaction Data Gap
Missing endpoints:
- GET /checkout/v3/payment              # List ALL transactions
- GET /checkout/v3/payment/{paymentId}  # Get transaction details

### Missing Database Structure
What we need to add:
- transactions      # ALL payment transactions from MX Merchant
  - payment_id (MX transaction ID)
  - amount
  - transaction_date
  - payment_method
  - card_last4
  - status
  - invoice_id (nullable - links to invoices table when applicable)
  - merchant_id
  - raw_data

### Missing Sync Logic
- No transaction sync implementation
- No linking logic between transactions and invoices
- Webhook handler exists but ignores non-invoice payments

---

## API Response Analysis (Transaction Data)

### MX Merchant Payment API Response Structure
```json
{
  "recordCount": 10,
  "records": [
    {
      "id": 4000000050326218,
      "amount": "155.25",
      "created": "2025-07-24T10:01:50.51Z",
      "status": "Declined", // or "Approved"
      "invoice": "2484", // KEY: Links to invoice number
      "clientReference": "2484",
      "customerName": "Anthony Massey",
      "customerCode": "05K4Y006HCZH",
      "merchantId": 1000095245,
      "authCode": "814825",
      "authMessage": "Approved and completed successfully",
      "responseCode": 0,
      "reference": "520510705231",
      "cardAccount": {
        "cardType": "Visa",
        "last4": "7604",
        "token": "PgP3goOxVMUnVZ8QSgEdpqT7fbVtyY66"
      },
      "currency": "USD",
      "tax": "6.18",
      "surchargeAmount": "5.25",
      "surchargeLabel": "admin fee",
      "tenderType": "Card",
      "type": "Sale",
      "source": "Recurring",
      "batch": "Z03H5",
      "refundedAmount": "0",
      "settledAmount": "0"
    }
  ]
}
```

### Key Observations
1. All sample transactions have `invoice` field - These link to invoices
2. `invoice` field contains invoice number - Perfect for linking to existing invoices table
3. Rich payment data - Card details, auth codes, status, amounts
4. Need to test for standalone transactions - Sample shows only invoice-linked transactions

---

## Required Implementation Plan

### 1. Extend MX Merchant Client
Add to MXMerchantClient class:
- async getPayments(params: { limit?: number; offset?: number; merchantId?: string }): Promise<MXPaymentListResponse>
- async getPaymentDetail(paymentId: number): Promise<MXPaymentDetail>
- async getAllTransactionsAndInvoices(): Promise<{ transactions: MXPayment[]; invoices: MXInvoice[]; }>

### 2. Create Transaction Database Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- MX Merchant Transaction Fields
  mx_payment_id BIGINT UNIQUE NOT NULL,              -- id
  amount DECIMAL(10,2) NOT NULL,                     -- amount
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL, -- created
  status VARCHAR(20) NOT NULL,                       -- status
  
  -- Invoice Linking
  mx_invoice_number INTEGER,                         -- invoice (nullable for standalone)
  invoice_id UUID REFERENCES invoices(id),          -- Link to our invoices table
  client_reference VARCHAR(50),                     -- clientReference
  
  -- Customer Info
  customer_name VARCHAR(255),                       -- customerName  
  customer_code VARCHAR(50),                        -- customerCode
  
  -- Payment Details
  auth_code VARCHAR(20),                            -- authCode
  auth_message TEXT,                                -- authMessage
  response_code INTEGER,                            -- responseCode
  reference_number VARCHAR(50),                     -- reference
  
  -- Card Details
  card_type VARCHAR(20),                            -- cardAccount.cardType
  card_last4 VARCHAR(4),                            -- cardAccount.last4
  card_token VARCHAR(255),                          -- cardAccount.token
  
  -- Financial Details
  currency VARCHAR(3) DEFAULT 'USD',                -- currency
  tax_amount DECIMAL(10,2),                         -- tax
  surcharge_amount DECIMAL(10,2),                   -- surchargeAmount
  surcharge_label VARCHAR(100),                     -- surchargeLabel
  refunded_amount DECIMAL(10,2) DEFAULT 0,          -- refundedAmount
  settled_amount DECIMAL(10,2) DEFAULT 0,           -- settledAmount
  
  -- Transaction Metadata
  tender_type VARCHAR(20),                          -- tenderType
  transaction_type VARCHAR(20),                     -- type
  source VARCHAR(50),                               -- source
  batch VARCHAR(50),                                -- batch
  merchant_id BIGINT,                               -- merchantId
  
  -- System Fields
  user_id UUID REFERENCES users(id),
  raw_data JSONB,                                   -- Store full API response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. New Sync Strategy
Modified sync process:
1. Fetch ALL transactions via GET /checkout/v3/payment
2. Fetch ALL invoices via GET /checkout/v3/invoice (existing)
3. Link transactions to invoices where invoice_id exists in transaction data
4. Store unlinked transactions as standalone records
5. Preserve existing nurse workflow data on invoices

### 4. Update Dashboard to Show All Transactions
New dashboard view:
- Primary view: ALL transactions (with/without invoices)
- Columns: Date, Amount, Payment Method, Invoice# (or "N/A"), Status
- Filter: "All Transactions", "With Invoices", "Without Invoices"
- Existing nurse workflow preserved for invoice-based transactions

### 5. Real-Time Sync via Webhooks
Update webhook handler to capture ALL payment events:
```javascript
handleSuccessfulPayment(webhookData) {
  if (webhookData.invoiceId) {
    // Update existing invoice + create transaction record
  } else {
    // Create standalone transaction record
    // Fetch full transaction details via GET /checkout/v3/payment/{id}
  }
}
```

---

## Implementation Priority

### Phase 1: Core Transaction Capture (Required)
1. Add GET /checkout/v3/payment integration to MXMerchantClient
2. Create transactions table in Supabase
3. Implement transaction sync in existing sync system
4. Update dashboard to show ALL transactions
5. Test with MX Merchant sandbox

### Phase 2: Real-Time Sync (Preferred)
1. Update webhook handler for non-invoice payments
2. Implement webhook signature verification
3. Subscribe to MX Merchant events via PUT /checkout/v3/subscription
4. Test real-time transaction capture

### Phase 3: Data Reconciliation (Essential)
1. Ensure no duplicate counting of invoice payments
2. Implement proper transaction-to-invoice linking
3. Update export functionality to include all transactions
4. Add transaction detail views

---

## Expected Outcome

### Before (Current State)
```
MX Merchant: 10 transactions
Your System: 8 invoices (missing 2 standalone transactions)
Client sees: 8 records (incomplete view)
```

### After (Target State)
```
MX Merchant: 10 transactions
Your System: 10 transactions + 8 linked invoices
Client sees: 10 complete transaction records
  - 8 transactions with associated invoice details
  - 2 standalone transactions (QuickPay, POS, etc.)
```

---

## Technical Notes

### Data Relationship Model
```
Transaction (Primary) <-> Invoice (Secondary, when exists)
- Every payment is a transaction
- Some transactions have associated invoices
- Nurse workflow data stays with invoices
- Dashboard shows transaction-centric view
```

### Sync Frequency
- Real-time: Via webhooks (preferred)
- Fallback: Every 5-10 minutes via cron (industry standard)
- Current: Daily sync (insufficient for client needs)

### Existing Features Preserved
- Nurse workflow tracking remains unchanged
- Export functionality extended to include all transactions
- Invoice detail pages remain as-is
- Auto-sync infrastructure reused

---

## Implementation Estimate

### Development Tasks
1. MX Payment API Integration: 2-3 days
2. Database Schema & Migration: 1 day  
3. Sync Logic Updates: 2-3 days
4. Dashboard UI Updates: 2-3 days
5. Webhook Real-time Updates: 1-2 days
6. Testing & Deployment: 1-2 days

Total Estimate: 9-14 days

### Critical Success Factors
- All MX Merchant transactions captured (no data loss)
- Proper linking between transactions and invoices
- Preserve existing nurse workflow functionality
- Real-time or near real-time data updates
- No performance degradation on dashboard

---

## Strict Development Rules & Standards

### Code Quality Standards (100% Compliance Required)

Next.js 15 & TypeScript Requirements:
1. Minimal Code Principle: Write the least amount of code necessary while maintaining functionality and readability
2. File Modification Minimalism: Modify existing files only when absolutely necessary; avoid creating unnecessary new files
3. TypeScript Strictness: Use strict TypeScript with explicit types for function parameters, return values, and variables. Never use `any` type
4. Next.js 15 Compliance: Follow Next.js 15 patterns including async Request APIs, proper server/client component separation, and TypeScript support for next.config.ts

### Architecture & Design Patterns (Enterprise-Level)

Clean Architecture Principles:
1. Separation of Concerns: Separate business logic, data access, and presentation layers with clear boundaries
2. Dependency Rule: Dependencies must always point inward toward business logic
3. Interface Abstraction: Use interfaces to abstract implementation details
4. Enterprise Patterns: Implement Circuit Breaker, Retry, and Bulkhead patterns for distributed systems

React/Next.js Specific Rules:
1. Component Design: Use functional components with proper hook usage - useState and useEffect only when necessary, not randomly
2. State Management: Implement global state management (Redux/Zustand) to avoid prop drilling
3. Conditional Rendering: Use ternary operators and proper conditional patterns for dynamic UI
4. Performance: Minimize unnecessary re-renders through proper memoization and component structure

### Security Protocols (OWASP & Industry Standards)

Next.js Security Best Practices:
1. Data Access Layer: Create isolated Data Access Layer with consistent authorization checks for every API call
2. Input Validation: Always validate and sanitize user input using libraries like Zod or validator to prevent injection attacks
3. Server Actions Security: Validate arguments in Server Actions and re-authorize users inside actions
4. Environment Variables: Protect sensitive data in environment variables, never expose in client code

API Security (OWASP Compliance):
1. Authentication: Implement proper authentication with secure session management and HTTP-only cookies
2. Rate Limiting: Apply rate limiting and throttling to prevent abuse and brute force attacks
3. Encryption: Use TLS 1.3 for data in motion and AES-256 for data at rest
4. Dependency Management: Keep dependencies updated and use automated vulnerability scanning

### Performance & Deployment Standards

Vercel/Production Optimization:
1. No Vercel Issues: Code must deploy successfully on Vercel without errors or warnings
2. Build Performance: Leverage Next.js 15 improvements including Turbopack dev and build performance enhancements
3. Caching Strategy: Implement proper Cache-Control headers and ISR (Incremental Static Regeneration) where appropriate
4. Bundle Optimization: Use stable bundling for external packages and optimize client-side JavaScript

### Senior Developer Standards

Professional Development Practices:
1. Code Style: Write concise, technical TypeScript with descriptive variable names using auxiliary verbs (isLoading, hasError)
2. Modular Design: Favor iteration and modularization over code duplication
3. Enterprise Scalability: Design for millions of transactions daily with 99.99% uptime requirements
4. Documentation: Use Architecture Decision Records (ADRs) for major decisions

### File Organization & Structure

Project Structure Rules:
1. Modular Folders: Organize code into well-defined folder structure promoting code reuse and collaboration
2. Component Structure: Structure files with exported components, subcomponents, helpers, static content, and types
3. Separation: Clear separation between server and client components
4. Reusability: Create reusable components that assemble like building blocks

### Testing & Quality Assurance

1. Type Safety: 100% TypeScript coverage with strict mode enabled
2. Error Handling: Comprehensive error boundaries and graceful degradation
3. Testing Strategy: Unit tests for business logic, integration tests for API routes
4. Code Review: All code must pass architectural review before deployment

### Industry Compliance Requirements

OWASP API Security Top 10 Compliance:
1. API Security: Address broken authentication, excessive data exposure, and lack of resources & rate limiting
2. Documentation: Maintain comprehensive security documentation and API inventory
3. Monitoring: Implement robust logging and monitoring with security event tracking
4. Regular Audits: Perform regular security audits and vulnerability assessments

---

## Summary

The core issue is data completeness: your system captures invoices but misses standalone transactions. The solution requires extending the MX Merchant integration to fetch ALL transactions via the Payment API, then linking them to invoices where applicable. This ensures the client sees every transaction that occurred, not just those with invoices.

All implementation must follow the strict development rules above - no exceptions. Code quality, security, and enterprise standards are non-negotiable.