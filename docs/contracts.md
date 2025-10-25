# MX Merchant Contracts & Sales Report System

## Overview

This document outlines the implementation of the **Sales Report & Revenue Prediction** feature using MX Merchant's Contract API and Sales Report API.

---

## Business Requirements

### Problem Statement
- Clients have multiple transaction types: **one-time payments** and **recurring subscriptions**
- Current system only tracks transactions but **not subscription frequency**
- **Cannot predict monthly revenue** without knowing billing cycles (weekly, monthly, etc.)
- Need to show both **current revenue** and **predicted future revenue**

### Solution (Finalized Strategy)
- Use **Webhooks** (real-time) to capture all transactions → Save to `transactions` table
- Use **Contract API** (on-demand) to get subscription details → Save to `contracts` table
- **Current Revenue** = Query `transactions` table (verified, no API calls)
- **Predicted Revenue** = Calculate from `contracts` table (billing frequency + schedule)
- Implement **on-demand reporting** with smart caching for contracts

---

## API Endpoints Documentation

### 1. Contract API

**Endpoint:**
```
GET https://api.mxmerchant.com/checkout/v3/contract
```

**Authentication:**
- Basic Auth with `CONSUMER_KEY:CONSUMER_SECRET` ( from database on userbased - authntication already implemented )

**Supported Parameters:**
- `merchantId` (required) - Tenant isolation
- `limit` (optional) - Number of records per page (default: 100, max: 100)
- `offset` (optional) - Pagination offset (0, 100, 200, etc.)
- `status` (optional) - Filter by contract status: `Active`, `Completed`, `Cancelled`

**❌ Unsupported Parameters (Tested & Confirmed):**
- `startDate` - API ignores this parameter (no date filtering supported)
- `currentDate` - API ignores this parameter (no date filtering supported)
- `endDate` - API ignores this parameter (no date filtering supported)

**⚠️ Important: Date Filtering Strategy**
Since the API does NOT support date filtering, you must:
1. Fetch ALL contracts using pagination (when user clicks "Fetch New Data")
2. Save to database with individual `last_synced_at` timestamp per record
3. Filter by `startDate`, `nextBillDate`, or `lastInvoiceDate` in database queries
4. Let user control when to sync (no automatic caching - manual sync only)

**Example Request (Recommended):**
```bash
# Fetch only Active contracts to reduce data volume
curl -X GET "https://api.mxmerchant.com/checkout/v3/contract?merchantId=1000095245&status=Active&limit=100&offset=0" \
  -u "CONSUMER_KEY:CONSUMER_SECRET" \
  -H "Accept: application/json"
```

**Example Request (All Contracts):**
```bash
# Fetch all contracts (Active, Completed, Cancelled)
curl -X GET "https://api.mxmerchant.com/checkout/v3/contract?merchantId=1000095245&limit=100&offset=0" \
  -u "CONSUMER_KEY:CONSUMER_SECRET" \
  -H "Accept: application/json"
```

**Response Structure:**
```json
{
  "recordCount": 1083,
  "totals": {
    "grandTotalAmount": "296824.66"
  },
  "records": [
    {
      "id": 1004676,
      "subscriptionId": 1003567,
      "merchantId": 1000095245,
      "name": "1083",
      "customerName": "Aaron Marlow",
      "interval": "Weekly",
      "every": "4 Weeks",
      "on": "Saturday",
      "amount": "249",
      "type": "Recurring",
      "status": "Active",
      "startDate": "2025-10-18T12:00:00Z",
      "hasDeclinedPayment": false,
      "grandTotalAmount": "296824.66",
      "lastInvoiceDate": "2025-10-18T19:13:39.487Z",
      "nextBillDate": "2025-11-15T00:00:00Z",
      "currencyCode": "USD"
    }
  ]
}
```

**Key Fields:**
- `interval`: Billing frequency type - "Weekly", "Monthly", "Once"
- `every`: Billing cycle - "4 Weeks", "10 Weeks", "Once"
- `on`: Day of week or specific date
- `amount`: Subscription amount
- `status`: "Active", "Completed", "Cancelled"
- `nextBillDate`: When next payment is due
- `lastInvoiceDate`: Last payment date

**Status Values:**
- `Active` - Contract is running, will charge automatically
- `Completed` - One-time contract that finished
- `Cancelled` - Subscription was cancelled

**Interval Values (Confirmed from Production Data):**
- `Weekly` - Charges every N weeks with these frequencies:
  - `"1 Week"` - Charges every week (52 payments/year)
  - `"4 Weeks"` - Charges every 4 weeks (~13 payments/year, approximately monthly)
  - `"10 Weeks"` - Charges every 10 weeks (~5 payments/year, approximately bi-monthly)
- `Once` - One-time charge (not recurring, status becomes "Completed" after payment)

**⚠️ Note:** No "Monthly" or "Yearly" intervals found in production data. All recurring contracts use Weekly intervals.

---

### 2. Sales Report API (NOT USED - We Use Webhooks Instead)

**❌ Why We Don't Use This API:**
- Webhooks already provide real-time transaction data
- `transactions` table has all payment records
- No need for additional API calls
- Faster and more reliable

**ℹ️ This API exists but is optional:**
```
GET https://api.mxmerchant.com/checkout/v3/report/usersales
```

**Could Be Used For:**
- Initial historical data import (before webhooks)
- Data reconciliation/audit purposes
- Backup verification

**Our Approach:**
- ✅ Use `transactions` table (from webhooks) for current revenue
- ✅ Use Contract API for predictions
- ✅ No Sales Report API needed

---

## Database Schema

### Contracts Table

