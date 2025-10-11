# KPay Payment Integration Testing Guide

This guide provides step-by-step instructions for testing the KPay payment integration in your Nihemart e-commerce application.

## Prerequisites

Before testing, ensure you have:

1. **KPay Credentials**: Obtain your KPay sandbox credentials from KPay support
2. **Database Migration**: Successfully run the payments table migration
3. **Environment Setup**: Updated your `.env.local` file with KPay configuration

## Environment Configuration

### Required Environment Variables

Update your `.env.local` file with the following KPay configuration:

```env
# KPay Payment Gateway Configuration
KPAY_BASE_URL=https://pay.esicia.com
KPAY_LIVE_BASE_URL=https://pay.esicia.rw
# Replace with your actual KPay credentials
KPAY_USERNAME=your_actual_kpay_username
KPAY_PASSWORD=your_actual_kpay_password
KPAY_RETAILER_ID=your_actual_retailer_id
# Update with your domain for webhooks
KPAY_WEBHOOK_URL=http://localhost:3000/api/webhooks/kpay
KPAY_ENVIRONMENT=sandbox
```

### Important Notes:
- **Replace placeholder values** with your actual KPay credentials
- For production, change `KPAY_ENVIRONMENT` to `live`
- Update `KPAY_WEBHOOK_URL` to your actual domain for production

## Testing Checklist

### 1. Environment Setup ✅
- [ ] Database migration completed successfully
- [ ] Environment variables configured with actual KPay credentials
- [ ] Application restarted after environment changes

### 2. Payment Method Selection ✅
- [ ] Navigate to checkout page
- [ ] Verify payment method selector shows all options:
  - Cash on Delivery
  - MTN Mobile Money
  - Airtel Money
  - Visa Card
  - MasterCard
  - SPENN
- [ ] Verify payment method icons and descriptions display correctly
- [ ] Test selecting different payment methods

### 3. Cash on Delivery (Existing Flow) ✅
- [ ] Select "Cash on Delivery"
- [ ] Complete checkout process
- [ ] Verify order is created successfully
- [ ] Confirm redirect to order details page
- [ ] Check order status is "pending" with payment status "pending"

### 4. KPay Payment Methods Testing

#### Mobile Money Testing (MTN/Airtel)
- [ ] Select "MTN Mobile Money" or "Airtel Money"
- [ ] Enter valid Rwanda phone number (format: +250XXXXXXXXX or 07XXXXXXXX)
- [ ] Complete order creation
- [ ] Verify payment initiation process
- [ ] Check for proper redirects to KPay payment interface
- [ ] Test with various phone number formats:
  - `+250783123456`
  - `0783123456`
  - `250783123456`
  - `783123456`

#### Card Payment Testing (Visa/MasterCard)
- [ ] Select "Visa Card" or "MasterCard"
- [ ] Complete order creation
- [ ] Verify redirect to secure card payment interface
- [ ] Use test card numbers from KPay documentation:

**Test Visa Cards:**
```
4111 1111 1111 1111 (Consumer)
4000 0200 0000 0000 (Credit)
4000 1600 0000 0004 (Debit)
```

**Test MasterCards:**
```
5555 4444 3333 1111 (Consumer)
5101 1800 0000 0007 (Commercial Credit)
2222 4000 7000 0005 (Commercial Debit)
```

#### SPENN Testing
- [ ] Select "SPENN"
- [ ] Complete order creation
- [ ] Verify redirect to SPENN payment interface
- [ ] Test payment completion flow

### 5. Payment Status Testing

#### Success Flow
- [ ] Complete a test payment successfully
- [ ] Verify webhook receives payment confirmation
- [ ] Check order status updates to "confirmed"
- [ ] Confirm payment status updates to "paid"
- [ ] Verify customer receives confirmation

#### Failure Flow
- [ ] Initiate payment but cancel/fail it
- [ ] Verify webhook receives failure notification
- [ ] Check order status updates to "cancelled"
- [ ] Confirm payment status updates to "failed"
- [ ] Test retry payment functionality

#### Pending Flow
- [ ] Initiate payment but leave incomplete
- [ ] Verify order remains in "pending" status
- [ ] Test payment status checking
- [ ] Verify auto-refresh functionality on order page

### 6. API Endpoint Testing

#### Payment Initiation API
Test the `/api/payments/kpay/initiate` endpoint:

```bash
curl -X POST http://localhost:3000/api/payments/kpay/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-id",
    "amount": 1000,
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+250783123456",
    "paymentMethod": "mtn_momo",
    "redirectUrl": "http://localhost:3000/orders/test-order-id"
  }'
```

#### Webhook Testing
Test the `/api/webhooks/kpay` endpoint:

```bash
curl -X GET http://localhost:3000/api/webhooks/kpay
```

#### Payment Status API
Test the `/api/payments/kpay/status` endpoint:

```bash
curl -X POST http://localhost:3000/api/payments/kpay/status \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "test-payment-id"
  }'
```

