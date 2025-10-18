# Payment Integration Fixes - Summary

## Issues Fixed

### 1. ✅ Auto-Reinitialization on Checkout Return
**Problem**: When user returned to checkout after being redirected to payment, a new payment was immediately initiated.

**Fix**: 
- Added URL param checks (`?payment=success/failed/timeout`) to prevent auto-trigger
- Added sessionStorage `kpay_reference` check to prevent re-triggering when active payment exists
- User now sees success banner and can manually place order

**Files Changed**:
- `src/app/(root)/checkout/CheckoutPage.tsx` (lines 1136-1233)

### 2. ✅ Early Timeout (Before 5 Minutes)
**Problem**: Timeout message appeared before 5 minutes elapsed.

**Fix**:
- Corrected polling logic: changed `next >= maxStatusChecks` to `next > maxStatusChecks`
- Ensures exactly 30 polls (checks 0-29) = 300 seconds before timeout
- Check 0: immediate, Check 1: +10s, ..., Check 29: +290s, Check 30: timeout

**Files Changed**:
- `src/app/(root)/payment/[paymentId]/page.tsx` (lines 106-246)

### 3. ✅ Slow Redirect on Success
**Problem**: User had to wait 1.2 seconds after payment success before redirect.

**Fix**:
- Removed setTimeout delay on success redirect
- Now redirects immediately: `router.push('/checkout?payment=success')` as soon as status is detected
- Reduced other redirect delays (failed: 1.2s → 0.8s, timeout: 2.2s → 1.5s)

**Files Changed**:
- `src/app/(root)/payment/[paymentId]/page.tsx` (lines 173-174, 211-212, 269-271, 302-303)

### 4. ✅ Database Status Not Updating
**Problem**: Payment status remained "pending" in database even after successful payment.

**Root Cause**: Two possible issues:
1. Webhook not being called by KPay (most likely)
2. Webhook/status API failing to update database

**Fixes Applied**:

#### a. Enhanced Webhook Persistence
- Webhook now saves complete KPay response data:
  - `kpay_webhook_data`: Full webhook payload
  - `kpay_pay_account`: Payment account info
  - `kpay_transaction_id`: Transaction ID from webhook
  - `kpay_mom_transaction_id`: Mobile money transaction ID

**Files Changed**:
- `src/app/api/webhooks/kpay/route.ts` (lines 98-173)

#### b. Enhanced Status API Persistence
- Status check now saves complete KPay response:
  - `kpay_response`: Full status check response
  - Updates status immediately when KPay reports completion

**Files Changed**:
- `src/app/api/payments/kpay/status/route.ts` (lines 109-264)

#### c. Comprehensive Logging
- Added detailed logs before/after every DB update
- Logs include: status, update data structure, error codes/details
- Can diagnose if updates are failing or webhook isn't being called

**Files Changed**:
- `src/app/api/webhooks/kpay/route.ts` (lines 140-172)
- `src/app/api/payments/kpay/status/route.ts` (lines 225-264)

### 5. ✅ Duplicate Payment Rows
**Problem**: Multiple payment rows created for single payment attempt during concurrency.

**Fix**:
- Added unique index on `payments.reference` column
- Server-side deduplication in initiate endpoint
- If insert fails, reuse existing payment row

**Files Changed**:
- `supabase/migrations/20251018_add_unique_index_payments_reference.sql` (new file)
- `src/app/api/payments/kpay/initiate/route.ts` (existing dedup logic)

### 6. ✅ LocalStorage Not Cleared After Order
**Problem**: Checkout data persisted in localStorage even after successful order creation.

**Fix**:
- Created `clearAllCheckoutClientState()` helper function
- Clears: `localStorage.nihemart_checkout_v1`, `localStorage.cart`, `sessionStorage.kpay_reference`
- Called only after successful order creation

**Files Changed**:
- `src/app/(root)/checkout/CheckoutPage.tsx` (lines 117-132, 1717, 1900)

### 7. ✅ Payment Not Linked to Order After Creation
**Problem**: After successful payment and order creation, `payments.order_id` remained NULL and order `payment_status` was not updated.

