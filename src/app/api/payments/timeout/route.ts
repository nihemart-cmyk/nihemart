import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

interface RouteParams {
  paymentId: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RouteParams = await request.json();
    const { paymentId, reason } = body;

    logger.info('api', 'Payment timeout request received', { paymentId, reason });

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, order_id, status')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      logger.warn('api', 'Payment not found for timeout', { paymentId, error: paymentError?.message });
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Only update if payment is still pending (don't override completed/failed statuses)
    if (payment.status === 'pending') {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          client_timeout: true,
          client_timeout_reason: reason || 'Client-side timeout after 2 minutes',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (updateError) {
        logger.error('api', 'Failed to update payment timeout flag', { paymentId, error: updateError.message });
        return NextResponse.json(
          { error: 'Failed to update payment timeout' },
          { status: 500 }
        );
      }

      logger.info('api', 'Payment marked with client timeout flag', { 
        paymentId, 
        orderId: payment.order_id,
        reason 
      });

      // Note: We intentionally do NOT change the order status here
      // This allows customers to retry payment on the same order
      return NextResponse.json({
        success: true,
        message: 'Payment timeout recorded. Order remains available for retry.'
      });
    } else {
      logger.info('api', 'Payment timeout ignored - payment no longer pending', { 
        paymentId, 
        status: payment.status 
      });
      
      return NextResponse.json({
        success: true,
        message: `Payment status is ${payment.status}, timeout ignored.`
      });
    }

  } catch (error) {
    logger.error('api', 'Payment timeout handling failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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