```sql
CREATE TABLE contracts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- MX Merchant Fields
  mx_contract_id BIGINT UNIQUE NOT NULL,
  mx_subscription_id BIGINT,
  contract_name VARCHAR(50), -- "1083"

  -- Tenant Isolation (CRITICAL for multi-tenant)
  merchant_id BIGINT NOT NULL,

  -- Customer Information
  customer_name VARCHAR(255) NOT NULL,

  -- Billing Configuration
  billing_interval VARCHAR(20), -- "Weekly", "Monthly", "Once"
  billing_frequency VARCHAR(50), -- "4 Weeks", "10 Weeks", "Once"
  billing_day VARCHAR(20), -- "Saturday", "2025-10-17"
  amount DECIMAL(10,2) NOT NULL,

  -- Status & Lifecycle
  status VARCHAR(20) NOT NULL, -- "Active", "Completed", "Cancelled"
  type VARCHAR(20), -- "Recurring"
  start_date TIMESTAMP WITH TIME ZONE,
  next_bill_date TIMESTAMP WITH TIME ZONE,
  last_invoice_date TIMESTAMP WITH TIME ZONE,

  -- Payment Metadata
  has_declined_payment BOOLEAN DEFAULT false,
  grand_total_amount DECIMAL(12,2),
  currency_code VARCHAR(3) DEFAULT 'USD',

  -- Raw API Response (for debugging)
  raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When this record was last fetched from API

  -- Foreign Key
  CONSTRAINT fk_merchant FOREIGN KEY (merchant_id)
    REFERENCES mx_merchant_configs(merchant_id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX idx_contracts_merchant ON contracts(merchant_id);
CREATE INDEX idx_contracts_status ON contracts(merchant_id, status);
CREATE INDEX idx_contracts_customer ON contracts(merchant_id, customer_name);
CREATE INDEX idx_contracts_next_bill ON contracts(merchant_id, next_bill_date)
  WHERE status = 'Active';
CREATE INDEX idx_contracts_sync ON contracts(merchant_id, last_synced_at);

-- Unique Constraint (prevent duplicates)
CREATE UNIQUE INDEX idx_contracts_mx_id ON contracts(mx_contract_id, merchant_id);
```

---

## Implementation Strategy

### Hybrid Approach: Webhooks + Contract API

**Data Sources:**

```
┌─────────────────────────────────────────────────────┐
│ CURRENT REVENUE (What Actually Happened)            │
├─────────────────────────────────────────────────────┤
│ Source: transactions table                          │
│ Data From: Webhooks (real-time)                     │
│ Update: Automatic on every payment                  │
│ Reliability: 100% verified actual payments          │
│ API Calls: ZERO (data already in database)          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PREDICTED REVENUE (What Will Happen)                │
├─────────────────────────────────────────────────────┤
│ Source: contracts table                             │
│ Data From: Contract API (on-demand)                 │
│ Update only when user press get new data or when there is no dta in tabe for that merchant: When user generates report                                    │
│ API Calls: Only when needed                         │
└─────────────────────────────────────────────────────┘
```

**User Flow (Two-Button Strategy):**
```
1. User opens "Revenue Projection" page
   ↓
2. UI shows:
   ├─ Start Date: Current date (today)
   ├─ End Date: Current date + 30 days (default projection period)
   ├─ Date range presets: [7 days] [30 days] [90 days] [Custom]
   ├─ Last synced info: "Last updated: 2 hours ago"
   └─ Two action buttons:
       ├─ [Generate Report] - Query existing data (instant)
       └─ [Fetch New Data] - Sync from API (takes time)
   ↓
3a. User clicks "Generate Report" (Default Action - Fast)
    ↓
    Backend Process:
    ├─ Step A: Query Contracts from Database (Instant - No API Call)
    │   ├─ SELECT * FROM contracts
    │   ├─ WHERE status = 'Active'
    │   └─ AND next_bill_date BETWEEN startDate AND endDate
    │
    ├─ Step B: Query Transactions from Database (Instant - No API Call)
    │   ├─ SELECT * FROM transactions
    │   └─ WHERE transaction_date BETWEEN startDate AND endDate
    │
    └─ Step C: Calculate Metrics
        ├─ Current Revenue = SUM(transactions.amount) in date range
        ├─ Projected Revenue = SUM(contracts.amount) in date range
        ├─ MRR = Calculate from active contracts
        └─ Upcoming Payments = Contracts grouped by next_bill_date
    ↓
    Return results instantly (< 100ms)

3b. User clicks "Fetch New Data" (Manual Sync - Slower)
    ↓
    Backend Process:
    ├─ Step A: Show loading state with progress
    │   └─ "Fetching contracts from MX Merchant..."
    │
    ├─ Step B: Fetch ALL Active Contracts from API
    │   ├─ Call: GET /contract?merchantId=X&status=Active&limit=100
    │   ├─ Paginate through all records (offset: 0, 100, 200...)
    │   ├─ Progress: "Fetched 100/375 contracts..."
    │   └─ Takes 3-10 seconds depending on contract count
    │
    ├─ Step C: Save to Database
    │   ├─ Upsert into contracts table (INSERT or UPDATE)
    │   └─ Update last_synced_at = NOW() for all records
    │
    └─ Step D: Automatically Generate Report
        └─ Run same query as "Generate Report" button
    ↓
    Return fresh results with "Data updated successfully" message
```

**Example Date Filtering (Client-Side Selection):**
```typescript
// Default: Project next 30 days from today
const startDate = new Date(); // 2025-10-25
const endDate = new Date();
endDate.setDate(endDate.getDate() + 30); // 2025-11-24

// User can override with custom dates
// Database query automatically filters cached contracts
const projectedRevenue = await db.query(`
  SELECT
    next_bill_date,
    SUM(amount) as daily_revenue,
    COUNT(*) as payment_count
  FROM contracts
  WHERE status = 'Active'
    AND next_bill_date BETWEEN $1 AND $2
  GROUP BY next_bill_date
  ORDER BY next_bill_date ASC
