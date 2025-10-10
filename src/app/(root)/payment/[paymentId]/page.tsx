"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, CreditCard, Smartphone, AlertCircle } from 'lucide-react';
import { useKPayPayment } from '@/hooks/useKPayPayment';
import { toast } from 'sonner';

interface PaymentData {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  reference: string;
  kpay_transaction_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  checkout_url?: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkPaymentStatus, isCheckingStatus } = useKPayPayment();
  
  const paymentId = params.paymentId as string;
  const orderId = searchParams.get('orderId');
  
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Fetch payment data
  const fetchPaymentData = async () => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      const data = await response.json();
      setPayment(data);
      
      // If payment is already completed, mark as completed
      if (data.status === 'completed' || data.status === 'successful') {
        setPaymentCompleted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment');
    } finally {
      setLoading(false);
    }
  };

  // Check payment status periodically
  const checkStatus = async () => {
    if (!payment || paymentCompleted || statusCheckCount >= 30) return; // Stop after 30 checks (5 minutes)
    
    try {
      const statusResult = await checkPaymentStatus({
        paymentId: payment.id,
        transactionId: payment.kpay_transaction_id,
        reference: payment.reference,
      });

      if (statusResult.success) {
        if (statusResult.status === 'completed' || statusResult.status === 'successful') {
          setPaymentCompleted(true);
          setPayment(prev => prev ? { ...prev, status: statusResult.status } : null);
          toast.success('Payment completed successfully!');
          
          // Redirect to order details after a short delay
          setTimeout(() => {
            router.push(`/orders/${orderId || payment.order_id}?payment=success`);
          }, 2000);
        } else if (statusResult.status === 'failed' || statusResult.status === 'cancelled') {
          setPayment(prev => prev ? { ...prev, status: statusResult.status, failure_reason: statusResult.error } : null);
          
          // Show appropriate error message
          const errorMessage = statusResult.error || 'Payment failed or was cancelled';
          toast.error(errorMessage);
          
          // For card payments, provide specific guidance
          if (payment.payment_method === 'visa_card' || payment.payment_method === 'mastercard') {
            toast.error('Card payment failed. Please check your card details and try again.');
          }
        } else {
          // Update payment status but continue checking
          setPayment(prev => prev ? { ...prev, status: statusResult.status } : null);
        }
      } else if (statusResult.error) {
        // Handle status check errors
        console.error('Payment status check error:', statusResult.error);
        
        // For card payments that might be processed externally, be less aggressive with error messages
        if (payment.payment_method === 'visa_card' || payment.payment_method === 'mastercard') {
          // Don't show error immediately for card payments - they might still be processing
          if (statusCheckCount > 10) { // After 1.5+ minutes
            toast.info('Payment status check taking longer than usual. Please check with your bank or try refreshing.');
          }
        } else {
          toast.error('Unable to check payment status. Please refresh the page.');
        }
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
    }
    
    setStatusCheckCount(prev => prev + 1);
  };

  useEffect(() => {
    fetchPaymentData();
  }, [paymentId]);

  // Set up periodic status checking
  useEffect(() => {
    if (!payment || paymentCompleted || loading) return;

    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [payment, paymentCompleted, loading, statusCheckCount]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'successful':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'successful':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    if (method.includes('momo') || method.includes('mtn') || method.includes('airtel')) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  const getPaymentMethodName = (method: string) => {
    const names: Record<string, string> = {
      'mtn_momo': 'MTN Mobile Money',
      'airtel_money': 'Airtel Money',
      'visa_card': 'Visa Card',
      'mastercard': 'MasterCard',
      'spenn': 'SPENN',
    };
    return names[method] || method.toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading payment details...</span>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                Payment Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{error || 'Payment not found'}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Payment Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                {getStatusIcon(payment.status)}
                <span className="ml-2">Payment Processing</span>
              </CardTitle>
              <Badge className={getStatusColor(payment.status)}>
                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </Badge>
            </div>
            <CardDescription>
              {paymentCompleted ? (
                "Your payment has been processed successfully!"
              ) : payment.status === 'pending' ? (
                "We're processing your payment. Please wait..."
              ) : payment.status === 'failed' ? (
                "Your payment could not be processed. Please try again."
              ) : (
                "Processing your payment..."
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Payment Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Amount</span>
              <span className="font-semibold">
                {payment.amount.toLocaleString()} {payment.currency}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Payment Method</span>
              <div className="flex items-center">
                {getPaymentMethodIcon(payment.payment_method)}
                <span className="ml-2 font-medium">
                  {getPaymentMethodName(payment.payment_method)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reference</span>
              <span className="font-mono text-sm">{payment.reference}</span>
            </div>
            
            {payment.kpay_transaction_id && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Transaction ID</span>
                <span className="font-mono text-sm">{payment.kpay_transaction_id}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customer</span>
              <span className="text-sm">{payment.customer_name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Phone</span>
              <span className="text-sm">{payment.customer_phone}</span>
            </div>
            
            {payment.failure_reason && payment.status === 'failed' && (
              <div className="pt-2 border-t border-red-200">
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 text-sm font-medium">Payment Failed</span>
                  </div>
                  <span className="text-red-700 text-xs">
                    {payment.failure_reason}
                  </span>
                  <div className="mt-2 text-red-600 text-xs">
                    Please try again or use a different payment method.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card - only show for pending payments */}
        {payment.status === 'pending' && !paymentCompleted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Payment Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {payment.payment_method.includes('momo') || payment.payment_method.includes('mtn') || payment.payment_method.includes('airtel') ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    1. You should receive an SMS prompt on your mobile phone ({payment.customer_phone})
                  </p>
                  <p className="text-sm">
                    2. Enter your Mobile Money PIN to confirm the payment
                  </p>
                  <p className="text-sm">
                    3. Wait for confirmation - this page will update automatically
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> Keep this page open. We'll automatically detect when your payment is complete.
                    </p>
                  </div>
                </div>
              ) : payment.payment_method.includes('card') || payment.payment_method === 'visa_card' || payment.payment_method === 'mastercard' ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    1. You will be redirected to a secure payment gateway to enter your card details
                  </p>
                  <p className="text-sm">
                    2. Complete the payment using your {payment.payment_method === 'visa_card' ? 'Visa' : 'MasterCard'} card
                  </p>
                  <p className="text-sm">
                    3. Return to this page to see your payment confirmation
                  </p>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>Secure Payment:</strong> All card transactions are processed through encrypted, secure channels.
                    </p>
                  </div>
                  {/* Add redirect button if checkout URL is available */}
                  <div className="mt-4 pt-2 border-t">
                    <p className="text-sm text-gray-600 mb-2">Having trouble with automatic redirect?</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Try Payment Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">
                    1. Complete the payment process through the secure payment gateway
                  </p>
                  <p className="text-sm">
                    2. Follow the instructions provided by your payment provider
                  </p>
                  <p className="text-sm">
                    3. Return to this page to see your payment status
                  </p>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Note:</strong> This page will automatically update when payment is confirmed.
                    </p>
                  </div>
                </div>
              )}
              
              {isCheckingStatus && (
                <div className="mt-4 flex items-center text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking payment status...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/orders/${orderId || payment.order_id}`)}
            className="flex-1 min-w-0"
          >
            View Order Details
          </Button>
          
          {payment.status === 'failed' && (
            <>
              <Button 
                onClick={() => router.push(`/checkout`)}
                className="flex-1 min-w-0 bg-orange-600 hover:bg-orange-700"
              >
                Try Different Payment Method
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1 min-w-0"
              >
                Retry This Payment
              </Button>
            </>
          )}
          
          {payment.status === 'pending' && payment.payment_method !== 'mtn_momo' && payment.payment_method !== 'airtel_money' && (
            <Button 
              onClick={() => {
                // For card payments, try to redirect to checkout URL if available
                if (payment.checkout_url) {
                  window.open(payment.checkout_url, '_blank', 'noopener,noreferrer');
                } else {
                  window.location.reload();
                }
              }}
              className="flex-1 min-w-0 bg-blue-600 hover:bg-blue-700"
            >
              Open Payment Gateway
            </Button>
          )}
          
          {paymentCompleted && (
            <Button 
              onClick={() => router.push(`/orders/${orderId || payment.order_id}?payment=success`)}
              className="flex-1 min-w-0 bg-green-600 hover:bg-green-700"
            >
              Continue to Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}