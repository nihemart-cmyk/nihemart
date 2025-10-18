import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/utils/supabase/service";
import { logger } from "@/lib/logger";

interface RouteParams {
   params: Promise<{
      paymentId: string;
   }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
   const { paymentId } = await params;

   try {
      logger.info("api", "Payment details request received", { paymentId });

      if (!paymentId) {
         return NextResponse.json(
            { error: "Payment ID is required" },
            { status: 400 }
         );
      }

      // Initialize Supabase client
      const supabase = createServiceSupabaseClient();

      // Fetch payment details - use maybeSingle to avoid coercion errors
      const { data: payment, error: paymentError } = await supabase
         .from("payments")
         .select("*")
         .eq("id", paymentId)
         .maybeSingle();

      if (paymentError || !payment) {
         // If not found by id, try to find by reference in payments (sometimes reference used as id)
         logger.info(
            "api",
            "Payment not found in payments table by id, trying fallback lookups",
            { paymentId, error: paymentError?.message }
         );

         // Try lookup by reference in payments
         try {
            const { data: byRef, error: byRefErr } = await supabase
               .from("payments")
               .select("*")
               .eq("reference", paymentId)
               .maybeSingle();

            if (byRefErr) {
               logger.warn("api", "Failed payments fallback lookup", {
                  paymentId,
                  error: byRefErr.message,
               });
            }

            if (byRef) {
               // use byRef as payment
               return NextResponse.json(byRef);
            }
         } catch (e) {
            logger.error("api", "Error during payments fallback lookup", {
               paymentId,
               error: e instanceof Error ? e.message : String(e),
            });
         }

         logger.info(
            "api",
            "Payment not found in payments table, checking payment_sessions",
            { paymentId }
         );

         // Try to find a session-based payment (payment_sessions) by id or reference
         try {
            const { data: session, error: sessionErr } = await supabase
               .from("payment_sessions")
               .select(
                  "id, status, amount, currency, reference, payment_method, customer_name, customer_email, customer_phone, cart, kpay_transaction_id, kpay_response, kpay_webhook_data, created_at, updated_at"
               )
               .or(`id.eq.${paymentId},reference.eq.${paymentId}`)
               .maybeSingle();

            if (sessionErr) {
               logger.warn("api", "Failed to lookup payment session", {
                  paymentId,
                  error: sessionErr.message,
               });
            }

            if (session) {
               // Map session fields into the same shape expected by the payment page
               const mapped = {
                  id: session.id,
                  order_id: null,
                  amount: session.amount || 0,
                  currency: session.currency || "RWF",
                  payment_method: session.payment_method || "kpay",
                  status: session.status || "pending",
                  reference: session.reference || null,
                  kpay_transaction_id: session.kpay_transaction_id || null,
                  customer_name: session.customer_name || null,
                  customer_email: session.customer_email || null,
                  customer_phone: session.customer_phone || null,
                  created_at: session.created_at || new Date().toISOString(),
                  checkout_url:
                     session.kpay_response?.url ||
                     session.kpay_response?.redirecturl ||
                     null,
                  failure_reason:
                     session.kpay_response?.failure_reason ||
                     session.kpay_webhook_data?.statusdesc ||
                     null,
               } as any;

               return NextResponse.json(mapped);
            }
         } catch (e) {
            logger.error("api", "Error while querying payment_sessions", {
               paymentId,
               error: e instanceof Error ? e.message : String(e),
            });
         }

         logger.warn("api", "Payment not found", { paymentId });
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      logger.info("api", "Payment details retrieved successfully", {
         paymentId,
         orderId: payment.order_id,
         status: payment.status,
         amount: payment.amount,
      });

      // If payment is pending, automatically check for status update
      if (payment.status === "pending" && payment.kpay_transaction_id) {
         logger.info("api", "Payment is pending, checking for updates", {
            paymentId,
         });

         try {
            // Make a status check request internally
            const statusResponse = await fetch(
               `${request.nextUrl.origin}/api/payments/kpay/status`,
               {
                  method: "POST",
                  headers: {
                     "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ paymentId }),
               }
            );

            if (statusResponse.ok) {
               const statusData = await statusResponse.json();
               logger.info("api", "Status check completed", {
                  paymentId,
                  newStatus: statusData.status,
                  needsUpdate: statusData.needsUpdate,
               });

               // Return the updated status
               if (statusData.needsUpdate) {
                  payment.status = statusData.status;
               }
            }
         } catch (statusError) {
            logger.warn(
               "api",
               "Status check failed, returning current status",
               {
                  paymentId,
                  error:
                     statusError instanceof Error
                        ? statusError.message
                        : String(statusError),
               }
            );
         }
      }

      return NextResponse.json(payment);
   } catch (error) {
      logger.error("api", "Failed to retrieve payment details", {
         paymentId,
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

/**
 * PATCH /api/payments/[paymentId]
 * Links a payment to an order after order creation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
   try {
      const { paymentId } = await params;
      const body = await request.json();
      const { order_id } = body;

      if (!order_id) {
         return NextResponse.json(
            { error: "order_id is required" },
            { status: 400 }
         );
      }

      logger.info("api", "Linking payment to order", {
         paymentId,
         orderId: order_id,
      });

      const supabase = createServiceSupabaseClient();

      // Get payment
      const { data: payment, error: paymentError } = await supabase
         .from("payments")
         .select("id, status, order_id")
         .eq("id", paymentId)
         .single();

      if (paymentError || !payment) {
         logger.error("api", "Payment not found", {
            paymentId,
            error: paymentError?.message,
         });
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      // Check if payment is already linked
      if (payment.order_id && payment.order_id !== order_id) {
         logger.warn("api", "Payment already linked to different order", {
            paymentId,
            existingOrderId: payment.order_id,
            newOrderId: order_id,
         });
         return NextResponse.json(
            { error: "Payment already linked to a different order" },
            { status: 409 }
         );
      }

      // Only link completed payments
      if (payment.status !== "completed" && payment.status !== "successful") {
         logger.warn("api", "Cannot link non-completed payment", {
            paymentId,
            status: payment.status,
         });
         return NextResponse.json(
            { error: "Can only link completed payments to orders" },
            { status: 400 }
         );
      }

      // Verify order exists
      const { data: order, error: orderError } = await supabase
         .from("orders")
         .select("id, status")
         .eq("id", order_id)
         .single();

      if (orderError || !order) {
         logger.error("api", "Order not found", {
            orderId: order_id,
            error: orderError?.message,
         });
         return NextResponse.json(
            { error: "Order not found" },
            { status: 404 }
         );
      }

      // Link payment to order and update order status
      const { error: updateError } = await supabase
         .from("payments")
         .update({
            order_id: order_id,
            updated_at: new Date().toISOString(),
         })
         .eq("id", paymentId);

      if (updateError) {
         logger.error("api", "Failed to link payment to order", {
            paymentId,
            orderId: order_id,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
         });
         return NextResponse.json(
            { error: "Failed to link payment to order" },
            { status: 500 }
         );
      }

      // Update order's payment_status to 'paid' since payment was completed
      const { error: orderUpdateError } = await supabase
         .from("orders")
         .update({
            payment_status: "paid",
            updated_at: new Date().toISOString(),
         })
         .eq("id", order_id);

      if (orderUpdateError) {
         logger.warn("api", "Failed to update order payment_status", {
            orderId: order_id,
            error: orderUpdateError.message,
         });
         // Don't fail the request since payment link succeeded
      } else {
         logger.info("api", "Order payment_status updated to paid", {
            orderId: order_id,
         });
      }

      logger.info("api", "Payment successfully linked to order", {
         paymentId,
         orderId: order_id,
      });

      return NextResponse.json({
         success: true,
         message: "Payment linked to order successfully",
         paymentId,
         orderId: order_id,
      });
   } catch (error) {
      logger.error("api", "Payment link endpoint error", {
         error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}
