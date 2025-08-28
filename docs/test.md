# MX Merchant Webhook Test Files

This document lists all files created for the MX Merchant webhook testing functionality. Use this for cleanup or debugging purposes.

## Created Files

### Frontend Pages
- `src/app/webhook-test/page.tsx` - Main test page UI

### API Endpoints
- `src/app/api/webhook-test/create-subscription/route.ts` - Create webhook subscription
- `src/app/api/webhook-test/receive/route.ts` - Receive webhook data from MX Merchant
- `src/app/api/webhook-test/data/route.ts` - Fetch stored webhook data
- `src/app/api/webhook-test/clear/route.ts` - Clear all test data

### Database
- `database/webhook_test_table.sql` - SQL script to create test table
- **Table created**: `webhook_test_data` (in Supabase)

### Test URLs (Production)
- Test Page: `https://saas-wine-three.vercel.app/webhook-test`
- Webhook Endpoint: `https://saas-wine-three.vercel.app/api/webhook-test/receive`

## Cleanup Instructions

### To Remove Test Files:
```bash
# Remove frontend page
rm src/app/webhook-test/page.tsx
rmdir src/app/webhook-test

# Remove API endpoints
rm -rf src/app/api/webhook-test/

# Remove database script
rm database/webhook_test_table.sql
```

### To Remove Database Table:
```sql
-- Run in Supabase SQL Editor
DROP TABLE IF EXISTS webhook_test_data CASCADE;
```

### To Remove Webhook Subscription:
- Use MX Merchant dashboard or API to remove webhook subscription
- Or create new API endpoint to delete subscription

## Environment Variables Used
- `MX_MERCHANT_CONSUMER_KEY`
- `MX_MERCHANT_CONSUMER_SECRET` 
- `MX_MERCHANT_ENVIRONMENT`
- `NEXT_PUBLIC_APP_URL`

## Testing Checklist
- [ ] Database table created
- [ ] Test page accessible
- [ ] Webhook subscription created successfully
- [ ] Webhook endpoint receiving data
- [ ] Data stored in database
- [ ] Data displayed in UI
- [ ] Clear function working