`, [startDate, endDate]);
```

**Benefits:**
- ✅ **User Control** - User decides when to fetch fresh data (no automatic syncs)
- ✅ **Instant Reports** - Generate Report button returns results in <100ms
- ✅ **No Unnecessary API Calls** - Only sync when user explicitly requests it
- ✅ **Fast Queries** - Database queries are instant (no waiting)
- ✅ **Flexible Date Ranges** - User can change projection dates without re-fetching
- ✅ **Transparent Updates** - User knows exactly when data was last synced
- ✅ **Cost Efficient** - Minimal API usage (only when truly needed)
- ✅ **Better UX** - Clear separation between viewing data vs updating data

---

## Revenue Calculation Logic

# Billing Periods Analysis - MX Merchant Contract API

**Date:** 2025-10-25
**Data Source:** Production MX Merchant API
**Sample Size:** 100 contracts (All statuses: Active, Completed, Inactive)
**Merchant ID:** 1000095245

---

## 📊 Discovered Billing Periods


    "records": [
        {
            "id": 1008797,
            "subscriptionId": 1007678,
            "merchantId": 1000095245,
            "name": "1112",
            "customerName": "Ryan Gerczak",
            "interval": "Weekly",
            "every": "4 Weeks",
            "on": "Thursday",
            "amount": "512",
            "type": "Recurring",
            "status": "Active",
            "startDate": "2025-11-20T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "nextBillDate": "2025-11-20T00:00:00Z"
        },
        {
            "id": 1008791,
            "subscriptionId": 1007672,
            "merchantId": 1000095245,
            "name": "1111",
            "customerName": "Ryan Gerczak",
            "interval": "Once",
            "every": "Once",
            "on": "2025-10-23",
            "amount": "750",
            "type": "Recurring",
            "status": "Completed",
            "startDate": "2025-10-23T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "lastInvoiceDate": "2025-10-23T15:37:29.303Z",
            "nextBillDate": "2025-10-23T00:00:00Z"
        },
        {
            "id": 1008608,
            "subscriptionId": 1007489,
            "merchantId": 1000095245,
            "name": "1110",
            "customerName": "Nasser Alnaemi",
            "interval": "Weekly",
            "every": "4 Weeks",
            "on": "Thursday",
            "amount": "549",
            "type": "Recurring",
            "status": "Active",
            "startDate": "2025-11-20T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "nextBillDate": "2025-11-20T00:00:00Z",
            "currencyCode": "USD"
        },
        {
            "id": 1008588,
            "subscriptionId": 1007470,
            "merchantId": 1000095245,
            "name": "1109",
            "customerName": "Nasser Alnaemi",
            "interval": "Once",
            "every": "Once",
            "on": "2025-10-23",
            "amount": "799",
            "type": "Recurring",
            "status": "Completed",
            "startDate": "2025-10-23T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "lastInvoiceDate": "2025-10-23T14:09:59.583Z",
            "nextBillDate": "2025-10-23T00:00:00Z"
        },
        {
            "id": 1008233,
            "subscriptionId": 1007116,
            "merchantId": 1000095245,
            "name": "1108",
            "customerName": "Eric Turnbaugh",
            "interval": "Once",
            "every": "Once",
            "on": "2025-10-23",
            "amount": "221",
            "type": "Recurring",
            "status": "Completed",
            "startDate": "2025-10-23T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "lastInvoiceDate": "2025-10-23T11:33:31.943Z",
            "nextBillDate": "2025-10-23T00:00:00Z"
        },
        {
            "id": 1008073,
            "subscriptionId": 1006956,
            "merchantId": 1000095245,
            "name": "1107",
            "customerName": "German Peri",
            "interval": "Once",
            "every": "Once",
            "on": "2025-10-23",
            "amount": "199",
            "type": "Recurring",
            "status": "Completed",
            "startDate": "2025-10-23T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "lastInvoiceDate": "2025-10-23T10:31:01.37Z",
            "nextBillDate": "2025-10-23T00:00:00Z"
        },
        {
            "id": 1007970,
            "subscriptionId": 1006853,
            "merchantId": 1000095245,
            "name": "1106",
            "customerName": "Matthew Dalverny",
            "interval": "Weekly",
            "every": "4 Weeks",
            "on": "Thursday",
            "amount": "252",
            "type": "Recurring",
            "status": "Active",
            "startDate": "2025-10-23T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "lastInvoiceDate": "2025-10-23T08:57:08.59Z",
            "nextBillDate": "2025-11-20T00:00:00Z"
        },
        {
            "id": 1007717,
            "subscriptionId": 1006601,
            "merchantId": 1000095245,
            "name": "1105",
            "customerName": "Ron Stevens",
            "interval": "Weekly",
            "every": "4 Weeks",
            "on": "Wednesday",
            "amount": "199",
            "type": "Recurring",
            "status": "Active",
            "startDate": "2025-11-19T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "nextBillDate": "2025-11-19T00:00:00Z"
        },
        {
            "id": 1007709,
            "subscriptionId": 1006592,
            "merchantId": 1000095245,
            "name": "1104",
            "customerName": "Ron Stevens",
            "interval": "Once",
            "every": "Once",
            "on": "2025-10-22",
            "amount": "449",
            "type": "Recurring",
            "status": "Completed",
            "startDate": "2025-10-22T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "lastInvoiceDate": "2025-10-22T17:09:32.34Z",
            "nextBillDate": "2025-10-22T00:00:00Z"
        },
        {
            "id": 1007364,
            "subscriptionId": 1006247,
            "merchantId": 1000095245,
            "name": "1103",
            "customerName": "Andrew Stout",
            "interval": "Weekly",
            "every": "4 Weeks",
            "on": "Wednesday",
            "amount": "249",
            "type": "Recurring",
            "status": "Active",
            "startDate": "2025-11-19T12:00:00Z",
            "hasDeclinedPayment": false,
            "grandTotalAmount": "309223.66",
            "nextBillDate": "2025-11-19T00:00:00Z"
        }
    ],

