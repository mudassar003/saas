# MX Merchant API Testing - Windows CMD Commands

## New Credentials (Merchant ID: 1000121414) - Single Line Commands

### Test Transactions
```cmd
curl -u "c0gayW90vz2zdzaceQ5SAHP:SAZVn5VPug34pt+IJuqzKY8x3dM=" "https://api.mxmerchant.com/checkoutv3/payment?merchantId=1000121414&limit=2" -H "Content-Type: application/json"
```

### Test Invoices
```cmd
curl -u "c0gayW90vz2zdzaceQ5SAHP:SAZVn5VPug34pt+IJuqzKY8x3dM=" "https://api.mxmerchant.com/checkout/v3/invoice?merchantId=1000121414&limit=2" -H "Content-Type: application/json"
```

### Get More Transactions
```cmd
curl -u "c0gayW90vz2zdzaceQ5SAHP:SAZVn5VPug34pt+IJuqzKY8x3dM=" "https://api.mxmerchant.com/checkout/v3/payment?merchantId=1000121414&limit=10&offset=0" -H "Content-Type: application/json"
```

### Test Connection (Single Invoice)
```cmd
curl -u "c0gayW90vz2zdzaceQ5SAHP:SAZVn5VPug34pt+IJuqzKY8x3dM=" "https://api.mxmerchant.com/checkout/v3/invoice?merchantId=1000121414&limit=1" -H "Content-Type: application/json"
```