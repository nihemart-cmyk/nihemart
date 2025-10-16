import { NextRequest, NextResponse } from "next/server";
import {
   initializeKPayService,
   KPayService,
   PAYMENT_METHODS,
} from "@/lib/services/kpay";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

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

      logger.info("api", "KPay payment initiation request received", {
         orderId: body.orderId,
         amount: body.amount,
         paymentMethod: body.paymentMethod,
         customerEmail: body.customerEmail,
      });

      // Validate required fields
      if (
         !body.orderId ||
         !body.amount ||
         !body.customerName ||
         !body.customerEmail ||
         !body.customerPhone ||
         !body.paymentMethod
      ) {
         logger.warn(
            "api",
            "KPay payment initiation failed - missing required fields",
            {
               orderId: body.orderId,
               missingFields: {
                  orderId: !body.orderId,
                  amount: !body.amount,
                  customerName: !body.customerName,
                  customerEmail: !body.customerEmail,
                  customerPhone: !body.customerPhone,
                  paymentMethod: !body.paymentMethod,
               },
            }
         );
         return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
         );
      }

      // Validate payment method
      if (!PAYMENT_METHODS[body.paymentMethod]) {
         return NextResponse.json(
            { error: "Invalid payment method" },
            { status: 400 }
         );
      }

      // Validate amount (must be positive)
      if (body.amount <= 0) {
         return NextResponse.json(
            { error: "Amount must be greater than 0" },
            { status: 400 }
         );
      }

      // Initialize Supabase client
      const supabase = await createServerSupabaseClient();

      // Verify the order exists with retry logic for database consistency
      let order: any = null;
      let orderError: any = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !order) {
         attempts++;

         if (attempts > 1) {
            // Wait longer between retries
            await new Promise((resolve) => setTimeout(resolve, 200 * attempts));
            logger.info("api", `Order verification retry attempt ${attempts}`, {
               orderId: body.orderId,
            });
         }

         const result = await supabase
            .from("orders")
            .select(
               "id, total, status, customer_first_name, customer_last_name, customer_email, customer_phone"
            )
            .eq("id", body.orderId)
            .single();

         order = result.data;
         orderError = result.error;

         if (order) {
            logger.info("api", `Order found on attempt ${attempts}`, {
               orderId: body.orderId,
               orderData: {
                  id: order.id,
                  status: order.status,
                  total: order.total,
                  customer_email: order.customer_email,
               },
            });
            break;
         }
      }

      logger.info("api", "Final order verification result", {
         orderId: body.orderId,
         attempts,
         found: !!order,
         error: orderError?.message,
      });

      if (orderError || !order) {
         return NextResponse.json(
            { error: "Order not found" },
            { status: 404 }
         );
      }

      // Verify order status (should be pending)
      if (order.status !== "pending") {
         return NextResponse.json(
            { error: "Order cannot be paid - invalid status" },
            { status: 400 }
         );
      }

      // Verify amount matches order total
      if (Math.abs(body.amount - order.total) > 0.01) {
         return NextResponse.json(
            { error: "Amount mismatch with order total" },
            { status: 400 }
         );
      }

      // Ensure the order is not already paid via another successful payment
      // and prevent creating a new payment while a pending payment is still active
      const { data: latestPayment, error: latestPaymentErr } = await supabase
         .from("payments")
         .select("id, status, client_timeout, created_at")
         .eq("order_id", body.orderId)
         .order("created_at", { ascending: false })
         .limit(1)
         .single();

      if (latestPaymentErr && latestPaymentErr.code !== "PGRST116") {
         // ignore "no rows" style errors but log others
         logger.warn("api", "Failed to fetch latest payment for order", {
            orderId: body.orderId,
            error: latestPaymentErr?.message,
         });
      }

      if (latestPayment) {
         // If the last payment completed successfully, do not allow creating another payment
         if (
            latestPayment.status === "completed" ||
            latestPayment.status === "successful"
         ) {
            return NextResponse.json(
               { error: "Order already paid" },
               { status: 400 }
            );
         }

         // If a pending payment exists and the client hasn't reported a timeout yet,
         // block creating a new payment to avoid duplicate in-flight payments.
         if (
            latestPayment.status === "pending" &&
            !latestPayment.client_timeout
         ) {
            return NextResponse.json(
               {
                  error: "A payment is already in progress for this order. Please wait for it to complete or try again after it times out.",
               },
               { status: 409 }
            );
         }
      }

      // Initialize KPay service
      let kpayService: KPayService;
      try {
         kpayService = initializeKPayService();
      } catch (error) {
         console.error("KPay service initialization failed:", error);
         return NextResponse.json(
            { error: "Payment service unavailable" },
            { status: 503 }
         );
      }

      // Generate unique order reference
      const orderReference = KPayService.generateOrderReference();

      // Format phone number for KPay
      const formattedPhone = KPayService.formatPhoneNumber(body.customerPhone);

      logger.info("api", "Phone number formatting for KPay", {
         orderId: body.orderId,
         originalPhone: body.customerPhone,
         formattedPhone,
         paymentMethod: body.paymentMethod,
      });

      // Create payment record in database before initiating payment
      const { data: payment, error: paymentError } = await supabase
         .from("payments")
         .insert({
            order_id: body.orderId,
            amount: body.amount,
            currency: "RWF",
            payment_method: body.paymentMethod,
            status: "pending",
            reference: orderReference,
            customer_name: body.customerName,
            customer_email: body.customerEmail,
            customer_phone: formattedPhone,
            created_at: new Date().toISOString(),
         })
         .select()
         .single();

      if (paymentError || !payment) {
         console.error("Failed to create payment record:", paymentError);
         return NextResponse.json(
            { error: "Failed to create payment record" },
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
            .from("payments")
            .update({
               kpay_transaction_id: kpayResponse.tid,
               kpay_auth_key: kpayResponse.authkey,
               kpay_return_code: kpayResponse.retcode,
               kpay_response: kpayResponse,
               updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

         if (updateError) {
            console.error("Failed to update payment record:", updateError);
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
               status: "pending",
               message: "Payment initiated successfully",
            });
         } else {
            // Payment failed to initiate
            const errorMessage = kpayService.getErrorMessage(
               kpayResponse.retcode
            );

            await supabase
               .from("payments")
               .update({
                  status: "failed",
                  failure_reason: errorMessage,
                  kpay_return_code: kpayResponse.retcode,
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.id);

            // Provide more user-friendly error messages
            let userFriendlyError = errorMessage;
            if (kpayResponse.retcode === 609) {
               userFriendlyError =
                  "This payment method is currently not supported. Please try a different payment method.";
            } else if (kpayResponse.retcode === 607) {
               userFriendlyError =
                  "Mobile money transaction failed. Please check your account balance and try again.";
            } else if (kpayResponse.retcode === 608) {
               userFriendlyError =
                  "This payment reference has already been used. Please try again.";
            } else if (kpayResponse.retcode >= 600) {
               userFriendlyError =
                  "Payment gateway error. Please try again or contact support if the problem persists.";
            }

            return NextResponse.json(
               {
                  success: false,
                  error: userFriendlyError,
                  errorCode: kpayResponse.retcode,
                  technicalError: errorMessage,
               },
               { status: 400 }
            );
         }
      } catch (kpayError) {
         // Log detailed error for diagnostics (do NOT log credentials)
         console.error("KPay payment initiation failed:", {
            message:
               kpayError instanceof Error
                  ? kpayError.message
                  : String(kpayError),
            stack: kpayError instanceof Error ? kpayError.stack : undefined,
         });

         // Update payment record to failed status with available failure reason
         await supabase
            .from("payments")
            .update({
               status: "failed",
               failure_reason:
                  kpayError instanceof Error
                     ? kpayError.message
                     : "Unknown error",
               updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

         // If the error message contains known KPay authentication hint, surface it gently
         const errMsg =
            kpayError instanceof Error ? kpayError.message : String(kpayError);
         const userMessage =
            errMsg.toLowerCase().includes("invalid username") ||
            errMsg.toLowerCase().includes("invalid password")
               ? "Payment gateway authentication failed (invalid credentials). Please verify payment gateway configuration in production."
               : "Failed to initiate payment with KPay";

         return NextResponse.json(
            { error: userMessage, technicalError: errMsg },
            { status: 500 }
         );
      }
   } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
         "api",
         "KPay payment initiation failed with unexpected error",
         {
            orderId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration,
         }
      );

      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

export async function GET() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
