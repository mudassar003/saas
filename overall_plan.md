Data Required For Our Website From MX Merchant

1. Patient Name
2. Product
3. Price
4. Type of Payment
5. Date
6. Invoice Date
7. last digit of card
8. status 
9. authorization code ( not necessary)
10. ALL transactions

Problem Statement:
All end points have number of invoice common 

https://api.mxmerchant.com/checkout/v3/payment  =  "invoice": "2636",
https://api.mxmerchant.com/checkout/v3/payment/4000000054389881 =  "invoice": "2636",
https://api.mxmerchant.com/checkout/v3/invoice = "invoiceNumber": 2636,
https://api.mxmerchant.com/checkout/v3/invoice/10299894 =  "invoiceNumber": 2636,
webhook =   "invoiceNumber": "2636",

BUT only Invoice Id which can be used in this end point https://api.mxmerchant.com/checkout/v3/invoice/10299894  to get products is only availale in 

https://api.mxmerchant.com/checkout/v3/payment/4000000054389881 = "invoiceIds": [
        10299894
    ],


https://api.mxmerchant.com/checkout/v3/invoice =  "id": 10299890,


1. if we use payment api we get all transaction that is fine but we dont get invoice id 
2. if we use invoice api we get all transactions but do not get which dont have any invoice number so thats a problem data wil be missing
3. only way to fetch complete product data is using invoice id 
4. in webhook we only get invoice numner but we dont get invoice id

we are buildiing a multi tenat system as each transaction or api will have merchant id so we will use rls. 

1. now options as in my mind if i use cron job after every 5 minutes it will run a loop to credentials of all tenat and will fetch specific number of invoices or transaction and other api calls and save data in database and it is compulsory by mx merchant to have api keys in each api call as basic authentication ( key:secret pair)

2. second option is to use webhook as soon receive a webhook make an api call for specific account to get invoice if it will have invoice number using merchant id and then make other calls in a server on rialway for processing.

3. how and in which sequence to call apis and which data to save in database or raw data

right now we are using


- **Stack**: Next.js 15 + TypeScript + PostgreSQL ( supabase)
- **Pattern**: Multi-tenant SaaS with Row-Level Security (RLS)
- **Auth**: NextAuth.js
- **Database**: Supabase 
- **Deployment**: Vercel pro





we have multiple apis provided by mx merchant

1. https://api.mxmerchant.com/checkout/v3/payment

This api end point provide a list of all transactions that have been done in mx merchant from any source. Below is its output, Ib this output there is field named as "invoice" which is the number of invoice. 
Note: Invoice number and Invoice Id are two different variables


    "records": 
        {
            "created": "2025-08-11T10:02:25.45Z",
            "paymentToken": "PRetQsN92nY8kgjVkqFtdUuFplvY3ou7",
            "id": 4000000054389881,
            "creatorName": "RecurringBilling",
            "isDuplicate": false,
            "merchantId": 1000095245,
            "device": "MXMRCG01",
            "batch": "Z03W0",
            "tenderType": "Card",
            "amount": "181.12",
            "cardAccount": {
                "cardType": "MasterCard",
                "last4": "2242",
                "token": "PRetQsN92nY8kgjVkqFtdUuFplvY3ou7",
                "hasContract": false,
                "cardPresent": false
            },
            "authOnly": false,
            "authCode": "050226",
            "status": "Approved",
            "risk": {
                "avsResponse": "No Response from AVS",
                "avsAddressMatch": false,
                "avsZipMatch": false,
                "avsAccountNameMatchPerformed": false
            },
            "settledAmount": "0",
            "currency": "USD",
            "settledCurrency": "USD",
            "cardPresent": false,
            "authMessage": "Approved or completed successfully",
            "availableAuthAmount": "0",
            "reference": "522310617181",
            "tax": "7.21",
            "surchargeAmount": "6.12",
            "surchargeRate": "0.035",
            "surchargeLabel": "admin fee",
            "invoice": "2636",
            "customerCode": "05KDU007L16X",
            "customerName": "Gregorio Colon",
            "clientReference": "2636",
            "refundedAmount": "0",
            "type": "Sale",
            "taxExempt": false,
            "reviewIndicator": 1,
            "source": "Recurring",
            "shouldGetCreditCardLevel": false,
            "responseCode": 0,
            "IssuerResponseCode": "00"
        },
        {
            "created": "2025-08-11T10:02:24.963Z",
            "paymentToken": "PBRntLCfxcuC8y7NUEvLX1rBCn7Ft570",
            "id": 4000000054389877,
            "creatorName": "RecurringBilling",
            "isDuplicate": false,
            "merchantId": 1000095245,
            "device": "MXMRCG01",
            "batch": "Z03W0",
            "tenderType": "Card",
            "amount": "269.1",
            "cardAccount": {
                "cardType": "Visa",
                "last4": "6042",
                "token": "PBRntLCfxcuC8y7NUEvLX1rBCn7Ft570",
                "hasContract": false,
                "cardPresent": false
            },
            "authOnly": false,
            "authCode": "06765I",
            "status": "Approved",
            "risk": {
                "avsAccountNameMatchPerformed": false
            },
            "settledAmount": "0",
            "currency": "USD",
            "settledCurrency": "USD",
            "cardPresent": false,
            "authMessage": "Approved and completed successfully",
            "availableAuthAmount": "0",
            "reference": "522310617171",
            "tax": "10.72",
            "surchargeAmount": "9.1",
            "surchargeRate": "0.035",
            "surchargeLabel": "admin fee",
            "invoice": "2635",
            "customerCode": "05KDY005FRLE",
            "customerName": "Mike (Michael) Greeson",
            "clientReference": "2635",
            "refundedAmount": "0",
            "type": "Sale",
            "taxExempt": false,
            "reviewIndicator": 0,
            "source": "Recurring",
            "shouldGetCreditCardLevel": false,
            "responseCode": 0,
            "IssuerResponseCode": "00"
        }
        

