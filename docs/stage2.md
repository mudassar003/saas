# 🚀 Stage 2: Complete Webhook Processing Implementation

## Current Status
✅ **Completed in Stage 1:**
- Multi-tenant database schema with proper isolation
- Transaction and invoice tables with foreign key relationships
- Webhook endpoint receiving transaction IDs from MX Merchant
- Basic MX Merchant API client structure

❌ **Missing (Stage 2 Goals):**
- Complete webhook data processing logic
- MX Merchant API integration for payment and invoice details
- Database operations for saving processed webhook data
- Error handling and retry mechanisms

---

## 🎯 Stage 2 Implementation Plan

### **Phase 1: MX Merchant API Client Enhancement**

#### 1.1 Multi-Tenant Credential Management
**File:** `src/lib/database/merchant-credentials.ts`

Create credential lookup system:
```typescript
// Get merchant-specific API credentials from database
async function getMerchantCredentials(merchantId: string): Promise<{
  username: string;
  password: string;
  environment: 'production' | 'sandbox';
}>

// Cache credentials for performance (5-10 minutes)
```

#### 1.2 Enhanced MX Merchant API Client
**File:** `src/lib/mx-merchant-client.ts`

Update MXMerchantClient for multi-tenant usage:
```typescript
export class MXMerchantClient {
  constructor(config: { username: string; password: string; baseUrl: string })
  
  // Get individual transaction details (includes invoiceIds array)
  async getPaymentDetail(paymentId: number, merchantId: string): Promise<MXPaymentDetail>
  
  // Get individual invoice details (includes products array)  
  async getInvoiceDetail(invoiceId: number, merchantId: string): Promise<MXInvoiceDetail>
  
  private getAuthHeaders(): { Authorization: string; Content-Type: string }
}
```

#### 1.2 TypeScript Interfaces
**File:** `src/types/mx-merchant.ts`

Add response type definitions:
- `MXPaymentDetail` - Individual transaction response
- `MXInvoiceDetail` - Individual invoice response with products
- `MXProduct` - Product details from invoice
- `MXCustomer` - Customer information

---

### **Phase 2: Webhook Processing Logic**

#### 2.1 Complete Webhook Handler
**File:** `api/webhook/mx-merchant/route.ts`

Implement full multi-tenant processing workflow:
```typescript
export async function POST(request: Request) {
  // 1. Extract merchantId from webhook payload
  // 2. Lookup merchant-specific API credentials from database
  // 3. Initialize MXMerchantClient with merchant credentials
  // 4. Fetch transaction details from MX Merchant API
  // 5. Process invoices if invoiceIds exist in transaction
  // 6. Map product categories using merchant-specific product_categories
  // 7. Save all data with tenant isolation (merchantId filtering)
  // 8. Handle credential/API failures with proper error responses
}
```

#### 2.2 Database Operations
**File:** `src/lib/database/webhook-operations.ts`

Create specialized database functions:
- `saveTransactionFromWebhook()` - Save transaction with tenant isolation
- `saveInvoiceFromWebhook()` - Save invoice and link to transaction
- `updateProductCategorization()` - Map products to categories
- `logWebhookProcessing()` - Audit trail for debugging

---

### **Phase 3: Error Handling & Reliability**

#### 3.1 Retry Mechanisms
- Exponential backoff for MX Merchant API failures
- Database transaction rollback on partial failures
- Webhook retry handling (return 500 to trigger MX retry)

#### 3.2 Monitoring & Logging
- Structured logging for webhook processing steps
- Error alerting for failed webhook processing
- Performance monitoring for API call chains

---

### **Phase 4: Data Processing Pipeline**

#### 4.1 Webhook Processing Flow
```
Webhook Received
    ↓
Extract Transaction ID
    ↓
GET /checkout/v3/payment/{id}
    ↓
Check for invoiceIds[]
    ↓
FOR EACH invoiceId:
    GET /checkout/v3/invoice/{id}
    ↓
Map Product Categories
    ↓
Save Transaction + Invoices
    ↓
Return Success/Error
```

#### 4.2 Product Categorization Logic
- Lookup product name in `product_categories` table
- Apply tenant-specific category mapping
- Default to "Uncategorized" for new products
- Auto-create product mappings for admin review

---

## 🔍 **CRITICAL DISCOVERY: Actual Webhook Payload Analysis**

### **✅ What We Get Directly from Webhook:**
```json
{
  "eventType": "PaymentSuccess",
  "merchantId": "1000095245",           // ✅ Tenant ID ready
  "id": "4000000057897600",            // ✅ Transaction ID for API calls
  "invoiceNumber": "2844",             // ✅ Invoice number (but need ID for API)
  "customer": "Ivan Mora",             // ✅ Customer name ready
  "totalAmount": "269.10",             // ✅ Amount ready  
  "source": "Recurring",              // ✅ Source type ready
  "card": "MasterCard",                // ✅ Card type ready
  "pan4": "7871",                      // ✅ Last 4 digits ready
  "authorizationCode": "050144",       // ✅ Auth code ready
  "responseMessage": "Approved..."     // ✅ Status ready
}
```

