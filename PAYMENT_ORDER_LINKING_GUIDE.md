# Payment-Order Linking Guide

## Complete Flow After Successful Payment

### 1. Payment Completes (Webhook or Polling)
```
Database updates:
- payments.status = 'completed'
- payments.kpay_webhook_data = {webhook payload}
- payments.kpay_response = {status check response}
- payments.completed_at = timestamp
```

### 2. Client Detects Success
```
- Polling detects status = 'completed'
- Stops polling immediately
- Shows success toast
- Redirects to checkout with ?payment=success
```

### 3. User on Checkout Page
```
- Detects ?payment=success param
- Does NOT auto-trigger new payment
- Shows success banner
- Enables "Place Order" button
```

### 4. User Clicks "Place Order"
```
- Creates order in database
- Order status = 'pending'
- Order payment_status = 'pending' (initially)
```

### 5. Automatic Payment Linking (After Order Creation)
```javascript
// Client-side (CheckoutPage.tsx - lines 1699-1750)
const reference = sessionStorage.getItem('kpay_reference');

// Step 1: Fetch payment by reference
const statusResp = await fetch('/api/payments/kpay/status', {
  method: 'POST',
  body: JSON.stringify({ reference })
});
const { paymentId } = await statusResp.json();

// Step 2: Link payment to order
const linkResp = await fetch(`/api/payments/${paymentId}`, {
  method: 'PATCH',
  body: JSON.stringify({ order_id: createdOrder.id })
});

// Server-side (payments/[paymentId]/route.ts - lines 286-329)
// Updates:
// 1. payments.order_id = order_id
// 2. orders.payment_status = 'paid'
```

### 6. Final State
```
Database final state:
- payments.order_id = {order uuid}
- payments.status = 'completed'
- orders.payment_status = 'paid'
- orders.status = 'pending' (awaiting fulfillment)

Client state:
- localStorage cleared (checkout data, cart)
- sessionStorage cleared (kpay_reference)
- User redirected to /orders/{orderId}
```

## Console Log Trail

When payment linking works correctly, you'll see:

```
✓ Linking payment to order { reference: 'SES_...', orderId: 'uuid...' }
✓ Found payment to link { paymentId: 'uuid...', orderId: 'uuid...' }
✓ Successfully linked payment to order { paymentId: 'uuid...', orderId: 'uuid...' }
```

Server logs (in API):
```
[api] Linking payment to order { paymentId: '...', orderId: '...' }
[api] Order payment_status updated to paid { orderId: '...' }
[api] Payment successfully linked to order { paymentId: '...', orderId: '...' }
```

## Troubleshooting Payment Linking

### Issue: payments.order_id is NULL after order creation

**Check 1: Was payment completed before order creation?**
```sql
SELECT id, reference, status, completed_at, order_id
FROM payments
WHERE reference = 'YOUR_REFERENCE'
ORDER BY created_at DESC LIMIT 1;
```

Expected: `status = 'completed'`, `order_id = NULL` (before linking)

**Check 2: Check browser console logs**
Look for:
- "Linking payment to order" - Should appear after order creation
- "Found payment to link" - Payment lookup succeeded
- "Successfully linked payment to order" - Link API call succeeded

If you see "No kpay_reference in sessionStorage":
- Payment reference was cleared too early
- Check if auto-trigger cleared it incorrectly

**Check 3: Check server logs**
Look for:
```
[api] Linking payment to order
[api] Payment successfully linked to order
```

If missing, the PATCH request didn't reach the server.

**Check 4: Verify link endpoint works**
Manual test:
```bash
curl -X PATCH https://yourdomain.com/api/payments/{PAYMENT_ID} \
  -H "Content-Type: application/json" \
  -d '{"order_id": "{ORDER_ID}"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Payment linked to order successfully",
  "paymentId": "...",
  "orderId": "..."
}
```

### Issue: orders.payment_status not updated to 'paid'

**Cause**: The PATCH endpoint may have failed to update the order.

**Check server logs**:
```
[api] Failed to update order payment_status { orderId: '...', error: '...' }
```

**Verify manually**:
```sql
UPDATE orders
SET payment_status = 'paid', updated_at = NOW()
WHERE id = 'YOUR_ORDER_ID';
```

