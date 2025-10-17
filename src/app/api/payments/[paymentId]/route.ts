import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
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
      const supabase = await createServerSupabaseClient();

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