### **❌ What We Need from API Calls:**
- `invoiceId` field is **EMPTY** → Must call `GET /checkout/v3/payment/{id}` to get `invoiceIds[]`
- Product information → Must call `GET /checkout/v3/invoice/{id}` for each invoice
- Complete transaction details → Enhanced from API call

### **🚨 Updated Processing Flow:**
```
Webhook Payload (Basic Info)
    ↓
GET /checkout/v3/payment/{id} ← Using webhook.id
    ↓
Extract invoiceIds[] array (if exists)
    ↓  
FOR EACH invoiceId in invoiceIds[]:
    GET /checkout/v3/invoice/{id}
    ↓
    Extract Products & Details
    ↓
Save Complete Transaction + Invoice Data
```

## 📁 Files to Modify/Create

### **Existing Files to Enhance:**
1. `src/lib/mx-merchant-client.ts` - Add API methods
2. `api/webhook/mx-merchant/route.ts` - Complete processing logic  
3. `src/types/mx-merchant.ts` - Add response interfaces

### **New Files to Create:**
1. `src/lib/database/merchant-credentials.ts` - Multi-tenant credential management
2. `src/lib/database/webhook-operations.ts` - Database operations with tenant isolation
3. `src/lib/webhook/processor.ts` - Main processing logic with dynamic credentials
4. `src/lib/webhook/error-handler.ts` - Error handling utilities

---

## 🔧 Implementation Requirements

### **Technical Standards:**
- TypeScript strict mode with explicit typing
- Database transactions for atomicity
- Proper error handling with HTTP status codes
- Multi-tenant isolation on all operations

### **Performance Goals:**
- Webhook processing: <3 seconds per webhook
- Database writes: <500ms total
- API calls: <2 seconds total (with retries)
- Zero data loss on failures

### **Security Requirements:**
- Webhook signature validation
- Tenant data isolation
- Input sanitization
- Encrypted sensitive data storage

---

## 🎯 Success Criteria

**Stage 2 Complete When:**
1. ✅ Webhook receives transaction ID → processes → saves complete data
2. ✅ Invoice data automatically fetched and linked to transactions
3. ✅ Product categories automatically applied
4. ✅ All data visible in existing dashboard
5. ✅ Error handling prevents data corruption
6. ✅ Multi-tenant isolation working correctly

**Ready for Stage 3:** Real-time dashboard updates and enhanced UI features.

---

## 🗂️ **Data Mapping: Webhook → Database Tables**

### **Transactions Table Mapping:**
```typescript
// From webhook payload directly:
{
  mx_payment_id: payload.id,                    // "4000000057897600"
  amount: parseFloat(payload.totalAmount),      // 269.10
  transaction_date: parseISODate(payload.transactionDate), 
  status: "Approved",                           // From responseMessage
  customer_name: payload.customer,              // "Ivan Mora"
  card_type: payload.card,                      // "MasterCard"
  card_last4: payload.pan4,                     // "7871"
  auth_code: payload.authorizationCode,         // "050144"
  source: payload.source,                       // "Recurring"
  merchant_id: parseInt(payload.merchantId),    // 1000095245
  mx_invoice_number: parseInt(payload.invoiceNumber), // 2844
}

// From API call GET /checkout/v3/payment/{id}:
{
  mx_invoice_id: apiResponse.invoiceIds[0],     // For direct invoice API calls
  invoice_id: linkedInvoiceUUID,               // Foreign key after invoice save
  product_name: extractedFromInvoice,          // From invoice products
  product_category: categoryMapping,           // From product_categories table
}
```

### **Invoices Table Mapping:**  
```typescript
// From API call GET /checkout/v3/invoice/{invoiceId}:
{
  mx_invoice_id: apiResponse.id,               // Invoice ID from API
  invoice_number: apiResponse.invoiceNumber,   // Links to transaction
  customer_name: apiResponse.customer.name,    // Patient name
  total_amount: apiResponse.totalAmount,       // Invoice total
  merchant_id: payload.merchantId,             // Tenant isolation
  raw_data: apiResponse,                       // Complete JSON response
}
```

### **Processing Priority:**
1. **Save Transaction** (from webhook + API data)
2. **Save Invoice** (if invoiceIds exist)  
3. **Link Invoice to Transaction** (foreign key update)
4. **Update Product Category** (from product_categories lookup)

## 📊 Expected Outcomes

**Data Flow Completion:**
- **Before:** Webhook receives data → basic storage
- **After:** Webhook receives data → fetch details → categorize → complete storage

**Dashboard Enhancement:**
- **Before:** Manual sync required for new data  
- **After:** Real-time updates from live webhook processing

**Scalability Ready:**
- Multi-tenant architecture proven
- 2000+ webhooks/day processing capability
- Enterprise-level error handling and monitoring