## Verification Queries

### Check Complete Payment-Order Link
```sql
SELECT 
  p.id as payment_id,
  p.reference,
  p.status as payment_status,
  p.order_id,
  p.completed_at as payment_completed_at,
  o.id as order_id,
  o.order_number,
  o.status as order_status,
  o.payment_status as order_payment_status,
  o.created_at as order_created_at
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id
WHERE p.reference = 'YOUR_REFERENCE'
ORDER BY p.created_at DESC
LIMIT 1;
```

**Expected after successful flow**:
- `payment_status` = 'completed'
- `order_id` IS NOT NULL
- `order_payment_status` = 'paid'
- `order_status` = 'pending' (or 'confirmed' depending on your workflow)

### Find Orphaned Payments (Completed but Not Linked)
```sql
SELECT 
  id,
  reference,
  status,
  completed_at,
  created_at
FROM payments
WHERE status = 'completed'
  AND order_id IS NULL
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

These are payments that succeeded but order was never created. Should be rare.

### Find Orders with Pending Payment Status (But Payment Completed)
```sql
SELECT 
  o.id as order_id,
  o.order_number,
  o.payment_status as order_payment_status,
  p.id as payment_id,
  p.status as payment_status,
  p.completed_at
FROM orders o
INNER JOIN payments p ON p.order_id = o.id
WHERE p.status = 'completed'
  AND o.payment_status != 'paid'
ORDER BY o.created_at DESC
LIMIT 10;
```

These are orders where payment completed but order wasn't updated. Can be fixed manually:
```sql
UPDATE orders o
SET payment_status = 'paid', updated_at = NOW()
FROM payments p
WHERE p.order_id = o.id
  AND p.status = 'completed'
  AND o.payment_status != 'paid';
```

## Manual Linking (Recovery)

If automatic linking failed, you can manually link:

```sql
-- Step 1: Find the payment
SELECT id, reference, status, completed_at
FROM payments
WHERE reference = 'SES_...'  -- or search by customer email/phone
  AND status = 'completed'
  AND order_id IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Find the order
SELECT id, order_number, customer_email, total, created_at
FROM orders
WHERE customer_email = 'customer@example.com'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 1;

-- Step 3: Link them
UPDATE payments
SET order_id = 'ORDER_UUID_HERE', updated_at = NOW()
WHERE id = 'PAYMENT_UUID_HERE';

-- Step 4: Update order payment status
UPDATE orders
SET payment_status = 'paid', updated_at = NOW()
WHERE id = 'ORDER_UUID_HERE';
```

## Best Practices

1. **Always check logs first** - Console and server logs show exactly where the process failed

2. **Don't clear sessionStorage too early** - `kpay_reference` must persist until after order creation

3. **Verify in database** - Use the verification queries to confirm linking succeeded

4. **Monitor orphaned payments** - Run the orphaned payments query daily to catch failures

5. **Keep completed_at timestamps** - These help determine the order of operations when debugging

## Key Files for Linking Logic

### Frontend (Client-Side)
- `src/app/(root)/checkout/CheckoutPage.tsx` (lines 1699-1750)
  - Reads `kpay_reference` from sessionStorage
  - Calls status API to get paymentId
  - Calls PATCH endpoint to link payment to order
  - Comprehensive error logging

### Backend (Server-Side)
- `src/app/api/payments/[paymentId]/route.ts` (PATCH handler, lines 205-329)
  - Validates payment and order exist
  - Links `payments.order_id` to order
  - Updates `orders.payment_status` to 'paid'
  - Returns success/error response

- `src/app/api/payments/kpay/status/route.ts`
  - Returns `paymentId` and `orderId` in response
  - Used by checkout to find payment by reference

## Success Criteria

After a successful payment → order flow:

✅ Payment found by reference in status API
✅ Console logs show "Successfully linked payment to order"
✅ Database: `payments.order_id` is populated
✅ Database: `orders.payment_status` = 'paid'
✅ sessionStorage and localStorage cleared
✅ User redirected to order confirmation page

If any of these fail, check the console/server logs and use the troubleshooting queries above.