### 7. Error Handling Testing

#### Validation Errors
- [ ] Test with missing required fields
- [ ] Test with invalid phone number formats
- [ ] Test with invalid payment methods
- [ ] Test with zero or negative amounts

#### Network Errors
- [ ] Test with incorrect KPay credentials
- [ ] Test with network connectivity issues
- [ ] Verify proper error messages displayed to users

#### Database Errors
- [ ] Test with non-existent order IDs
- [ ] Test duplicate payment attempts
- [ ] Verify proper error handling and logging

### 8. User Interface Testing

#### Desktop Testing
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Verify responsive design works correctly
- [ ] Check payment method icons display properly
- [ ] Verify loading states during payment processing

#### Mobile Testing
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify touch interactions work correctly
- [ ] Check mobile payment interfaces

### 9. Security Testing

#### Data Protection
- [ ] Verify sensitive data is not logged
- [ ] Check payment data encryption
- [ ] Verify webhook signature validation (if implemented)
- [ ] Test rate limiting on payment endpoints

#### Access Control
- [ ] Verify users can only access their own payment data
- [ ] Test admin access to payment information
- [ ] Check API authentication requirements

### 10. Performance Testing

#### Load Testing
- [ ] Test multiple concurrent payment requests
- [ ] Verify webhook handling under load
- [ ] Check database performance with many payments
- [ ] Test payment status checking performance

## Troubleshooting Common Issues

### Payment Initiation Fails
1. **Check KPay Credentials**: Verify username, password, and retailer ID
2. **Network Connectivity**: Ensure server can reach KPay API
3. **Phone Number Format**: Verify Rwanda phone number format
4. **Amount Validation**: Check amount is positive and reasonable

### Webhook Not Received
1. **URL Configuration**: Verify webhook URL is accessible
2. **IP Whitelisting**: Ensure your server IP is whitelisted with KPay
3. **HTTPS Requirements**: KPay may require HTTPS for webhooks
4. **Port Access**: Verify port 443 is accessible

### Payment Status Not Updating
1. **Database Permissions**: Check Supabase RLS policies
2. **Webhook Processing**: Verify webhook endpoint processes correctly
3. **Status Mapping**: Check KPay status codes mapping correctly

### UI Issues
1. **Missing Components**: Verify all payment components are imported
2. **TypeScript Errors**: Check type definitions match
3. **CSS Issues**: Verify Tailwind classes are available

## Production Deployment Checklist

### Before Going Live
- [ ] Update environment variables to production values
- [ ] Change `KPAY_ENVIRONMENT` to `live`
- [ ] Update `KPAY_WEBHOOK_URL` to production domain
- [ ] Set up HTTPS for webhook endpoint
- [ ] Test with real KPay production credentials
- [ ] Verify IP whitelisting with KPay
- [ ] Set up monitoring and alerting
- [ ] Document rollback procedures

### Post-Deployment
- [ ] Monitor payment success rates
- [ ] Check webhook processing logs
- [ ] Monitor error rates and response times
- [ ] Verify customer payment confirmations
- [ ] Set up regular payment reconciliation

## Support and Resources

### KPay Resources
- **API Documentation**: Refer to "Kpay API Guide September 2022.pdf"
- **Support Contact**: Contact KPay support for credential issues
- **Status Codes**: Reference the error codes table in the API guide

### Application Logs
Monitor application logs for:
- Payment initiation events
- Webhook processing
- Error conditions
- Performance metrics

### Database Monitoring
Check the `payments` table for:
- Payment status distribution
- Failed payment analysis
- Performance bottlenecks
- Data consistency

## Test Data

### Valid Test Phone Numbers
```
+250783123456
+250788123456
+250733123456
0783123456
0788123456
0733123456
```

### Invalid Test Phone Numbers
```
123456789 (too short)
+250123456789 (invalid prefix)
+251783123456 (wrong country code)
abc123456789 (contains letters)
```

### Test Amounts
```
100 RWF (minimum)
1000 RWF (typical)
10000 RWF (high value)
50000 RWF (very high value)
```

## Success Criteria

The KPay integration is considered successful when:

1. **All payment methods work correctly** in sandbox environment
2. **Orders are created and updated properly** based on payment status
3. **Webhooks are received and processed correctly**
4. **Error handling provides clear feedback** to users
5. **Performance meets acceptable standards** (< 5 seconds for payment initiation)
6. **Security requirements are met** (data protection, access control)
7. **User interface is responsive and accessible**
8. **Logging provides sufficient information** for troubleshooting

## Next Steps

After successful testing:

1. **Schedule production deployment**
2. **Set up monitoring and alerting**
3. **Train customer support team**
4. **Create user documentation**
5. **Plan phased rollout** if needed
6. **Set up payment reconciliation processes**

---

**Note**: Always test thoroughly in sandbox environment before deploying to production. Keep KPay credentials secure and never commit them to version control.