2. https://api.mxmerchant.com/checkout/v3/payment/4000000054389881

This end point take this parameter from any transacation that is fetched using api as "id" and provide these details

{
    "created": "2025-08-11T10:02:25.45Z",
    "paymentToken": "PRetQsN92nY8kgjVkqFtdUuFplvY3ou7",
    "id": 4000000054389881,
    "creatorName": "RecurringBilling",
    "isDuplicate": false,
    "merchantId": 1000095245,
    "device": "MXMRCG01",
    "batch": "Z03W0",
    "batchId": 10000005719826,
    "tenderType": "Card",
    "amount": "181.12",
    "cardAccount": {
        "cardType": "MasterCard",
        "entryMode": "Keyed",
        "last4": "2242",
        "cardId": "ocQbcGEsK1SxPSfD5j1wiA2769Qf",
        "token": "PRetQsN92nY8kgjVkqFtdUuFplvY3ou7",
        "expiryMonth": "07",
        "expiryYear": "28",
        "hasContract": false,
        "cardPresent": false,
        "isDebit": true,
        "isCorp": false
    },
    "posData": {
        "panCaptureMethod": "Manual"
    },
    "authOnly": false,
    "authCode": "050226",
    "status": "Approved",
    "risk": {
        "avsResponseCode": "N",
        "avsAddressMatch": false,
        "avsZipMatch": false,
        "avsAccountNameMatchPerformed": false
    },
    "requireSignature": false,
    "settledAmount": "0",
    "currency": "USD",
    "settledCurrency": "USD",
    "cardPresent": false,
    "authMessage": "Approved or completed successfully",
    "originalAmount": "181.12",
    "availableAuthAmount": "0",
    "reference": "522310617181",
    "tax": "7.21",
    "cashbackAmount": "0",
    "surchargeAmount": "6.12",
    "surchargeRate": "0.035",
    "surchargeLabel": "admin fee",
    "invoice": "2636",
    "customerCode": "05KDU007L16X",
    "customerName": "Gregorio Colon",
    "discountAmount": "0",
    "clientReference": "2636",
    "type": "Sale",
    "taxExempt": false,
    "reviewIndicator": 1,
    "invoiceIds": [
        10299894
    ],
    "source": "Recurring",
    "shouldGetCreditCardLevel": false,
    "responseCode": 0,
    "IssuerResponseCode": "00",
    "balance": "0"
}

3. https://api.mxmerchant.com/checkout/v3/invoice
This api end point also provide all transaction that are performed on mx merchant but it does not list transactions that do not have invoice number " invoice "

 "records": 
        {
            "id": 10299894,
            "merchantId": 1000095245,
            "type": "Sale",
            "receiptNumber": "05K6R0LFNXHM",
            "invoiceNumber": 2636,
            "customerName": "Gregorio Colon",
            "isTaxExempt": false,
            "memo": "",
            "quantity": "1",
            "returnQuantity": "0",
            "returnStatus": "None",
            "totalAmount": "175",
            "subTotalAmount": "175",
            "discountAmount": "0",
            "balance": "0",
            "paidAmount": "175",
            "dueDate": "2025-08-11T04:00:00Z",
            "created": "2025-08-11T10:02:25.17Z",
            "invoiceDate": "2025-08-11T04:00:00Z",
            "sourceType": "Recurring",
            "status": "Paid",
            "terms": "Custom"
        },
        {
            "id": 10299890,
            "merchantId": 1000095245,
            "type": "Sale",
            "receiptNumber": "05K6R0LFNX4M",
            "invoiceNumber": 2635,
            "customerName": "Mike (Michael) Greeson",
            "customerNumber": "",
            "isTaxExempt": false,
            "memo": "",
            "quantity": "1",
            "returnQuantity": "0",
            "returnStatus": "None",
            "totalAmount": "260",
            "subTotalAmount": "260",
            "discountAmount": "0",
            "balance": "0",
            "paidAmount": "260",
            "dueDate": "2025-08-11T04:00:00Z",
            "created": "2025-08-11T10:02:24.713Z",
            "invoiceDate": "2025-08-11T04:00:00Z",
            "sourceType": "Recurring",
            "status": "Paid",
            "terms": "None",
            "currency": "USD"
        },