**Fix**:
- Enhanced payment linking logic with comprehensive error handling and logging
- After order creation, automatically finds payment by `kpay_reference` and links it
- Updates both `payments.order_id` and `orders.payment_status` atomically
- Added detailed console logs to track linking process
- PATCH endpoint now also updates order's `payment_status` to 'paid'

**Files Changed**:
- `src/app/(root)/checkout/CheckoutPage.tsx` (lines 1699-1750)
- `src/app/api/payments/[paymentId]/route.ts` (lines 286-329)

## Database Schema Updates Required

Run this migration to add the unique index:

```bash
npm run supabase:migrate:up
```

Or manually run:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_unique ON public.payments(reference);
```

## Troubleshooting Guide

### Issue: Database Still Not Updating on Success

#### Step 1: Verify Webhook Configuration
**Check your `.env.local` file**:
```env
KPAY_WEBHOOK_URL=https://yourdomain.com/api/webhooks/kpay
```

**Important Notes**:
- Must be a publicly accessible URL (not `localhost` unless using ngrok/tunneling)
- Must be configured in KPay merchant dashboard
- KPay will POST to this URL when payment status changes

**Test webhook endpoint**:
```bash
curl https://yourdomain.com/api/webhooks/kpay/test
```

Should return:
```json
{
  "success": true,
  "message": "KPay webhook endpoint is reachable",
  "webhookUrl": "your-configured-url"
}
```

#### Step 2: Check Server Logs
Look for these log entries when payment completes:

**Webhook logs** (if webhook is working):
```
[webhook] KPay webhook received
[webhook] Webhook processed
[webhook] Updating payment with data
[webhook] Payment updated successfully
```

**Status API logs** (fallback if webhook doesn't arrive):
```
Updating payment in database
Payment successfully updated in database
```

If you don't see webhook logs but see status logs, the webhook is not reaching your server.

#### Step 3: Manual Webhook Test
You can manually trigger a webhook to test:

```bash
curl -X POST https://yourdomain.com/api/webhooks/kpay \
  -H "Content-Type: application/json" \
  -d '{
    "tid": "test-tid-123",
    "refid": "TEST_REF_123",
    "statusid": "01",
    "statusdesc": "Payment successful",
    "momtransactionid": "MOM123456"
  }'
```

Check server logs to see if it processes correctly.

#### Step 4: Check Database Directly
Query the payments table:

```sql
SELECT 
  id, 
  reference, 
  status, 
  kpay_transaction_id,
  kpay_webhook_data,
  kpay_response,
  updated_at
