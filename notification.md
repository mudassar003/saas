# MX Merchant Notification/Webhook API Documentation

## API Endpoints

### Base URLs
- **Sandbox**: `https://sandbox.api.mxmerchant.com/checkout/v3/subscription`
- **Production**: `https://api.mxmerchant.com/checkout/v3/subscription`

### Authentication
- **Method**: Basic Authentication
- **Format**: `Authorization: Basic base64(consumer_key:consumer_secret)`
- **Alternative**: OAuth 1.0a, JWT

## HTTP Methods

### PUT - Create/Update Webhook Subscription
**Endpoint**: `/checkout/v3/subscription`

**Request Payload**:
```json
{
  "sendEmail": true,
  "emailAddress": "[email protected]",
  "sendSMS": true,
  "phoneNumber": "1112223344",
  "sendWebhook": true,
  "callbackUrl": "https://your-domain.com/api/webhooks/mx-merchant",
  "sources": "QuickPay, API, Recurring",
  "merchantId": 10001291238,
  "threshold": 0
}
```

**Field Descriptions**:
- `sendEmail`: Enable email notifications (boolean)
- `emailAddress`: Email address for notifications (string)
- `sendSMS`: Enable SMS notifications (boolean)  
- `phoneNumber`: Phone number for SMS (string, numbers only)
- `sendWebhook`: Enable webhook notifications (boolean)
- `callbackUrl`: Your webhook endpoint URL (string)
- `sources`: Transaction sources to monitor (string, comma-separated)
- `merchantId`: MX Merchant ID (number, optional)
- `threshold`: Minimum transaction amount (number, 0 = all transactions)

**Sources Options**:
- `QuickPay` - Direct payment processing
- `API` - API-based transactions  
- `Recurring` - Recurring payment transactions
- Combine with commas: `"QuickPay, API, Recurring"`

### GET - Retrieve Existing Subscriptions
**Endpoint**: `/checkout/v3/subscription`
**Method**: GET
**Response**: Returns all notification subscriptions for the merchant

## Event Types

MX Merchant supports these webhook event types:
- **Successful Payments**
- **Failed Payments** 
- **Chargebacks**
- **Deposits**
- **Refunds**
- **New Statements**
- **Batch Closed**
- **Expired Cards**
- **SAQ Expiration**

## Webhook Payload Structure

### Successful Payment Event
```json
{
  "eventType": "payment.success",
  "merchantId": 1000095245,
  "timestamp": "2025-07-24T10:01:50.51Z",
  "data": {
    "paymentId": 4000000050326218,
    "amount": "155.25",
    "status": "Approved",
    "invoice": "2484",
    "clientReference": "2484", 
    "customerName": "Anthony Massey",
    "customerCode": "05K4Y006HCZH",
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
}
```

### Failed Payment Event
```json
{
  "eventType": "payment.failed",
  "merchantId": 1000095245,
  "timestamp": "2025-07-24T10:01:50.51Z",
  "data": {
    "paymentId": 4000000050326219,
    "amount": "155.25",
    "status": "Declined",
    "invoice": null,
    "customerName": "John Doe",
    "authMessage": "Insufficient funds",
    "responseCode": 51,
    "cardAccount": {
      "cardType": "Visa",
      "last4": "1234"
    },
    "declineReason": "Insufficient funds"
  }
}
```

## Implementation Requirements

### Critical Limitations
1. **Single Event Setup**: Only 1 event type can be configured per API call
2. **Dual Requirements**: Each notification channel must be set to `true` AND provided with endpoint
3. **Merchant Scope**: All notifications are tied to merchant ID

### Webhook Response Requirements
Your webhook endpoint must:
- Return HTTP 200 status code
- Respond within 30 seconds
- Handle duplicate notifications (idempotency)

### Security Considerations
- Verify webhook authenticity using merchant credentials
- Use HTTPS for callback URLs
- Implement proper error handling and logging

## Example Implementation

### Minimal Webhook Setup (Our Test Case)
```json
{
  "sendWebhook": true,
  "callbackUrl": "https://saas-wine-three.vercel.app/api/webhook-test/receive",
  "sources": "QuickPay, API, Recurring",
  "threshold": 0,
  "sendEmail": false,
  "sendSMS": false
}
```

### Production Setup for GameDay Men's Health
```json
{
  "sendWebhook": true,
  "callbackUrl": "https://saas-wine-three.vercel.app/api/webhooks/mx-merchant",
  "sources": "QuickPay, API, Recurring",
  "merchantId": YOUR_MERCHANT_ID,
  "threshold": 0,
  "sendEmail": false,
  "sendSMS": false
}
```

## Data Mapping for Our System

### Transaction Table Mapping
```javascript
const transactionData = {
  mx_payment_id: webhookData.data.paymentId,
  amount: parseFloat(webhookData.data.amount),
  transaction_date: webhookData.timestamp,
  status: webhookData.data.status,
  mx_invoice_number: webhookData.data.invoice ? parseInt(webhookData.data.invoice) : null,
  customer_name: webhookData.data.customerName,
  auth_code: webhookData.data.authCode,
  reference_number: webhookData.data.reference,
  card_type: webhookData.data.cardAccount?.cardType,
  card_last4: webhookData.data.cardAccount?.last4,
  transaction_type: webhookData.data.type,
  source: webhookData.data.source,
  raw_data: webhookData
};
```

This webhook system will capture ALL transactions (with/without invoices) in real-time, solving the core data completeness issue.