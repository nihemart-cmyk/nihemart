import { NextRequest, NextResponse } from "next/server";
import {
   initializeKPayService,
   KPayService,
   PAYMENT_METHODS,
} from "@/lib/services/kpay";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

export interface PaymentInitiationRequest {
   // orderId is now optional; if omitted the server will create a payment session
   orderId?: string;
   amount: number;
   customerName: string;
   customerEmail: string;
   customerPhone: string;
   paymentMethod: keyof typeof PAYMENT_METHODS;
   redirectUrl: string;
   // Optional cart snapshot for session-based payments
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

      // Validation: allow two flows
      // - Order-based: body.orderId provided (server will use existing order data)
      // - Session-based: no orderId, but a `cart` snapshot and customer contact fields are required

      const missingFields: any = {
         orderId: !body.orderId,
         cart: !body.cart,
         amount: !body.amount,
         customerName: !body.customerName,
         customerEmail: !body.customerEmail,
         customerPhone: !body.customerPhone,
         paymentMethod: !body.paymentMethod,
         redirectUrl: !body.redirectUrl,
      };

      // Must have amount and paymentMethod regardless
      if (!body.amount || !body.paymentMethod) {
         logger.warn(
            "api",
            "KPay payment initiation failed - missing amount or payment method",
            { amount: body.amount, paymentMethod: body.paymentMethod }
         );
         return NextResponse.json(
            { error: "Amount and payment method are required" },
            { status: 400 }
         );
      }

      // Must have either an orderId (order-based flow) or a cart snapshot (session-based flow)
      if (!body.orderId && !body.cart) {
         logger.warn(
            "api",
            "KPay payment initiation failed - neither orderId nor cart provided",
            { missingFields }
         );
         return NextResponse.json(
            {
               error: "Either orderId or cart snapshot is required to initiate payment",
            },
            { status: 400 }
         );
      }

