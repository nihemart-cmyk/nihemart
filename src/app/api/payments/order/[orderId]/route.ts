import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orderId } = await params;

  try {
    logger.info('api', 'Payment list request received', { orderId });

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Fetch all payments for this order
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      logger.error('api', 'Failed to fetch payments', { orderId, error: paymentsError.message });
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    logger.info('api', 'Payments retrieved successfully', { 
      orderId,
      paymentCount: payments?.length || 0
    });

    return NextResponse.json(payments || []);

  } catch (error) {
    logger.error('api', 'Failed to retrieve payments for order', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}