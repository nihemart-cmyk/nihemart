"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
   Loader2,
   CheckCircle,
   XCircle,
   Clock,
   CreditCard,
   Smartphone,
   AlertCircle,
   ArrowLeft,
   RefreshCw,
   ExternalLink,
} from "lucide-react";
import { useKPayPayment } from "@/hooks/useKPayPayment";
import { toast } from "sonner";
import Image from "next/image";
import logo from "@/assets/logo.png";

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
   failure_reason?: string;
}

export default function PaymentPage() {
   const params = useParams();
   const router = useRouter();
   const searchParams = useSearchParams();
   const { checkPaymentStatus, isCheckingStatus } = useKPayPayment();

   const paymentId = params?.paymentId as string;
   const orderId = searchParams?.get("orderId");

   const [payment, setPayment] = useState<PaymentData | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [statusCheckCount, setStatusCheckCount] = useState(0);
   const [paymentCompleted, setPaymentCompleted] = useState(false);
   const [stoppedPolling, setStoppedPolling] = useState(false);
   const timeoutReportedRef = useRef(false);

   // Fetch payment data
   const fetchPaymentData = async () => {
      try {
         const response = await fetch(`/api/payments/${paymentId}`);
         if (!response.ok) {
            throw new Error("Failed to fetch payment data");
         }
         const data = await response.json();
         setPayment(data);

         if (data.status === "completed" || data.status === "successful") {
            setPaymentCompleted(true);
         }
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Failed to load payment"
         );
      } finally {
         setLoading(false);
      }
   };

   // Check payment status periodically with exponential backoff and cap
   const checkStatus = async () => {
      if (!payment || paymentCompleted || loading) return;
      if (stoppedPolling) return;
      if (timeoutReportedRef.current) return;

      // stop polling for terminal statuses
      if (
         payment.status === "timeout" ||
         payment.status === "failed" ||
         payment.status === "cancelled"
      ) {
         setStoppedPolling(true);
         return;
      }

      // Maximum total checks to consider this a client-side timeout (2 minutes)
      const maxStatusChecks = 12;

      try {
         const statusResult = await checkPaymentStatus({
            paymentId: payment.id,
            transactionId: payment.kpay_transaction_id,
            reference: payment.reference,
         });

         if (statusResult.success) {
            // Normalize statuses
            const s = statusResult.status;
            if (s === "completed" || s === "successful") {
               // If payment is successful, attempt to mark the order as paid on the server
               try {
                  // best-effort: call the update-status endpoint to mark the order as paid
                  await fetch("/api/orders/update-status", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                        id: orderId || payment.order_id,
                        status: "paid",
                        additionalFields: {
                           payment_reference: payment.reference,
                           kpay_transaction_id: payment.kpay_transaction_id,
                           payment_amount: payment.amount,
                        },
                     }),
                  });
               } catch (err) {
                  console.warn(
                     "Failed to notify server about payment success:",
                     err
                  );
               }

               setPaymentCompleted(true);
               setPayment((prev) => (prev ? { ...prev, status: s } : null));
               toast.success("Payment completed successfully!");

               setTimeout(() => {
                  router.push(
                     `/orders/${orderId || payment.order_id}?payment=success`
                  );
               }, 1500);
               return;
            }
            if (s === "failed" || s === "cancelled") {
               setPayment((prev) =>
                  prev
                     ? {
                          ...prev,
                          status: s,
                          failure_reason: statusResult.error,
                       }
                     : null
               );

               const errorMessage =
                  statusResult.error || "Payment failed or was cancelled";
               toast.error(errorMessage, { duration: 5000 });

               if (
                  payment.payment_method === "visa_card" ||
                  payment.payment_method === "mastercard"
               ) {
                  toast.error(
                     "Card payment failed. Please check your card details and try again."
                  );
               }

               return;
            }

            // Update intermediate/pending status
            setPayment((prev) => (prev ? { ...prev, status: s } : null));
         } else if (statusResult.error) {
            console.error("Payment status check error:", statusResult.error);
            // Inform user if checks are taking long
            if (statusCheckCount >= 6) {
               toast.info(
                  "Payment is taking longer than usual. We'll keep checking for a bit longer...",
                  { duration: 4000 }
               );
            }
         }
      } catch (err) {
         console.error("Failed to check payment status:", err);
         if (statusCheckCount >= 6) {
            toast.error(
               "Having trouble checking payment status. Please refresh the page or try a different payment method.",
               { duration: 5000 }
            );
         }
      }

      // increment and check for timeout
      setStatusCheckCount((prev) => {
         const next = prev + 1;
         if (next >= maxStatusChecks && !timeoutReportedRef.current) {
            // mark timeout for UX and ask server for final status (in case webhook already arrived)
            timeoutReportedRef.current = true;
            (async () => {
               try {
                  const resp = await fetch("/api/payments/timeout", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                        paymentId: payment.id,
                        reason: "Client-side timeout after polling",
                     }),
                  });

                  const data = await resp.json();

                  // If server already marked payment completed, treat it as success
                  if (
                     data?.status &&
                     (data.status === "completed" ||
                        data.status === "successful")
                  ) {
                     setPaymentCompleted(true);
                     setPayment((prev) =>
                        prev ? { ...prev, status: data.status } : null
                     );
                     toast.success("Payment completed successfully!");
                     setTimeout(() => {
                        router.push(
                           `/orders/${
                              orderId || payment.order_id
                           }?payment=success`
                        );
                     }, 1200);
                     setStoppedPolling(true);
                     return;
                  }

                  // Otherwise, show the timeout message once
                  setPayment((prev) =>
                     prev
                        ? {
                             ...prev,
                             status: "timeout",
                             failure_reason:
                                "Payment took too long to process. You can try again or use a different payment method.",
                          }
                        : null
                  );

                  toast.error(
                     "Payment took too long to process. You can try again or use a different payment method.",
                     { duration: 6000 }
                  );
                  setStoppedPolling(true);
               } catch (e) {
                  console.error("Failed to record timeout:", e);
                  // fallback UX if timeout recording fails
                  setPayment((prev) =>
                     prev
                        ? {
                             ...prev,
                             status: "timeout",
                             failure_reason:
                                "Payment took too long to process. You can try again or use a different payment method.",
                          }
                        : null
                  );
                  toast.error(
                     "Payment took too long to process. You can try again or use a different payment method.",
                     { duration: 6000 }
                  );
                  setStoppedPolling(true);
               }
            })();
         }

         return next;
      });
   };

   useEffect(() => {
      fetchPaymentData();
   }, [paymentId]);

   useEffect(() => {
      if (!payment || paymentCompleted || loading || stoppedPolling) return;

      // Run an immediate check once, then poll every 10s
      checkStatus();

      const interval = setInterval(checkStatus, 10000);
      return () => clearInterval(interval);
      // note: intentionally not including statusCheckCount to avoid recreating the interval on every poll
   }, [payment, paymentCompleted, loading, stoppedPolling]);

   const getStatusIcon = (status: string) => {
      switch (status) {
         case "completed":
         case "successful":
            return <CheckCircle className="h-12 w-12 text-green-500" />;
         case "failed":
         case "cancelled":
         case "timeout":
            return <XCircle className="h-12 w-12 text-red-500" />;
         case "pending":
            return (
               <Clock className="h-12 w-12 text-orange-500 animate-pulse" />
            );
         default:
            return <AlertCircle className="h-12 w-12 text-gray-500" />;
      }
   };

   const getStatusColor = (status: string) => {
      switch (status) {
         case "completed":
         case "successful":
            return "bg-green-50 text-green-700 border-green-200";
         case "failed":
         case "cancelled":
         case "timeout":
            return "bg-red-50 text-red-700 border-red-200";
         case "pending":
            return "bg-orange-50 text-orange-700 border-orange-200";
         default:
            return "bg-gray-50 text-gray-700 border-gray-200";
      }
   };

   const getPaymentMethodIcon = (method: string) => {
      if (
         method.includes("momo") ||
         method.includes("mtn") ||
         method.includes("airtel")
      ) {
         return <Smartphone className="h-5 w-5" />;
      }
      return <CreditCard className="h-5 w-5" />;
   };

   const getPaymentMethodName = (method: string) => {
      const names: Record<string, string> = {
         mtn_momo: "MTN Mobile Money",
         airtel_money: "Airtel Money",
         visa_card: "Visa Card",
         mastercard: "MasterCard",
         spenn: "SPENN",
      };
      return names[method] || method.toUpperCase();
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
            <div className="container mx-auto py-8 px-4">
               <div className="max-w-2xl mx-auto">
                  <Card className="border-0 shadow-xl">
                     <CardContent className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                        <span className="text-gray-600 font-medium">
                           Loading payment details...
                        </span>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </div>
      );
   }

   if (error || !payment) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
            <div className="container mx-auto py-8 px-4">
               <div className="max-w-2xl mx-auto">
                  <Card className="border-0 shadow-xl">
                     <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-4">
                           <XCircle className="h-16 w-16 text-red-500" />
                        </div>
                        <CardTitle className="text-2xl text-red-600">
                           Payment Error
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="text-center">
                        <p className="mb-6 text-gray-600">
                           {error || "Payment not found"}
                        </p>
                        <Button
                           onClick={() => router.back()}
                           className="bg-blue-500 hover:bg-blue-600"
                        >
                           <ArrowLeft className="h-4 w-4 mr-2" />
                           Go Back
                        </Button>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
         {/* Header with Logo */}
         <div className="bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
               <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <Image
                     src={logo}
                     alt="Logo"
                     className="h-8 sm:h-10 w-auto"
                     priority
                  />
                  <Badge
                     variant="outline"
                     className="text-xs sm:text-sm font-medium"
                  >
                     Payment #{payment.reference.slice(-8)}
                  </Badge>
               </div>
            </div>
         </div>

         <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
               {/* Left Column - Main Status & Details */}
               <div className="space-y-4 sm:space-y-6">
                  {/* Main Status Card */}
                  <Card className="border-0 shadow-xl overflow-hidden">
                     <div
                        className={`${getStatusColor(
                           payment.status
                        )} border-b py-6 sm:py-8`}
                     >
                        <div className="flex flex-col items-center text-center px-4 sm:px-6">
                           {getStatusIcon(payment.status)}
                           <h1 className="text-xl sm:text-2xl font-bold mt-3 sm:mt-4 mb-2">
                              {paymentCompleted
                                 ? "Payment Successful!"
                                 : payment.status === "pending"
                                 ? "Processing Payment"
                                 : payment.status === "failed"
                                 ? "Payment Failed"
                                 : payment.status === "timeout"
                                 ? "Payment Timeout"
                                 : "Payment Status"}
                           </h1>
                           <p className="text-xs sm:text-sm opacity-80 max-w-md px-2">
                              {paymentCompleted
                                 ? "Your payment has been processed successfully! You'll be redirected shortly."
                                 : payment.status === "pending"
                                 ? "We're securely processing your payment. Please wait a moment..."
                                 : payment.status === "failed"
                                 ? "We couldn't process your payment. Please try again or use a different method."
                                 : payment.status === "timeout"
                                 ? "Payment took too long to process. You can try again or use a different payment method."
                                 : "Checking your payment status..."}
                           </p>
                        </div>
                     </div>

                     {/* Amount Display */}
                     <div className="bg-gradient-to-r from-blue-500 to-orange-500 text-white py-4 sm:py-6">
                        <div className="text-center">
                           <p className="text-xs sm:text-sm opacity-90 mb-1">
                              Amount
                           </p>
                           <p className="text-3xl sm:text-4xl font-bold">
                              {payment.amount.toLocaleString()}{" "}
                              <span className="text-xl sm:text-2xl">
                                 {payment.currency}
                              </span>
                           </p>
                        </div>
                     </div>

                     {/* Payment Details */}
                     <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                           <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                              <span className="text-xs sm:text-sm text-gray-600 flex items-center flex-shrink-0">
                                 {getPaymentMethodIcon(payment.payment_method)}
                                 <span className="ml-2">Payment Method</span>
                              </span>
                              <span className="font-semibold text-gray-800 text-xs sm:text-sm text-right">
                                 {getPaymentMethodName(payment.payment_method)}
                              </span>
                           </div>

                           <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                              <span className="text-xs sm:text-sm text-gray-600">
                                 Status
                              </span>
                              <Badge
                                 className={`${getStatusColor(
                                    payment.status
                                 )} text-xs`}
                              >
                                 {payment.status.charAt(0).toUpperCase() +
                                    payment.status.slice(1)}
                              </Badge>
                           </div>

                           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                                 Reference
                              </span>
                              <span className="font-mono text-xs sm:text-sm font-semibold break-all">
                                 {payment.reference}
                              </span>
                           </div>

                           {payment.kpay_transaction_id && (
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                                 <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                                    Transaction ID
                                 </span>
                                 <span className="font-mono text-xs text-gray-700 break-all">
                                    {payment.kpay_transaction_id}
                                 </span>
                              </div>
                           )}

                           <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                              <span className="text-xs sm:text-sm text-gray-600">
                                 Customer
                              </span>
                              <span className="text-xs sm:text-sm font-medium text-right break-words max-w-[60%]">
                                 {payment.customer_name}
                              </span>
                           </div>

                           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                              <span className="text-xs sm:text-sm text-gray-600">
                                 Phone
                              </span>
                              <span className="text-xs sm:text-sm font-medium break-all">
                                 {payment.customer_phone}
                              </span>
                           </div>
                        </div>

                        {/* Failure Reason */}
                        {payment.failure_reason &&
                           (payment.status === "failed" ||
                              payment.status === "timeout") && (
                              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                                 <div className="flex items-start gap-2 sm:gap-3">
                                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                       <p className="text-xs sm:text-sm font-semibold text-red-800 mb-1">
                                          {payment.status === "timeout"
                                             ? "Payment Timeout"
                                             : "Payment Failed"}
                                       </p>
                                       <p className="text-xs sm:text-sm text-red-700">
                                          {payment.failure_reason}
                                       </p>
                                       <p className="text-xs text-red-600 mt-2">
                                          {payment.status === "timeout"
                                             ? "Your order is still pending. You can try the same payment method again or use a different one."
                                             : "Please try again or contact support if the issue persists."}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           )}
                     </CardContent>
                  </Card>
               </div>

               {/* Right Column - Instructions & Actions */}
               <div className="space-y-4 sm:space-y-6">
                  {/* Instructions Card */}
                  {payment.status === "pending" && !paymentCompleted && (
                     <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-orange-50 p-4 sm:p-6">
                           <CardTitle className="text-base sm:text-lg flex items-center text-blue-700">
                              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                              Payment Instructions
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                           {payment.payment_method.includes("momo") ||
                           payment.payment_method.includes("mtn") ||
                           payment.payment_method.includes("airtel") ? (
                              <div className="space-y-3 sm:space-y-4">
                                 <div className="flex items-start">
                                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                                       1
                                    </div>
                                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                                       Check your mobile phone{" "}
                                       <span className="font-medium break-all">
                                          ({payment.customer_phone})
                                       </span>{" "}
                                       for an SMS prompt
                                    </p>
                                 </div>
                                 <div className="flex items-start">
                                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                                       2
                                    </div>
                                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                                       Enter your Mobile Money PIN to authorize
                                       the payment
                                    </p>
                                 </div>
                                 <div className="flex items-start">
                                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                                       3
                                    </div>
                                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                                       Wait for confirmation - this page will
                                       update automatically
                                    </p>
                                 </div>
                                 <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs sm:text-sm text-blue-800">
                                       <strong>💡 Tip:</strong> Keep this page
                                       open. We&apos;ll automatically detect
                                       when your payment is complete.
                                    </p>
                                 </div>
                              </div>
                           ) : payment.payment_method.includes("card") ||
                             payment.payment_method === "visa_card" ||
                             payment.payment_method === "mastercard" ? (
                              <div className="space-y-3 sm:space-y-4">
                                 <div className="flex items-start">
                                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                                       1
                                    </div>
                                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                                       You&apos;ll be redirected to a secure
                                       payment gateway
                                    </p>
                                 </div>
                                 <div className="flex items-start">
                                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                                       2
                                    </div>
                                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                                       Enter your card details securely
                                    </p>
                                 </div>
                                 <div className="flex items-start">
                                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                                       3
                                    </div>
                                    <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                                       Return here to see your payment
                                       confirmation
                                    </p>
                                 </div>
                                 <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-xs sm:text-sm text-green-800">
                                       <strong>🔒 Secure:</strong> All card
                                       transactions are encrypted and
                                       PCI-compliant.
                                    </p>
                                 </div>
                                 <Button
                                    onClick={() => window.location.reload()}
                                    variant="outline"
                                    className="w-full mt-3 sm:mt-4 border-green-300 text-green-700 hover:bg-green-50 text-xs sm:text-sm h-9 sm:h-10"
                                 >
                                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    Refresh Payment Status
                                 </Button>
                              </div>
                           ) : (
                              <div className="space-y-3">
                                 <p className="text-xs sm:text-sm text-gray-700">
                                    Follow the instructions provided by your
                                    payment provider to complete the
                                    transaction.
                                 </p>
                                 <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs sm:text-sm text-gray-700">
                                       <strong>Note:</strong> This page will
                                       automatically update when payment is
                                       confirmed.
                                    </p>
                                 </div>
                              </div>
                           )}

                           {isCheckingStatus && (
                              <div className="mt-3 sm:mt-4 flex items-center justify-center text-xs sm:text-sm text-gray-600 p-3 bg-white rounded-lg border">
                                 <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                 Checking payment status...
                              </div>
                           )}
                        </CardContent>
                     </Card>
                  )}

                  {/* Action Buttons */}
                  <Card className="border-0 shadow-lg">
                     <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                           <Button
                              variant="outline"
                              onClick={() =>
                                 router.push(
                                    `/orders/${orderId || payment.order_id}`
                                 )
                              }
                              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm h-9 sm:h-11"
                           >
                              View Order Details
                           </Button>

                           {(payment.status === "failed" ||
                              payment.status === "timeout") && (
                              <>
                                 <Button
                                    onClick={() =>
                                       router.push(
                                          `/checkout?orderId=${
                                             orderId || payment.order_id
                                          }&retry=true${
                                             payment.status === "timeout"
                                                ? "&timedout=true"
                                                : ""
                                          }`
                                       )
                                    }
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-9 sm:h-11"
                                 >
                                    Try Different Method
                                 </Button>
                                 <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    className="w-full border-gray-300 text-xs sm:text-sm h-9 sm:h-11"
                                 >
                                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    {payment.status === "timeout"
                                       ? "Try Again"
                                       : "Retry Payment"}
                                 </Button>
                              </>
                           )}

                           {payment.status === "pending" &&
                              payment.payment_method !== "mtn_momo" &&
                              payment.payment_method !== "airtel_money" && (
                                 <Button
                                    onClick={() => {
                                       if (payment.checkout_url) {
                                          window.open(
                                             payment.checkout_url,
                                             "_blank",
                                             "noopener,noreferrer"
                                          );
                                       } else {
                                          window.location.reload();
                                       }
                                    }}
                                    disabled={isCheckingStatus}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-xs sm:text-sm h-9 sm:h-11"
                                 >
                                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    Open Payment Gateway
                                 </Button>
                              )}

                           {paymentCompleted && (
                              <Button
                                 onClick={() =>
                                    router.push(
                                       `/orders/${
                                          orderId || payment.order_id
                                       }?payment=success`
                                    )
                                 }
                                 className="w-full bg-green-500 hover:bg-green-600 text-xs sm:text-sm h-9 sm:h-11"
                              >
                                 <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                 Continue to Order
                              </Button>
                           )}
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </div>
      </div>
   );
}