4.  https://api.mxmerchant.com/checkout/v3/invoice/10299894
This end point take a parameter "id" from invoices in this end point https://api.mxmerchant.com/checkout/v3/invoice and then fetch complete details of that invoice

{
    "id": 10299894,
    "merchantId": 1000095245,
    "type": "Sale",
    "receiptNumber": "05K6R0LFNXHM",
    "dba": "GAMEDAY MEN'S HEALTH - RESTON",
    "email": "GLENN@GAMEDAYMENSHEALTH.COM",
    "accessCode": "3NKIND",
    "invoiceNumber": 2636,
    "isTaxExempt": false,
    "memo": "",
    "quantity": "1",
    "saleQuantity": "1",
    "returnQuantity": "0",
    "returnStatus": "None",
    "netQuantity": "1",
    "totalAmount": "175",
    "subTotalAmount": "175",
    "discountAmount": "0",
    "balance": "0",
    "paidAmount": "175",
    "dueDate": "2025-08-11T04:00:00Z",
    "created": "2025-08-11T10:02:25.17Z",
    "invoiceDate": "2025-08-11T04:00:00Z",
    "sourceType": "Recurring",
    "purchases": [
        {
            "id": 9815630,
            "productName": "Testosterone Cypionate Subscription",
            "quantity": 1,
            "quantityReturned": 0,
            "price": "175",
            "discountAmount": "0",
            "priceDiscountAmount": "0",
            "subTotalAmount": "175",
            "taxAmount": "0",
            "totalAmount": "175",
            "trackingNumber": 0,
            "created": "2025-08-11T10:02:25.17Z",
            "taxes": [],
            "discounts": []
        }
    ],
    "shippingLineItems": [],
    "discounts": [],
    "taxes": [],
    "customer": {
        "id": 43868539,
        "name": "Gregorio Colon"
    },
    "masterCardSecureCode": "0",
    "status": "Paid",
    "terms": "Custom",
    "payments": [
        {
            "created": "2025-08-11T10:02:25.45Z",
            "paymentToken": "PRetQsN92nY8kgjVkqFtdUuFplvY3ou7",
            "id": 4000000054389881,
            "isDuplicate": false,
            "merchantId": 1000095245,
            "batchId": 10000005719826,
            "tenderType": "Card",
            "amount": "181.12",
            "cardAccount": {
                "cardType": "MasterCard",
                "entryMode": "Keyed",
                "last4": "2242",
                "token": "PRetQsN92nY8kgjVkqFtdUuFplvY3ou7",
                "expiryMonth": "07",
                "expiryYear": "28",
                "hasContract": false,
                "cardPresent": false
            },
            "authOnly": false,
            "authCode": "050226",
            "status": "Approved",
            "risk": {
                "avsResponseCode": "N",
                "avsAccountNameMatchPerformed": false
            },
            "requireSignature": false,
            "settledAmount": "0",
            "currency": "USD",
            "settledCurrency": "USD",
            "cardPresent": false,
            "originalAmount": "181.12",
            "availableAuthAmount": "0",
            "reference": "522310617181",
            "tax": "7.21",
            "cashbackAmount": "0",
            "surchargeAmount": "6.12",
            "surchargeRate": "0.035",
            "surchargeLabel": "admin fee",
            "invoice": "2636",
            "clientReference": "2636",
            "type": "Sale",
            "shouldGetCreditCardLevel": false,
            "responseCode": 0,
            "IssuerResponseCode": "00"
        }
    ],
    "barCode": "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",
    "allowCreditCard": true,
    "allowACH": true,
    "isShippingSameAsBilling": false,
    "legacy": false
}

5. webhook data
It provides all type of transaction similar to https://api.mxmerchant.com/checkout/v3/payment but instantly. here is its payload

 Webhook received:
{
  "eventType": "PaymentSuccess",
  "merchantId": "1000095245",
  "xmid": "8739735431311268",
  "dba": "GAMEDAY MEN'S HEALTH - RESTON",
  "id": "4000000054389881",
  "invoiceId": "",
  "invoiceNumber": "2636",
  "transactionDate": "Aug 11 2025 10:02AM",
  "localDate": "Aug 11 2025  6:02AM",
  "transactionTypeName": "Sale",
  "paymentType": "Card",
  "card": "MasterCard",
  "referenceNumber": "522310617181",
  "authorizationCode": "050226",
  "responseCode": "0",
  "replayId": "",
  "pan4": "2242",
  "totalAmount": "181.12",
  "responseMessage": "Approved or completed successfully",
  "customer": "Gregorio Colon",
  "customerNumber": "",
  "source": "Recurring",
  "customFields": "",
  "baseAmount": "175.00",
  "advantageFeeType": "admin fee",
  "advantageFeeAmount": "6.12"
}