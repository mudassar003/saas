# 🔗 Webhook Implementation Documentation

## Architecture Overview

Multi-tenant webhook processing system for 500+ medical practices using MX Merchant payment notifications.

```
MX Merchant → /api/webhook/mx-merchant → Upstash Queue → Railway Worker → Database
```

---

## 📁 File Structure

### **Production Files (Permanent)**

```
src/
├── app/api/webhook/mx-merchant/
│   └── route.ts                    # Main webhook endpoint
└── lib/
    └── webhook-debug.ts            # Debug utilities (temporary)
```

### **Debug Files (Temporary - Easy to Remove)**

```
src/
└── app/debug/webhooks/
    └── page.tsx                    # Debug monitoring page
```

---

## 🚀 Production Components

### **1. Main Webhook Endpoint**
**File**: `src/app/api/webhook/mx-merchant/route.ts`

**Purpose**: 
- Receive webhooks from all tenants (500+)
- Basic validation (merchantId, eventType required)
- Fast response to MX Merchant (< 100ms)
- Queue jobs for background processing

**Methods**:
- `POST` - Process webhook from MX Merchant
- `GET` - Health check endpoint

**Key Features**:
- Multi-tenant support via merchantId
- Error handling with proper HTTP status codes
- Production logging for monitoring

---

## 🛠️ Temporary Debug System

### **2. Debug Utilities**
**File**: `src/lib/webhook-debug.ts`

**Purpose**: In-memory webhook logging for development

**Functions**:
- `logWebhook(payload)` - Log incoming webhook
- `getWebhookLogs()` - Retrieve all logs
- `markWebhookProcessed(id)` - Mark as processed
- `clearWebhookLogs()` - Clear all logs

**Features**:
- Only active in non-production environments
- Stores last 50 webhooks in memory
- Automatic cleanup on deployment

### **3. Debug Monitoring Page**
**File**: `src/app/debug/webhooks/page.tsx`

**Purpose**: Real-time webhook monitoring dashboard

**URL**: `/debug/webhooks`

**Features**:
- Auto-refresh every 3 seconds
- Event type color coding
- Full payload viewing
- Clear logs functionality
- Webhook endpoint information

---

## 🔧 Configuration

### **Webhook URL for MX Merchant**
```
Production: https://saas-wine-three.vercel.app/api/webhook/mx-merchant
Development: http://localhost:3000/api/webhook/mx-merchant
```

### **Supported Event Types**
- `PaymentSuccess` - Successful payment transactions
- `PaymentFail` - Failed payment attempts
- `RefundCreated` - Refund transactions
- `BatchClosed` - Batch settlement events
- `Chargeback` - Chargeback notifications
- `Deposit` - Deposit confirmations

---

## 📊 Monitoring & Debugging

### **Real-time Monitoring**
Visit `/debug/webhooks` to monitor webhook reception in real-time.

### **Console Logging**
All webhooks are logged to console with:
- Merchant ID
- Event Type  
- Transaction ID
- Timestamp

### **Error Tracking**
Failed webhooks return HTTP 500 for MX Merchant retry logic.

---

## 🗑️ Easy Cleanup (When Debug Not Needed)

### **Remove Debug System (3 steps)**:

1. **Delete temporary files**:
   ```bash
   rm src/lib/webhook-debug.ts
   rm -rf src/app/debug/webhooks/
   ```

2. **Remove import from webhook**:
   ```typescript
   // Delete this line from route.ts:
   import { logWebhook } from '@/lib/webhook-debug'
   ```

3. **Remove debug call**:
   ```typescript
   // Delete this line from route.ts:
   logWebhook(webhookData)
   ```

**Production webhook remains fully functional after cleanup.**

---

## 🔄 Implementation Status

1. ✅ **Webhook Endpoint** - COMPLETED
   - Production endpoint: `/api/webhook/mx-merchant`
   - Multi-tenant support via merchantId
   - Real-time debug monitoring

2. ✅ **MX Merchant Integration** - COMPLETED
   - PaymentSuccess notification active (ID: 41932856)
   - All sources configured
   - Production webhook URL registered

3. ⏳ **Upstash Redis Queue** - NEXT STEP  
   - [ ] Create Upstash Redis instance
   - [ ] Add Redis queue integration to webhook
   - [ ] Configure environment variables

4. ⏳ **Railway Background Worker** - PENDING
   - [ ] Create Railway worker service
   - [ ] Process queued webhooks
   - [ ] Database integration for multi-tenant data

5. ⏳ **Database Integration** - PENDING
   - [ ] Store transactions with membership fields
   - [ ] Link invoices and extract products
   - [ ] Product categorization per tenant

---

## 📋 Testing Checklist

- [ ] Create MX Merchant notification subscription
- [ ] Update webhook URL to production endpoint
- [ ] Monitor webhook reception via debug page
- [ ] Verify all event types are received
- [ ] Test error handling scenarios

---

## 🚀 **NEXT SESSION: Upstash Redis Implementation**

### **Step 1: Create Upstash Redis Instance**
1. Go to [upstash.com](https://upstash.com) → Create Redis database
2. Get connection details: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Add to Vercel environment variables

### **Step 2: Update Webhook with Queue Integration**
```typescript
// Add to webhook endpoint
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// In webhook handler:
await redis.lpush('mx-transactions', JSON.stringify({
  correlationId: generateId(),
  payload: webhookData,
  receivedAt: new Date().toISOString()
}))
```

### **Step 3: Railway Worker Implementation** 
```javascript
// Railway worker.js - Continuously process queue
const redis = new Redis(/* config */)
const supabase = createClient(/* config */)

while (true) {
  const jobs = await redis.lpop('mx-transactions', 10)
  for (const job of jobs || []) {
    await processWebhook(JSON.parse(job))
  }
  await sleep(1000)
}
```

### **Railway Worker Tasks:**
1. **Fetch tenant config** from `mx_merchant_configs` using `webhookData.merchantId`  
2. **Call MX Merchant APIs** with tenant credentials for full transaction/invoice data
3. **Store in database tables**:
   - `transactions` (with membership fields: product_name, product_category, membership_status)
   - `invoices` (full invoice details with nurse workflow)
   - `product_categories` (tenant-specific product mapping)

### **Environment Variables Needed:**
```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Railway Worker
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

**Note**: This implementation follows senior developer patterns with clean separation between production code and temporary debugging utilities.