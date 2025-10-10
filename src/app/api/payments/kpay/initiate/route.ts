import { NextRequest, NextResponse } from 'next/server';
import { initializeKPayService, KPayService, PAYMENT_METHODS } from '@/lib/services/kpay';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface PaymentInitiationRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: keyof typeof PAYMENT_METHODS;
  redirectUrl: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let orderId: string | undefined;
  
  try {
    const body: PaymentInitiationRequest = await request.json();
    orderId = body.orderId;
    
    logger.info('api', 'KPay payment initiation request received', {
      orderId: body.orderId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      customerEmail: body.customerEmail
    });

    // Validate required fields
    if (!body.orderId || !body.amount || !body.customerName || !body.customerEmail || !body.customerPhone || !body.paymentMethod) {
      logger.warn('api', 'KPay payment initiation failed - missing required fields', {
        orderId: body.orderId,
        missingFields: {
          orderId: !body.orderId,
          amount: !body.amount,
          customerName: !body.customerName,
          customerEmail: !body.customerEmail,
          customerPhone: !body.customerPhone,
          paymentMethod: !body.paymentMethod
        }
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!PAYMENT_METHODS[body.paymentMethod]) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate amount (must be positive)
    if (body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // Verify the order exists and get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, customer_name, customer_email, customer_phone')
      .eq('id', body.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order status (should be pending)
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order cannot be paid - invalid status' },
        { status: 400 }
      );
    }

    // Verify amount matches order total
    if (Math.abs(body.amount - order.total_amount) > 0.01) {
      return NextResponse.json(
        { error: 'Amount mismatch with order total' },
        { status: 400 }
      );
    }

    // Initialize KPay service
    let kpayService: KPayService;
    try {
      kpayService = initializeKPayService();
    } catch (error) {
      console.error('KPay service initialization failed:', error);
      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: 503 }
      );
    }

    // Generate unique order reference
    const orderReference = KPayService.generateOrderReference();

    // Format phone number for KPay
    const formattedPhone = KPayService.formatPhoneNumber(body.customerPhone);

    // Create payment record in database before initiating payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: body.orderId,
        amount: body.amount,
        currency: 'RWF',
        payment_method: body.paymentMethod,
        status: 'pending',
        reference: orderReference,
        customer_name: body.customerName,
        customer_email: body.customerEmail,
        customer_phone: formattedPhone,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Failed to create payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    try {
      // Initiate payment with KPay
      const kpayResponse = await kpayService.initiatePayment({
        amount: body.amount,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: formattedPhone,
        customerNumber: order.customer_phone || formattedPhone,
        paymentMethod: body.paymentMethod,
        orderReference,
        orderDetails: `Order #${body.orderId} from Nihemart`,
        redirectUrl: body.redirectUrl,
        logoUrl: `${request.nextUrl.origin}/logo.png`,
      });

      // Update payment record with KPay transaction details
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          kpay_transaction_id: kpayResponse.tid,
          kpay_auth_key: kpayResponse.authkey,
          kpay_return_code: kpayResponse.retcode,
          kpay_response: kpayResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Failed to update payment record:', updateError);
        // Continue anyway, as the payment was initiated successfully
      }

      // Check if payment was successful immediately (some payments are processed instantly)
      if (kpayResponse.retcode === 0) {
        // Payment initiated successfully
        return NextResponse.json({
          success: true,
          paymentId: payment.id,
          transactionId: kpayResponse.tid,
          reference: orderReference,
          checkoutUrl: kpayResponse.url,
          status: 'pending',
          message: 'Payment initiated successfully',
        });
      } else {
        // Payment failed to initiate
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: kpayService.getErrorMessage(kpayResponse.retcode),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        return NextResponse.json({
          success: false,
          error: kpayService.getErrorMessage(kpayResponse.retcode),
        }, { status: 400 });
      }

    } catch (kpayError) {
      console.error('KPay payment initiation failed:', kpayError);

      // Update payment record to failed status
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: kpayError instanceof Error ? kpayError.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: 'Failed to initiate payment with KPay' },
        { status: 500 }
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('api', 'KPay payment initiation failed with unexpected error', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}