### ✅ Confirmed Intervals from Production Data:

#### 1. **Weekly Intervals not sure if calculation below are correct** (Most Common)

| Frequency | Description | Payments/Year | Payments/Month | Example Amount | MRR Calculation |
|-----------|-------------|---------------|----------------|----------------|-----------------|
| `1 Week` | Charges every week | 52 | 4.33 | $249 | $249 × 4.33 = $1,078.17 |
| `4 Weeks` | Charges every 4 weeks (~monthly) | 13 | 1.08 | $249 | $249 × 1.08 = $269.54 |
| `10 Weeks` | Charges every 10 weeks (~2.5 months) | 5.2 | 0.43 | $162 | $162 × 0.43 = $70.15 |

#### 2. **One-Time** (Initial Payments)

| Frequency | Description | Status After Payment | MRR Contribution |
|-----------|-------------|---------------------|------------------|
| `Once` | Single charge (initial fee, setup fee) | `Completed` | $0 (not recurring) |

---

## ❌ Not Found in Production

These intervals were **NOT found** in the actual API data but they can be in future:
- ❌ `Monthly` - Not used by this merchant
- ❌ `Yearly` - Not used by this merchant
- ❌ `Daily` - Not used by this merchant
- ❌ `Bi-Weekly` - Not used (they use "4 Weeks" instead)

---

## 🎯 Contract Status Values

| Status | Description | Count in MRR? | Include in Projections? |
|--------|-------------|---------------|------------------------|
| `Active` | Currently billing | ✅ Yes | ✅ Yes (use nextBillDate) |
| `Completed` | One-time payment finished | ❌ No | ❌ No |
| `Inactive` | Subscription paused/cancelled | ❌ No | ❌ No |
| `Cancelled` | Subscription cancelled | ❌ No | ❌ No |

---

## 💡 Key Insights for Projection Logic

### 1. **Use `nextBillDate` for Accuracy**
The `nextBillDate` field is the **most reliable** indicator for projections:
```typescript
// ✅ CORRECT: Use nextBillDate for projections
const projectedRevenue = contracts
  .filter(c => c.status === 'Active')
  .filter(c => {
    const nextBill = new Date(c.nextBillDate);
    return nextBill >= startDate && nextBill <= endDate;
  })
  .reduce((sum, c) => sum + parseFloat(c.amount), 0);

// ❌ WRONG: Don't try to calculate dates from billing_frequency
// The API already provides the exact next billing date!
```

### 2. **MRR Calculation Formula**
```typescript
function calculateMRR(contract) {
  if (contract.status !== 'Active') return 0;
  if (contract.interval === 'Once') return 0;

  if (contract.interval === 'Weekly') {
    const weeks = parseInt(contract.every.split(' ')[0]);
    const paymentsPerMonth = 4.33 / weeks;
    return contract.amount * paymentsPerMonth;
  }

  return 0;
}
```

### 3. **Status Filtering Rules**
- **MRR Calculation:** Only `Active` contracts
- **Projections:** Only `Active` contracts with `nextBillDate` in range
- **Historical Analysis:** Include all statuses

---

## 📈 Real Production Examples

### Example 1: Weekly Subscriber (Most Common Pattern)
```json
{
  "customerName": "Aaron Marlow",
  "interval": "Weekly",
  "every": "4 Weeks",
  "on": "Saturday",
  "amount": "249",
  "status": "Active",
  "startDate": "2025-10-18T12:00:00Z",
  "nextBillDate": "2025-11-15T00:00:00Z"
}
```
**Analysis:**
- Charges $249 every 4 weeks
- Next payment: Nov 15, 2025
- MRR contribution: $249 × 1.08 = $269.54

### Example 2: High-Frequency Subscriber
```json
{
  "customerName": "Benjamin Jensen",
  "interval": "Weekly",
  "every": "1 Week",
  "on": "Wednesday",
  "amount": "535",
  "status": "Active",
  "nextBillDate": "2025-11-19T00:00:00Z"
}
```
**Analysis:**
- Charges $535 every week
- Next payment: Nov 19, 2025
- MRR contribution: $535 × 4.33 = $2,316.55

### Example 3: Low-Frequency Subscriber
```json
{
  "customerName": "Thomas Goolsby",
  "interval": "Weekly",
  "every": "10 Weeks",
  "on": "Wednesday",
  "amount": "162",
  "status": "Active",
  "nextBillDate": "2025-12-24T00:00:00Z"
}
```
**Analysis:**
- Charges $162 every 10 weeks
- Next payment: Dec 24, 2025
- MRR contribution: $162 × 0.43 = $70.15

### Example 4: One-Time Payment (Completed)
```json
{
  "customerName": "Ryan Gerczak",
  "interval": "Once",
  "every": "Once",
  "on": "2025-10-23",
  "amount": "750",
  "status": "Completed",
  "lastInvoiceDate": "2025-10-23T15:37:29.303Z"
}
```
**Analysis:**
- One-time $750 charge
- Already completed on Oct 23
- MRR contribution: $0 (not recurring)

---

## 🗄️ Database Query Examples

