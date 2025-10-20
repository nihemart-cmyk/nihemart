import { NextRequest, NextResponse } from "next/server";
import {
   initializeKPayService,
   KPayService,
   PAYMENT_METHODS,
} from "@/lib/services/kpay";
import { createServiceSupabaseClient } from "@/utils/supabase/service";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export interface PaymentInitiationRequest {
   orderId?: string;
   amount: number;
   customerName: string;
   customerEmail: string;
   customerPhone: string;
   paymentMethod: keyof typeof PAYMENT_METHODS;
   redirectUrl: string;
   cart?: any;
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

      // Basic validation
      if (!body.amount || !body.paymentMethod) {
         return NextResponse.json(
            { error: "Amount and payment method are required" },
            { status: 400 }
         );
      }

      if (!body.orderId && !body.cart) {
         return NextResponse.json(
            { error: "Either orderId or cart snapshot is required" },
            { status: 400 }
         );
      }

      if (!body.customerEmail || !body.customerPhone || !body.redirectUrl) {
         return NextResponse.json(
            { error: "Customer details and redirect URL are required" },
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

      // Validate amount
      if (body.amount <= 0) {
         return NextResponse.json(
            { error: "Amount must be greater than 0" },
            { status: 400 }
         );
      }

      const supabase = createServiceSupabaseClient();

      // If orderId provided, verify order exists
      let order: any = null;
      if (body.orderId) {
         const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .select("id, total, status, customer_email, customer_phone")
            .eq("id", body.orderId)
            .single();

         if (orderError || !orderData) {
            return NextResponse.json(
               { error: "Order not found" },
               { status: 404 }
            );
         }

         order = orderData;

         // Verify order status
         if (order.status !== "pending") {
            return NextResponse.json(
               { error: "Order cannot be paid - invalid status" },
               { status: 400 }
            );
         }

         // Verify amount matches
         if (Math.abs(body.amount - order.total) > 0.01) {
            return NextResponse.json(
               { error: "Amount mismatch with order total" },
               { status: 400 }
            );
         }

         // Check for existing successful payment
         const { data: existingPayments } = await supabase
            .from("payments")
            .select("id, status")
            .eq("order_id", body.orderId)
            .in("status", ["completed", "successful"]);

         if (existingPayments && existingPayments.length > 0) {
            return NextResponse.json(
               { error: "Order already paid" },
               { status: 400 }
            );
         }

         // Check for pending payment without client timeout
         const { data: pendingPayment } = await supabase
            .from("payments")
            .select("id, status, client_timeout, created_at")
            .eq("order_id", body.orderId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

         if (pendingPayment && !pendingPayment.client_timeout) {
            // Check if payment is recent (within last 5 minutes)
            const paymentAge =
               Date.now() - new Date(pendingPayment.created_at).getTime();
            if (paymentAge < 5 * 60 * 1000) {
               return NextResponse.json(
                  {
                     error: "A payment is already in progress. Please wait or try again after it times out.",
                     existingPaymentId: pendingPayment.id,
                  },
                  { status: 409 }
               );
            }
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

      // Generate unique reference in the format NIHEMART_{timestamp}_{6-digit}
      let orderReference: string;

      // For session-based (no orderId) attempts we keep a deterministic-ish
      // component to avoid duplicates within the same minute, but still
      // conform to the requested NIHEMART_... format. We will embed the
      // timestamp and a pseudo-random 6-digit suffix.
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const padded = String(random).padStart(6, "0");

      orderReference = `NIHEMART_${timestamp}_${padded}`;

      // Format phone number
      const formattedPhone = KPayService.formatPhoneNumber(body.customerPhone);

      logger.info("api", "Phone number formatting", {
         original: body.customerPhone,
         formatted: formattedPhone,
      });

      // Check for existing payment with same reference (deduplication)
      const { data: existingPayment } = await supabase
         .from("payments")
         .select("*")
         .eq("reference", orderReference)
         .maybeSingle();

      if (existingPayment) {
         logger.info("api", "Reusing existing payment session", {
            paymentId: existingPayment.id,
            reference: orderReference,
         });

         // Return existing payment details
         const checkoutUrl =
            existingPayment.kpay_response?.url ||
            existingPayment.kpay_response?.redirecturl ||
            null;

         return NextResponse.json({
            success: true,
            paymentId: existingPayment.id,
            transactionId: existingPayment.kpay_transaction_id,
            reference: existingPayment.reference,
            checkoutUrl,
            status: existingPayment.status,
            message: "Using existing payment session",
         });
      }

      // Create new payment record. Use reference deduplication to avoid
      // creating duplicate payment rows during race conditions. We attempt
      // to insert; if the insert fails because another process inserted the
      // same reference, fetch and reuse the existing row.
      let payment: any = null;
      try {
         const insertRes = await supabase
            .from("payments")
            .insert({
               order_id: body.orderId || null,
               amount: body.amount,
               currency: "RWF",
               payment_method: body.paymentMethod,
               status: "pending",
               reference: orderReference,
               customer_name: body.customerName,
               customer_email: body.customerEmail,
               customer_phone: formattedPhone,
               // Note: 'cart' column removed — payments table does not include a cart column
               created_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();

         if (insertRes.error) {
            // If insertion failed, try to find an existing payment with the same reference
            console.warn(
               "Payment insert failed, attempting to find existing payment:",
               insertRes.error
            );
            const { data: existing, error: existingErr } = await supabase
               .from("payments")
               .select("*")
               .eq("reference", orderReference)
               .maybeSingle();

            if (existingErr || !existing) {
               console.error(
                  "Failed to create or find existing payment record:",
                  insertRes.error,
                  existingErr
               );
               return NextResponse.json(
                  { error: "Failed to create payment record" },
                  { status: 500 }
               );
            }

            payment = existing;
         } else {
            payment = insertRes.data;
         }
      } catch (e) {
         console.error("Unexpected error while creating payment record:", e);
         return NextResponse.json(
            { error: "Failed to create payment record" },
            { status: 500 }
         );
      }

      logger.info("api", "Payment record ready", {
         paymentId: payment.id,
         reference: orderReference,
      });

      try {
         // Initiate payment with KPay
         const customerNumber = order?.customer_phone || formattedPhone;

         const kpayResponse = await kpayService.initiatePayment({
            amount: body.amount,
            customerName: body.customerName,
            customerEmail: body.customerEmail,
            customerPhone: formattedPhone,
            customerNumber,
            paymentMethod: body.paymentMethod,
            orderReference,
            orderDetails: `Order from Nihemart - ${orderReference}`,
            redirectUrl: body.redirectUrl,
            logoUrl: `${request.nextUrl.origin}/logo.png`,
         });

         // Update payment with KPay details
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
            console.error(
               "Failed to update payment with KPay details:",
               updateError
            );
         }

         logger.info("api", "KPay response received", {
            tid: kpayResponse.tid,
            retcode: kpayResponse.retcode,
         });

         // Check if payment initiation was successful
         if (kpayResponse.retcode === 0) {
            const anyResp: any = kpayResponse as any;
            const checkoutUrl =
               anyResp.url ||
               anyResp.redirecturl ||
               anyResp.redirectUrl ||
               null;

            return NextResponse.json({
               success: true,
               paymentId: payment.id,
               transactionId: kpayResponse.tid,
               reference: orderReference,
               checkoutUrl,
               kpayResponse,
               status: "pending",
               message: "Payment initiated successfully",
            });
         } else {
            // Payment initiation failed
            const errorMessage = kpayService.getErrorMessage(
               kpayResponse.retcode
            );

            await supabase
               .from("payments")
               .update({
                  status: "failed",
                  failure_reason: errorMessage,
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.id);

            // User-friendly error messages
            let userError = errorMessage;
            if (kpayResponse.retcode === 609) {
               userError =
                  "This payment method is not supported. Please try a different method.";
            } else if (kpayResponse.retcode === 607) {
               userError =
                  "Mobile money transaction failed. Please check your balance.";
            } else if (kpayResponse.retcode === 608) {
               userError =
                  "This payment reference was already used. Please try again.";
            }

            return NextResponse.json(
               {
                  success: false,
                  error: userError,
                  errorCode: kpayResponse.retcode,
                  technicalError: errorMessage,
               },
               { status: 400 }
            );
         }
      } catch (kpayError) {
         console.error("KPay payment initiation failed:", kpayError);

         // Update payment to failed
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

         return NextResponse.json(
            {
               error: "Failed to initiate payment with gateway",
               technicalError:
                  kpayError instanceof Error
                     ? kpayError.message
                     : String(kpayError),
            },
            { status: 500 }
         );
      }
   } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("api", "Payment initiation failed", {
         orderId,
         error: error instanceof Error ? error.message : String(error),
         duration,
      });

      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

export async function GET() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
