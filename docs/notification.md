# MX Merchant Notification/Webhook API Documentation

## API Endpoints
documentation https://developer.mxmerchant.com/docs/notification-examples
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
  "callbackUrl": "https://saas-auto.vercel.app/api/webhook",
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
  {
  "eventType": "PaymentSuccess",
  "merchantId": "418355562",
  "xmid": "554402000377887",
  "dba": "Merchant Name",
  "id": "22343388",
  "invoiceId": null,
  "invoiceNumber": "Z009BQGM",
  "transactionDate": "Aug 9 2018 6:21PM",
  "localDate": "Aug 9 2018 2:21PM",
  "transactionTypeName": "Sale",
  "paymentType": "ACH",
  "card": null,
  "referenceNumber": "822118000094",
  "authorizationCode": null,
  "responseCode": "0",
  "pan4": null,
  "totalAmount": "11.11",
  "responseMessage": "Approved",
  "customer": null,
  "customerNumber": null,
  "source": "QuickPay",
  "customFields": null
}
}
```

### Failed Payment Event
```json
{
  "eventType": "PaymentFail",
  "merchantId": "418355562",
  "xmid": "554402000377887",
  "dba": "Merchant Name",
  "id": "22343395",
  "invoiceId": null,
  "invoiceNumber": "Z00AJPR8",
  "transactionDate": "Aug 9 2018 6:56PM",
  "localDate": "Aug 9 2018 2:56PM",
  "transactionTypeName": "Sale",
  "paymentType": "Card",
  "card": "Visa",
  "referenceNumber": "822118000102",
  "authorizationCode": null,
  "responseCode": "61",
  "pan4": "0001",
  "totalAmount": "11.11",
  "responseMessage": "Exceeds withdrawal amount limit. ",
  "customer": null,
  "customerNumber": null,
  "source": "QuickPay",
  "customFields": null
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
  "callbackUrl": "https://saas-auto.vercel.app/api/webhook",
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
  "callbackUrl": "https://saas-auto.vercel.app/api/webhook",
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