### Query 1: Get Projected Revenue for Next 30 Days
```sql
SELECT
  DATE(next_bill_date) as billing_date,
  COUNT(*) as payment_count,
  SUM(amount) as daily_revenue,
  ARRAY_AGG(customer_name ORDER BY customer_name) as customers
FROM contracts
WHERE status = 'Active'
  AND next_bill_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
GROUP BY DATE(next_bill_date)
ORDER BY billing_date ASC;
```

### Query 2: Calculate Total MRR
```sql
SELECT
  SUM(CASE
    WHEN billing_interval = 'Weekly' AND billing_frequency = '1 Week'
      THEN amount * 4.33  -- Weekly: 52 payments/year ÷ 12 months
    WHEN billing_interval = 'Weekly' AND billing_frequency = '4 Weeks'
      THEN amount * 1.08  -- 4 Weeks: 13 payments/year ÷ 12 months
    WHEN billing_interval = 'Weekly' AND billing_frequency = '10 Weeks'
      THEN amount * 0.43  -- 10 Weeks: 5.2 payments/year ÷ 12 months
    ELSE 0
  END) as monthly_recurring_revenue,

  -- Breakdown by frequency
  COUNT(*) FILTER (WHERE billing_frequency = '1 Week') as weekly_count,
  COUNT(*) FILTER (WHERE billing_frequency = '4 Weeks') as four_week_count,
  COUNT(*) FILTER (WHERE billing_frequency = '10 Weeks') as ten_week_count,

  -- Total active contracts
  COUNT(*) as total_active_contracts
FROM contracts
WHERE status = 'Active'
  AND billing_interval != 'Once';
```

### Query 3: Upcoming Payments with Customer Details
```sql
SELECT
  next_bill_date,
  customer_name,
  amount,
  billing_interval || ' - ' || billing_frequency as billing_schedule,
  EXTRACT(DAY FROM (next_bill_date - CURRENT_DATE)) as days_until_payment
FROM contracts
WHERE status = 'Active'
  AND next_bill_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY next_bill_date ASC, customer_name ASC;
```

---

## ⚠️ Important Notes

1. **Future-Dated One-Time Contracts**: Some "Once" contracts may have `status = 'Active'` with a future `nextBillDate`. These should be included in projections.

2. **Declined Payments**: Some contracts have `hasDeclinedPayment = true`. These are still "Active" and will retry, so include them in projections.

3. **No Pattern Prediction Needed**: Don't try to calculate future billing dates manually. The API provides `nextBillDate` which is already calculated by MX Merchant's billing engine.

4. **Average 4.33 Weeks/Month**: This accounts for the fact that most months have slightly more than 4 weeks (365 days ÷ 12 months ÷ 7 days = 4.33).

---

## 📝 Implementation Checklist

- [x] Analyze production data for billing periods
- [x] Document all discovered interval types
- [x] Create MRR calculation formula based on actual data
- [x] Write SQL queries for projections
- [ ] Implement MRR calculation in backend
- [ ] Implement projection queries in backend
- [ ] Create UI for date range selection
- [ ] Test with production data
- [ ] Validate calculations against actual invoices

---

## 🔗 Related Documentation

- [contracts.md](./contracts.md) - Main contract system documentation
- [CLAUDE.md](./CLAUDE.md) - Overall system architecture
- [mxmerchant.md](./mxmerchant.md) - MX Merchant API examples


### 1. Current Revenue (From Transactions Table)

```typescript
/**
 * Calculate actual revenue from verified transactions
 * Source: transactions table (from webhooks)
 * No API calls needed
 */
function calculateCurrentRevenue(
  merchantId: number,
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Query database directly
  const result = await db.query(`
    SELECT SUM(amount) as total
    FROM transactions
    WHERE merchant_id = $1
      AND transaction_date BETWEEN $2 AND $3
      AND status = 'Approved'
  `, [merchantId, startDate, endDate]);

  return result.rows[0].total || 0;
}

// Example: October 2025 revenue
// SELECT SUM(amount) FROM transactions
// WHERE merchant_id = 1000095245
//   AND transaction_date BETWEEN '2025-10-01' AND '2025-10-31'
//   AND status = 'Approved'
// Result: $88,411.16
```

### 2. Monthly Recurring Revenue (From Contracts Table)

```typescript
/**
 * Calculate predicted monthly revenue from active contracts
 * Source: contracts table (from Contract API)
 *
 * Based on actual production data analysis:
 * - 1 Week interval: 4.33 payments/month (52 weeks ÷ 12 months)
 * - 4 Weeks interval: 1.08 payments/month (13 payments ÷ 12 months)
 * - 10 Weeks interval: 0.43 payments/month (5.2 payments ÷ 12 months)
 */
function calculateMonthlyRevenue(contract: Contract): number {
  const { billing_interval, billing_frequency, amount, status } = contract;

  // Only active contracts count
  if (status !== 'Active') return 0;

  // One-time payments don't contribute to recurring revenue
  if (billing_interval === 'Once') return 0;

  // Weekly subscriptions (only interval type found in production)
  if (billing_interval === 'Weekly') {
    const weeks = parseInt(billing_frequency.split(' ')[0]); // "4 Weeks" → 4
    const paymentsPerMonth = 4.33 / weeks; // Average 4.33 weeks/month
    return amount * paymentsPerMonth;
  }

  return 0;
}

// Total Predicted Monthly Revenue (MRR)
const totalMRR = activeContracts.reduce((sum, contract) => {
  return sum + calculateMonthlyRevenue(contract);
}, 0);

// Real Examples from Production Data:
//
// 1. Weekly - 1 Week - $249 (Active)
//    Payments/Month: 4.33 / 1 = 4.33
//    MRR: $249 × 4.33 = $1,078.17
//
// 2. Weekly - 4 Weeks - $249 (Active)
//    Payments/Month: 4.33 / 4 = 1.08
//    MRR: $249 × 1.08 = $269.54
//
// 3. Weekly - 10 Weeks - $162 (Active)
//    Payments/Month: 4.33 / 10 = 0.43
//    MRR: $162 × 0.43 = $70.15
//
// 4. Once - Once - $750 (Completed)
//    MRR: $0.00 (One-time, not recurring)
```

