import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    paymentId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { paymentId } = await params;

  try {
    logger.info('api', 'Payment details request received', { paymentId });

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      logger.warn('api', 'Payment not found', { paymentId, error: paymentError?.message });
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    logger.info('api', 'Payment details retrieved successfully', { 
      paymentId,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount 
    });

    return NextResponse.json(payment);

  } catch (error) {
    logger.error('api', 'Failed to retrieve payment details', {
      paymentId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}