      // If session-based (no orderId), require contact fields and redirectUrl
      if (!body.orderId) {
         if (
            !body.customerName ||
            !body.customerEmail ||
            !body.customerPhone ||
            !body.redirectUrl
         ) {
            logger.warn(
               "api",
               "KPay payment initiation failed - missing required customer or redirect fields for session-based initiation",
               { missingFields }
            );
            return NextResponse.json(
               {
                  error: "Missing customer details or redirectUrl for session-based initiation",
               },
               { status: 400 }
            );
         }
      } else {
         // If order-based, ensure redirectUrl is present and amount is valid (we already checked amount above)
         if (!body.redirectUrl) {
            logger.warn(
               "api",
               "KPay payment initiation failed - missing redirectUrl for order-based initiation",
               { orderId: body.orderId }
            );
            return NextResponse.json(
               { error: "Redirect URL is required" },
               { status: 400 }
            );
         }
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

      // If an orderId was provided, verify the order exists and is payable
      let order: any = null;
      if (body.orderId) {
         let orderError: any = null;
         let attempts = 0;
         const maxAttempts = 3;

         while (attempts < maxAttempts && !order) {
            attempts++;
            if (attempts > 1) {
               await new Promise((resolve) =>
                  setTimeout(resolve, 200 * attempts)
               );
               logger.info(
                  "api",
                  `Order verification retry attempt ${attempts}`,
                  {
                     orderId: body.orderId,
                  }
               );
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
            if (
               latestPayment.status === "completed" ||
               latestPayment.status === "successful"
            ) {
               return NextResponse.json(
                  { error: "Order already paid" },
                  { status: 400 }
               );
            }

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

      // If orderId was provided, create the payment record associated with the order.
      // Otherwise create a payment_session to avoid persisting an order before payment
      let payment: any = null;
      if (body.orderId) {
         const { data: paymentRow, error: paymentError } = await supabase
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

         if (paymentError || !paymentRow) {
            console.error("Failed to create payment record:", paymentError);
            return NextResponse.json(
               { error: "Failed to create payment record" },
               { status: 500 }
            );
         }
         payment = paymentRow;
      } else {
         // Create a payments row that acts as a session: order_id is null until finalize
         // Note: don't include `cart` in the initial insert because some deployments
         // may not have a `cart` column on `payments` yet (migrations may be pending).
         const { data: paymentRow, error: paymentError } = await supabase
            .from("payments")
            .insert({
               order_id: null,
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

         if (paymentError || !paymentRow) {
            console.error(
               "Failed to create payment record for session:",
               paymentError
            );
            return NextResponse.json(
               { error: "Failed to create payment record" },
               { status: 500 }
            );
         }

         payment = paymentRow;
      }

      try {
         // Initiate payment with KPay
         // Determine the best customer number: prefer existing order phone (if present),
         // otherwise use the formatted phone from the request.
         const customerNumber =
            (order && (order.customer_phone || order.phone)) || formattedPhone;

         const kpayResponse = await kpayService.initiatePayment({
            amount: body.amount,
            customerName: body.customerName,
            customerEmail: body.customerEmail,
            customerPhone: formattedPhone,
            customerNumber,
            paymentMethod: body.paymentMethod,
            orderReference,
            orderDetails: `Order #${body.orderId || "(session)"} from Nihemart`,
            redirectUrl: body.redirectUrl,
            logoUrl: `${request.nextUrl.origin}/logo.png`,
         });

         // Update payment record or session with KPay transaction details
         if (payment.id) {
            const { error: payUpdateErr } = await supabase
               .from("payments")
               .update({
                  kpay_transaction_id: kpayResponse.tid,
                  kpay_auth_key: kpayResponse.authkey,
                  kpay_return_code: kpayResponse.retcode,
                  kpay_response: kpayResponse,
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.id);
            if (payUpdateErr)
               console.error("Failed to update payment record:", payUpdateErr);

            // Best-effort: attempt to write the cart into payments.cart if provided.
            // Some DBs may not have the `cart` column yet; swallow errors to avoid hard failures.
            if (body.cart) {
               try {
                  const { error: cartErr } = await supabase
                     .from("payments")
                     .update({
                        cart: body.cart,
                        updated_at: new Date().toISOString(),
                     })
                     .eq("id", payment.id);
                  if (cartErr) {
                     // Log a warning but don't abort the flow. Likely the column doesn't exist.
                     logger.warn(
                        "api",
                        "Failed to write cart to payments row (column may be missing)",
                        {
                           paymentId: payment.id,
                           error: cartErr.message || cartErr,
                        }
                     );
                  }
               } catch (e) {
                  logger.warn(
                     "api",
                     "Failed to write cart to payments row (caught exception)",
                     {
                        paymentId: payment.id,
                        error: e instanceof Error ? e.message : String(e),
                     }
                  );
               }
            }
         } else if (payment && !payment.id) {
            // Shouldn't happen; defensive: if payment has no id treat as error
         } else {
            // session-based payments were inserted into payments table above, so just update by reference
            const { error: payUpdateErr2 } = await supabase
               .from("payments")
               .update({
                  kpay_transaction_id: kpayResponse.tid,
                  kpay_response: kpayResponse,
                  status: "pending",
                  updated_at: new Date().toISOString(),
               })
               .eq("reference", orderReference);
            if (payUpdateErr2)
               console.error(
                  "Failed to update session-like payment record:",
                  payUpdateErr2
               );

            // Best-effort cart write by reference when payment was updated by reference
            if (body.cart) {
               try {
                  const { error: cartErr2 } = await supabase
                     .from("payments")
                     .update({
                        cart: body.cart,
                        updated_at: new Date().toISOString(),
                     })
                     .eq("reference", orderReference);
                  if (cartErr2) {
                     logger.warn(
                        "api",
                        "Failed to write cart to payments row by reference (column may be missing)",
                        {
                           reference: orderReference,
                           error: cartErr2.message || cartErr2,
                        }
                     );
                  }
               } catch (e) {
                  logger.warn(
                     "api",
                     "Failed to write cart to payments row by reference (caught exception)",
                     {
                        reference: orderReference,
                        error: e instanceof Error ? e.message : String(e),
                     }
                  );
               }
            }
         }

         // Note: individual update errors are logged above. Continue anyway,
         // as the payment was initiated successfully.

         // Normalize possible checkout/redirect URL fields from KPay
         const kr: any = kpayResponse as any;
         const rawCheckout =
            kr?.url ||
            kr?.redirecturl ||
            kr?.redirectUrl ||
            kr?.checkoutUrl ||
            null;
         const checkoutUrl =
            typeof rawCheckout === "string" && rawCheckout.trim().length > 0
               ? rawCheckout.trim()
               : null;

         // Log the KPay response including any redirect URL for diagnostics
         logger.info("api", "KPay response after initiation", {
            refid: orderReference,
            tid: kpayResponse?.tid,
            retcode: kpayResponse?.retcode,
            checkoutUrl,
            raw: kpayResponse,
         });

         // Check if payment was successful immediately (some payments are processed instantly)
         if (kpayResponse.retcode === 0) {
            if (!checkoutUrl) {
               logger.warn(
                  "api",
                  "KPay initiation returned success but no checkout URL was provided",
                  { refid: orderReference, tid: kpayResponse.tid }
               );
            }
            // Payment initiated successfully
            return NextResponse.json({
               success: true,
               paymentId: payment.id || null,
               // return sessionId top-level for easier client redirects
               sessionId: payment.session?.id || null,
               session: payment.session || null,
               transactionId: kpayResponse.tid,
               reference: orderReference,
               checkoutUrl,
               kpayResponse,
               status: "pending",
               message: "Payment initiated successfully",
            });
         } else {
            // Payment failed to initiate
            const errorMessage = kpayService.getErrorMessage(
               kpayResponse.retcode
            );

            if (payment.id) {
               await supabase
                  .from("payments")
                  .update({
                     status: "failed",
                     failure_reason: errorMessage,
                     kpay_return_code: kpayResponse.retcode,
                     updated_at: new Date().toISOString(),
                  })
                  .eq("id", payment.id);
            } else if (payment.session) {
               await supabase
                  .from("payment_sessions")
                  .update({
                     status: "failed",
                     failure_reason: errorMessage,
                     kpay_return_code: kpayResponse.retcode,
                     updated_at: new Date().toISOString(),
                  })
                  .eq("id", payment.session.id);
            }

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
                  kpayResponse,
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
         if (payment.id) {
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
         } else if (payment.session) {
            await supabase
               .from("payment_sessions")
               .update({
                  status: "failed",
                  failure_reason:
                     kpayError instanceof Error
                        ? kpayError.message
                        : "Unknown error",
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.session.id);
         }

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