### 3. Projected Revenue for Date Range (From Contracts)

```typescript
/**
 * Calculate projected revenue for any date range
 * Based on next_bill_date field from contracts
 * Works for any period: 7 days, 30 days, 90 days, custom
 */
function calculateProjectedRevenue(
  contracts: Contract[],
  startDate: Date,
  endDate: Date
): number {
  return contracts
    .filter(c => c.status === 'Active')
    .filter(c => {
      const nextBill = new Date(c.next_bill_date);
      // Payment due within selected date range
      return nextBill >= startDate && nextBill <= endDate;
    })
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);
}

// Example 1: Remaining revenue this month (Oct 25 - Oct 31)
// Show all contracts with next_bill_date between Oct 25 and Oct 31

// Example 2: Next 30 days projection (Oct 25 - Nov 24)
// Show all contracts with next_bill_date between Oct 25 and Nov 24

// Example 3: Next quarter projection (Oct 25 - Jan 25)
// Show all contracts with next_bill_date between Oct 25 and Jan 25
```

### 4. Upcoming Payments (Payment Calendar)

```typescript
/**
 * Get list of upcoming payments in next N days
 * Useful for cash flow forecasting
 */
function getUpcomingPayments(contracts: Contract[], days: number = 30) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  return contracts
    .filter(c => c.status === 'Active')
    .map(c => ({
      customerName: c.customer_name,
      amount: c.amount,
      nextBillDate: c.next_bill_date,
      billingFrequency: `${c.billing_interval} - ${c.billing_frequency}`,
      daysUntil: Math.floor(
        (new Date(c.next_bill_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
    }))
    .filter(p => {
      const billDate = new Date(p.nextBillDate);
      return billDate >= today && billDate <= futureDate;
    })
    .sort((a, b) => new Date(a.nextBillDate).getTime() - new Date(b.nextBillDate).getTime());
}

// Example Output:
// [
//   { customer: "Edward Kondratyuk", amount: 220, nextBill: "Nov 3", daysUntil: 15 },
//   { customer: "Aaron Marlow", amount: 249, nextBill: "Nov 15", daysUntil: 27 }
// ]
```

---

## API Endpoint Implementation

### API Endpoints

#### 1. POST /api/revenue/projection/generate
**Purpose:** Generate report from existing database data (instant, no API calls)

**Request:**
```typescript
{
  // Client-selected date range (default: today + 30 days)
  startDate: "2025-10-25", // Today (current date)
  endDate: "2025-11-24",   // +30 days from today
  merchantId: "1000095245" // From user session (authenticated)
}
```

**Response:**
```typescript
{
  dateRange: {
    start: "2025-10-25",
    end: "2025-11-24",
    days: 30
  },

  // Current revenue (actual transactions in selected period)
  currentRevenue: {
    total: 12500.00,
    transactionCount: 45,
    averageTransaction: 277.78
  },

  // Projected revenue (contracts billing in selected period)
  projectedRevenue: {
    total: 85000.00,
    contractCount: 340,
    upcomingPayments: [
      {
        date: "2025-10-26",
        amount: 2500.00,
        count: 10,
        customers: ["John Doe", "Jane Smith", ...]
      },
      {
        date: "2025-10-27",
        amount: 3200.00,
        count: 12,
        customers: [...]
      }
      // ... daily breakdown
    ]
  },

  // Overall metrics
  metrics: {
    totalTransactions: 45,        // In selected period
    approvedTransactions: 43,
    declinedTransactions: 2,
    activeContracts: 1083,       // Total active (not filtered by date)
    cancelledContracts: 45,
    completedContracts: 120,
    monthlyRecurringRevenue: 92000.00  // MRR calculation
  },

  // System metadata
  lastSyncedAt: "2025-10-25T14:30:00Z", // When data was last fetched from API
  dataSource: "database" // Always "database"
}
```

#### 2. POST /api/revenue/projection/sync
**Purpose:** Fetch fresh data from MX Merchant API and save to database

**Request:**
```typescript
{
  merchantId: "1000095245", // From user session
  status: "Active" // Optional: fetch only Active contracts (recommended)
}
```

**Response:**
```typescript
{
  success: true,
  message: "Successfully synced 375 contracts",
  stats: {
    totalFetched: 375,
    newRecords: 15,
    updatedRecords: 360,
    apiCalls: 4, // Number of paginated requests made
    syncDuration: "3.2s"
  },
  lastSyncedAt: "2025-10-25T16:45:00Z"
}
```

