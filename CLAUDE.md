# Claude Agent Instructions for MX Merchant Invoice/Transaction Sync

## Objective
Ensure that all **transactions** from MX Merchant are captured — including those **without invoices** — and that any available **invoices** are correctly associated with their related transactions. Support **real-time sync** if possible using webhooks; otherwise, maintain accurate and timely data via cron-based or on-demand sync. Use Supabase for persistence and Next.js + TypeScript as the stack context.

---

## 1. Fetching All Transactions

### ✅ Use the Payments API
Use the `GET /checkout/v3/payment` endpoint to fetch all **payment transactions**, including:
- Transactions tied to invoices
- QuickPay or POS payments that have no invoice

Each transaction object typically includes:
- `id`
- `amount`
- `date/time`
- `tenderType`
- `invoice` (may or may not be present)

**Also support:**
- `GET /checkout/v3/payment/{paymentId}` to fetch transaction details on demand.

### ➕ Store in Supabase
Insert or upsert each transaction into the `transactions` table. Schema should include:
- `payment_id`
- `amount`
- `created_at`
- `invoice_number` (nullable)
- `card_last4` (if available)
- `status`
- `merchant_id`

If the transaction includes an `invoice` field, try to associate it with an existing invoice.

---

## 2. Fetching All Invoices

### ✅ Use the Invoice API
Use the `GET /checkout/v3/invoice` endpoint to fetch **all invoices**, regardless of payment status. This includes:
- Paid invoices
- Drafts
- Unpaid invoices

Also use:
- `GET /checkout/v3/invoice/{invoiceId}` for invoice details
- `GET /checkout/v3/invoicepayment?id={invoiceId}` to fetch payments associated with an invoice (e.g., partial payments)

### ➕ Store in Supabase
Insert each invoice into the `invoices` table. Schema should include:
- `invoice_id`
- `invoice_number`
- `status` (e.g., Paid, Unpaid, Draft)
- `merchant_id`
- `due_date`
- `line_items`
- `paid_amount`
- `balance`

---

## 3. Sync Strategy

### 🕒 Initial Sync
- Fetch all invoices and transactions for a merchant using `GET /invoice` and `GET /payment`.
- Upsert both into their respective tables in Supabase.

### 🔁 Incremental Sync
- Store `last_synced_at` timestamp per merchant.
- On each cron or on-demand run:
  - Fetch **new or updated invoices** since `last_synced_at`
  - Fetch **new transactions** since `last_synced_at`
  - Upsert them into Supabase

### 💡 Real-Time Sync (Recommended)
Use MX Merchant Webhooks (Notifications API) for real-time sync.

#### Events to subscribe to:
- `Successful Payments`
- `Invoice Payment`
- `Refund Created`
- `Chargeback Created`

#### Webhook Setup:
- Use `PUT /checkout/v3/subscription` to subscribe a merchant to events
- Set `sendWebhook: true` and provide your app’s webhook URL
- Store webhook subscriptions in a `merchant_notifications` table if needed

#### Webhook Handling:
- For `Successful Payments`:
  - If `invoiceId` is present → update invoice
  - If `invoiceId` is missing → fetch transaction via `GET /payment/{id}` and store in `transactions`
- For `Refund Created` or `Chargeback Created`:
  - Update related invoice or transaction status accordingly

---

## 4. Data Linking

When syncing or receiving events:
- If a **payment record includes `invoice`**, attempt to **match it with an invoice in Supabase** via `invoice_number`
- If no match, store it as a **standalone transaction**
- On invoice detail fetch, also pull `invoicepayments` and link transactions to that invoice
- Update invoice `status` (e.g., Paid, Partially Paid) based on `paid_amount` and `balance`

---

## 5. UI Integration

In the dashboard:
- Display a unified list of **all transactions**
- For each transaction:
  - Show payment info: amount, date, card info
  - If linked to an invoice: show invoice number (hyperlinked to invoice detail)
  - If not: mark invoice as `N/A`
- Enable filters like: "All Transactions", "Only With Invoices", "Only Without Invoices"

---

## 6. Security & Reliability

### 🔐 Webhook Security
- Validate `x-mx-signature` header on all incoming webhook calls

### 🧠 Fallback Sync
- Even with webhooks, run a daily or hourly sync to reconcile missed data

---

## Summary of Endpoints Used

### Invoices
- `GET /checkout/v3/invoice`
- `GET /checkout/v3/invoice/{invoiceId}`
- `GET /checkout/v3/invoicepayment?id={invoiceId}`

### Transactions
- `GET /checkout/v3/payment`
- `GET /checkout/v3/payment/{paymentId}`

### Webhooks (if enabled)
- `PUT /checkout/v3/subscription`
- Events: `Successful Payments`, `Refund Created`, `Chargeback Created`

---

## Not in Scope
- Do **not** trigger or send invoices or receipts via MX API.
- Only fetch and associate data for tracking/reporting.

---

## Technologies
- **Framework**: Next.js with TypeScript
- **Database**: Supabase
- **Job System**: Cron + webhook-based triggers
- **Client Auth**: MX Merchant API keys per merchant

---

## Completion Goal
At the end of execution, every MX transaction — whether or not linked to an invoice — should be captured in the app, with invoices attached where applicable, in near real-time or through fallback sync.