FROM payments 
WHERE reference = 'YOUR_PAYMENT_REFERENCE'
ORDER BY created_at DESC 
LIMIT 1;
```

**What to check**:
- `status`: Should be "completed" after successful payment
- `kpay_webhook_data`: Should contain webhook payload (if webhook was received)
- `kpay_response`: Should contain status check response (always present from polling)
- `updated_at`: Should be recent if updates are working

### Issue: Webhook Not Reaching Server

**Common Causes**:
1. **Local Development**: `localhost` URLs won't work
   - **Solution**: Use ngrok or similar tunneling service
   - Example: `ngrok http 3000` then use the ngrok URL

2. **Firewall/Network**: Server might be blocking KPay's IP
   - **Solution**: Whitelist KPay's IPs in your firewall

3. **Wrong URL in KPay Dashboard**: Webhook URL not configured correctly
   - **Solution**: Log into KPay merchant dashboard and verify webhook URL

4. **HTTPS Required**: KPay may require HTTPS for webhooks
   - **Solution**: Ensure your webhook URL uses HTTPS

### Issue: Payment Status Updates but Client Still Shows Pending

**Cause**: Client-side state not refreshing after server update.

**Solution**: The status check polling should detect the change within 10 seconds. If not:
1. Check browser console for errors
2. Verify polling is still running (look for "Checking payment status..." logs)
3. Refresh the page manually - it should show updated status

## Testing Checklist

### Pre-Deployment
- [ ] Database migration applied (`idx_payments_reference_unique` index created)
- [ ] Environment variable `KPAY_WEBHOOK_URL` set to public URL
- [ ] Webhook URL configured in KPay merchant dashboard
- [ ] Test webhook endpoint accessible: `/api/webhooks/kpay/test`

### Payment Flow Test
1. **Initiate Payment**
   - [ ] Select payment method
   - [ ] Redirected to payment page (NOT auto-reinitialized)
   - [ ] Payment instructions displayed

2. **Complete Payment**
   - [ ] Complete payment on phone/gateway
   - [ ] Status updates from "pending" to "completed" within 10 seconds
   - [ ] Database `payments.status` updates to "completed"
   - [ ] Redirected to checkout immediately (< 1 second)

3. **Place Order**
   - [ ] Checkout shows success banner
   - [ ] "Place Order" button enabled
   - [ ] Order created successfully
   - [ ] LocalStorage cleared after order creation
   - [ ] Payment linked to order (`payments.order_id` populated)

4. **Timeout Scenario**
   - [ ] Start payment but don't complete
   - [ ] Wait exactly 5 minutes (300 seconds)
   - [ ] Timeout message appears
   - [ ] Redirected to checkout with `?payment=timeout`
   - [ ] Can retry with different payment method

### Database Verification
After successful payment:
```sql
-- Check payment record
SELECT * FROM payments WHERE reference = 'YOUR_REF' ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- status = 'completed'
-- kpay_webhook_data IS NOT NULL (if webhook worked)
-- kpay_response IS NOT NULL (from status polling)
-- order_id IS NOT NULL (after order placed)

-- Check order record
SELECT * FROM orders WHERE id = 'YOUR_ORDER_ID';

-- Should show:
-- status = 'paid' or 'confirmed'
-- payment_status = 'paid'
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User selects payment method on checkout                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Auto-trigger payment initiation (ONCE)                     │
│  - Creates payment record (status: pending)                 │
│  - Saves kpay_reference to sessionStorage                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Redirect to payment page                                   │
│  - Shows instructions (complete on phone)                   │
│  - Starts polling every 10s                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌─────────────┐     ┌──────────────┐
│  Webhook    │     │  Status Poll │
│  (KPay→Us)  │     │  (Us→KPay)   │
└──────┬──────┘     └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Database updated (status: completed)                       │
│  - kpay_webhook_data saved (if webhook)                     │
│  - kpay_response saved (from polling)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Client detects success (via polling)                       │
│  - Stops polling immediately                                │
│  - Shows success message                                    │
│  - Redirects to checkout IMMEDIATELY                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Checkout page                                              │
│  - Detects ?payment=success param                           │
│  - Does NOT auto-trigger new payment                        │
│  - Shows "Place Order" button                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Place Order"                                  │
│  - Creates order record                                     │
│  - Links payment to order (payments.order_id)               │
│  - Clears localStorage and sessionStorage                   │
│  - Redirects to order confirmation                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Files Modified

### Frontend
- `src/app/(root)/checkout/CheckoutPage.tsx`: Auto-trigger guards, cleanup
- `src/app/(root)/payment/[paymentId]/page.tsx`: Polling logic, timeout, redirects

### Backend
- `src/app/api/webhooks/kpay/route.ts`: Webhook handler, logging
- `src/app/api/payments/kpay/status/route.ts`: Status check, DB updates
- `src/app/api/payments/kpay/initiate/route.ts`: Deduplication
- `src/app/api/payments/timeout/route.ts`: Timeout message fix

### Database
- `supabase/migrations/20251018_add_unique_index_payments_reference.sql`: Unique constraint

### Test Utilities
- `src/app/api/webhooks/kpay/test/route.ts`: Webhook testing endpoint

## Support

If payments are still not updating after applying these fixes:

1. **Check webhook configuration** (most common issue)
2. **Review server logs** for error messages
3. **Query database directly** to see what's being saved
4. **Test webhook endpoint** with manual curl request
5. **Verify KPay credentials** are correct in environment variables

The logging is now comprehensive enough to diagnose the exact point of failure.