**Frontend Implementation:**
```typescript
// State management
const [startDate, setStartDate] = useState(new Date()); // Today
const [endDate, setEndDate] = useState(() => {
  const date = new Date();
  date.setDate(date.getDate() + 30); // +30 days
  return date;
});
const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [isSyncing, setIsSyncing] = useState(false);

// Preset options
const presets = [
  { label: "Next 7 days", days: 7 },
  { label: "Next 30 days", days: 30, default: true },
  { label: "Next 90 days", days: 90 },
  { label: "Custom range", days: null }
];

// Generate Report (Fast - Database Query)
const handleGenerateReport = async () => {
  setIsGenerating(true);
  try {
    const response = await fetch('/api/revenue/projection/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });
    const data = await response.json();
    setLastSyncedAt(new Date(data.lastSyncedAt));
    // Display results instantly
  } catch (error) {
    console.error('Failed to generate report:', error);
  } finally {
    setIsGenerating(false);
  }
};

// Fetch New Data (Slow - API Sync)
const handleFetchNewData = async () => {
  setIsSyncing(true);
  try {
    const response = await fetch('/api/revenue/projection/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Active' // Only fetch active contracts
      })
    });
    const data = await response.json();
    setLastSyncedAt(new Date(data.lastSyncedAt));

    // Show success message
    toast.success(`Synced ${data.stats.totalFetched} contracts`);

    // Automatically generate report with fresh data
    await handleGenerateReport();
  } catch (error) {
    console.error('Failed to sync data:', error);
    toast.error('Failed to fetch new data');
  } finally {
    setIsSyncing(false);
  }
};

// UI Component
return (
  <div className="revenue-projection-page">
    <div className="header">
      <h1>Revenue Projection</h1>
      {lastSyncedAt && (
        <p className="text-sm text-gray-500">
          Last updated: {formatDistanceToNow(lastSyncedAt)} ago
        </p>
      )}
    </div>

    <div className="date-selection">
      <DatePicker
        label="Start Date"
        value={startDate}
        onChange={setStartDate}
      />
      <DatePicker
        label="End Date"
        value={endDate}
        onChange={setEndDate}
      />

      <div className="presets">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => {
              setStartDate(new Date());
              const end = new Date();
              end.setDate(end.getDate() + preset.days);
              setEndDate(end);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>

    <div className="actions">
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating}
        className="btn-primary"
      >
        {isGenerating ? 'Generating...' : 'Generate Report'}
      </button>

      <button
        onClick={handleFetchNewData}
        disabled={isSyncing}
        className="btn-secondary"
      >
        {isSyncing ? 'Fetching...' : 'Fetch New Data'}
      </button>
    </div>
  </div>
);
```

---

## MXMerchantClient Methods

### New Methods to Add

```typescript
class MXMerchantClient {

  /**
   * Get contracts with pagination
   *
   * @param params.merchantId - Merchant ID (required for tenant isolation)
   * @param params.limit - Records per page (default: 100, max: 100)
   * @param params.offset - Pagination offset (0, 100, 200, etc.)
   * @param params.status - Filter by status: 'Active', 'Completed', 'Cancelled'
   *
   * @returns Contract list with pagination info
   *
   * @note Date filtering NOT supported by API - filter in database after fetching
   */
  async getContracts(params: {
    limit?: number;
    offset?: number;
    merchantId?: string;
    status?: 'Active' | 'Completed' | 'Cancelled';
  } = {}): Promise<MXContractListResponse> {
    const queryParams = new URLSearchParams();

    if (params.merchantId) queryParams.append('merchantId', params.merchantId);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.status) queryParams.append('status', params.status);

    const endpoint = `/checkout/v3/contract${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<MXContractListResponse>(endpoint);
  }

  /**
   * Get all contracts with automatic pagination
   * Fetches ALL contracts from API (recommended: fetch only Active contracts)
   *
   * @param merchantId - Merchant ID (required)
   * @param status - Optional status filter ('Active' recommended to reduce data volume)
   *
   * @returns All contracts with totals
   *
   * @example
   * // Recommended: Fetch only Active contracts
   * const activeContracts = await getAllContracts('1000095245', 'Active');
   *
   * // Fetch all contracts (Active, Completed, Cancelled)
   * const allContracts = await getAllContracts('1000095245');
   */
  async getAllContracts(
    merchantId?: string,
    status?: 'Active' | 'Completed' | 'Cancelled'
  ): Promise<MXContractListResponse> {
    const limit = 100; // Max allowed by API
    let offset = 0;
    const allContracts: MXContract[] = [];
    let totalCount = 0;
    let grandTotalAmount = '0';

    while (true) {
      const response = await this.getContracts({
        limit,
        offset,
        merchantId,
        status // Filter by status to reduce data volume
      });

      allContracts.push(...response.records);
      totalCount = response.recordCount;
      grandTotalAmount = response.totals?.grandTotalAmount || '0';

      // Break if we got fewer records than requested (last page)
      if (response.records.length < limit) {
        break;
      }

      offset += limit;

      // Safety check to prevent infinite loop
      if (offset >= totalCount) {
        break;
      }
    }

    return {
      recordCount: totalCount,
      records: allContracts,
      totals: { grandTotalAmount }
    };
  }

  /**
   * Get sales report for date range
   */
  async getSalesReport(params: {
    startDate?: string;
    endDate?: string;
    dateRange?: string;
    limit?: number;
    offset?: number;
    merchantId?: string;
    transactionType?: string;
    status?: string;
  } = {}): Promise<MXSalesReportResponse> {
    const queryParams = new URLSearchParams();

    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.dateRange) queryParams.append('dateRange', params.dateRange);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.merchantId) queryParams.append('merchantId', params.merchantId);
    if (params.transactionType) queryParams.append('transactionType', params.transactionType);
    if (params.status) queryParams.append('status', params.status);

    const endpoint = `/checkout/v3/report/usersales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<MXSalesReportResponse>(endpoint);
  }
}
```

---

## TypeScript Interfaces

```typescript
// Contract Types
export interface MXContract {
  id: number;
  subscriptionId: number;
  merchantId: number;
  name: string; // Contract number
  customerName: string;
  interval: 'Weekly' | 'Monthly' | 'Once';
  every: string; // "4 Weeks", "10 Weeks", "Once"
  on: string; // Day or date
  amount: string;
  type: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  startDate: string;
  nextBillDate: string;
  lastInvoiceDate?: string;
  hasDeclinedPayment: boolean;
  grandTotalAmount: string;
  currencyCode?: string;
}

export interface MXContractListResponse {
  recordCount: number;
  records: MXContract[];
  totals: {
    grandTotalAmount: string;
  };
}

// Sales Report Types
export interface MXSalesTransaction {
  id: number;
  transactionCount: number;
  amount: string;
  username: string;
  customerName: string;
  reference: string;
  transactionType: 'Sale' | 'Return';
  tenderType: string;
  transactionDate: string;
  invoiceNumber: string;
  recordCount: number;
  totalAmount: string;
  cardName: string;
  paymentType: string;
  cardAccount: {
    cardType: string;
    last4: string;
    hasContract: boolean;
  };
  source: string;
  status: 'Approved' | 'Declined';
}

export interface MXSalesReportResponse {
  recordCount: number;
  records: MXSalesTransaction[];
  totals: {
    transactionCount: number;
    totalAmount: string;
  };
}

// Database Types
export interface Contract {
  id: string;
  mx_contract_id: number;
  mx_subscription_id: number | null;
  contract_name: string | null;
  merchant_id: number;
  customer_name: string;
  billing_interval: string | null;
  billing_frequency: string | null;
  billing_day: string | null;
  amount: number;
  status: string;
  type: string | null;
  start_date: string | null;
  next_bill_date: string | null;
  last_invoice_date: string | null;
  has_declined_payment: boolean;
  grand_total_amount: number | null;
  currency_code: string;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
}
```

---

## Security Considerations

### Tenant Isolation
- ✅ **Contract API requires `merchantId` parameter**
- ✅ **API credentials are tied to specific merchant**
- ✅ **Cannot access other merchants' data**
- ✅ **Database has merchant_id foreign key constraint**

### Data Privacy
- Contracts contain customer names and payment amounts
- Implement proper authorization checks in API routes
- Only allow users to see their own merchant's data

### Rate Limiting
- MX Merchant API may have rate limits
- Implement caching to minimize API calls
- Use smart sync strategy (hourly refresh)

---

## Testing Strategy

### Test Cases

1. **Contract API**
   - ✅ Fetch contracts with merchantId
   - ❌ Fetch without merchantId (should fail)
   - ❌ Fetch with wrong merchantId (should fail)
   - ✅ Pagination works correctly

2. **Sales Report API**
   - ✅ Fetch with date range
   - ✅ Fetch with "Last30" preset
   - ✅ Filter by transaction type
   - ✅ Filter by status

3. **Revenue Calculations**
   - ✅ Weekly contract (4 weeks) = amount * 1.08
   - ✅ Weekly contract (10 weeks) = amount * 0.43
   - ✅ Monthly contract = amount * 1
   - ✅ One-time contract = 0 (for recurring)

4. **Caching Logic**
   - ✅ First request fetches from API
   - ✅ Second request use databse data
   - ✅ 3rd request use database data as user will press fetch new data when he will require

---

## Performance Optimization

### Database Indexes
- Merchant ID for tenant queries
- Status for filtering active contracts
- Customer name for matching
- Next bill date for predictions
- Last synced time for cache checks

### API Call Optimization
- Batch fetch all contracts (100 per request)
- Cache in database for 1 hour
- Only fetch when user requests report
- Use pagination for large datasets

### Frontend Optimization
- Show loading state during API calls
- Cache report results in browser
- Allow export to Excel/PDF without re-fetching

---

## Future Enhancements

1. **Advanced Predictions (most important most )**
   - Churn rate analysis
   - Seasonal trends
   - Growth projections

2. **Automated Reporting ( not a prority )** 
   - Daily/weekly email reports
   - Revenue alerts (below/above thresholds)
   - Failed payment notifications

3. **Analytics Dashboard (most importnat most )**
   - Revenue charts (line/bar graphs)
   - Customer lifetime value
   - Subscription retention rate

4. **Export Options**
   - Excel spreadsheet
   - PDF report
   - CSV for accounting software

---

## References

- MX Merchant API Docs: https://developer.mxmerchant.com/
- Contract API: https://developer.mxmerchant.com/reference/recurring-payment-overview
- Sales Report API: http0s://developer.mxmerchant.com/reference/get-user-sales-report ( n implementation required )

---

## Implementation Checklist

### Backend
- [ ] Create `contracts` database table with indexes
- [ ] Add Contract API methods to MXMerchantClient (with `status` parameter)
- [ ] Create TypeScript interfaces for Contract types
- [ ] Implement `/api/revenue/projection/generate` endpoint (database query)
- [ ] Implement `/api/revenue/projection/sync` endpoint (API fetch + save)
- [ ] Build contract sync logic with pagination
- [ ] Create revenue calculation functions (MRR, projections, etc.)
- [ ] Add proper error handling and validation

### Frontend
- [ ] Build Revenue Projection page UI
- [ ] Add date range picker with presets (7, 30, 90 days)
- [ ] Implement "Generate Report" button (instant results)
- [ ] Implement "Fetch New Data" button (sync with loading state)
- [ ] Show last synced timestamp ("Last updated: 2 hours ago")
- [ ] Display projection results with charts
- [ ] Add upcoming payment calendar view
- [ ] Implement export functionality (Excel/PDF)
- [ ] Add loading states and progress indicators
- [ ] Add toast notifications for success/error

### Testing & Deployment
- [ ] Write unit tests for revenue calculations
- [ ] Test API pagination handling
- [ ] Test with production data (375+ contracts)
- [ ] Verify database query performance
- [ ] Deploy to production
- [ ] Monitor API usage and costs
