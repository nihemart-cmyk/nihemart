import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

interface RouteParams {
   paymentId: string;
   reason?: string;
}

export async function POST(request: NextRequest) {
   try {
      const body: RouteParams = await request.json();
      const { paymentId, reason } = body;

      logger.info("api", "Payment timeout request received", {
         paymentId,
         reason,
      });

      if (!paymentId) {
         return NextResponse.json(
            { error: "Payment ID is required" },
            { status: 400 }
         );
      }

      // Initialize Supabase client
      const supabase = await createServerSupabaseClient();

      // Get the payment record
      const { data: payment, error: paymentError } = await supabase
         .from("payments")
         .select("id, order_id, status")
         .eq("id", paymentId)
         .single();

      if (paymentError || !payment) {
         logger.info(
            "api",
            "Payment not found in payments table for timeout; attempting payment_sessions fallback",
            { paymentId, error: paymentError?.message }
         );

         // Try to find a session and mark it timed out instead
         try {
            const { data: session, error: sessionErr } = await supabase
               .from("payment_sessions")
               .select("id, status, reference")
               .or(`id.eq.${paymentId},reference.eq.${paymentId}`)
               .maybeSingle();

            if (sessionErr) {
               logger.warn(
                  "api",
                  "Failed to lookup payment session for timeout",
                  {
                     paymentId,
                     error: sessionErr.message,
                  }
               );
            }

            if (session) {
               // Only mark timeout if session is still pending/initiated
               if (
                  session.status === "pending" ||
                  session.status === "initiated"
               ) {
                  const { error: sessUpdateErr } = await supabase
                     .from("payment_sessions")
                     .update({
                        status: "timeout",
                        updated_at: new Date().toISOString(),
                     })
                     .eq("id", session.id);

                  if (sessUpdateErr) {
                     logger.error(
                        "api",
                        "Failed to mark payment_session timeout",
                        { paymentId: session.id, error: sessUpdateErr.message }
                     );
                     return NextResponse.json(
                        { error: "Failed to update payment session timeout" },
                        { status: 500 }
                     );
                  }

                  logger.info(
                     "api",
                     "Payment session marked as timeout for client-side timeout",
                     { paymentId: session.id, reference: session.reference }
                  );

                  return NextResponse.json({
                     success: true,
                     message: "Payment session marked as timed out",
                     status: "timeout",
                     sessionId: session.id,
                  });
               }

               // Session exists but is not pending
               return NextResponse.json({
                  success: true,
                  message: `Payment session status is ${session.status}, timeout ignored.`,
                  status: session.status,
                  sessionId: session.id,
               });
            }
         } catch (e) {
            logger.error(
               "api",
               "Error while handling payment_session fallback for timeout",
               {
                  paymentId,
                  error: e instanceof Error ? e.message : String(e),
               }
            );
         }

         logger.warn(
            "api",
            "Payment not found for timeout (no payments or sessions)",
            {
               paymentId,
            }
         );
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      // Only update if payment is still pending (don't override completed/failed statuses)
      if (payment.status === "pending") {
         const { error: updateError } = await supabase
            .from("payments")
            .update({
               client_timeout: true,
               client_timeout_reason:
                  reason || "Client-side timeout after 1 minute",
               updated_at: new Date().toISOString(),
            })
            .eq("id", paymentId);

         if (updateError) {
            logger.error("api", "Failed to update payment timeout flag", {
               paymentId,
               error: updateError.message,
            });
            return NextResponse.json(
               { error: "Failed to update payment timeout" },
               { status: 500 }
            );
         }

         logger.info("api", "Payment marked with client timeout flag", {
            paymentId,
            orderId: payment.order_id,
            reason,
         });

         // After recording the client timeout, fetch the latest payment row and return it so the client
         // can make a final decision (maybe server-side webhook or status check already completed).
         const { data: latestPayment, error: latestError } = await supabase
            .from("payments")
            .select(
               "id, order_id, status, kpay_transaction_id, reference, completed_at"
            )
            .eq("id", paymentId)
            .single();

         if (latestError || !latestPayment) {
            // If we couldn't fetch the latest, still return success for the timeout recording
            return NextResponse.json({
               success: true,
               message:
                  "Payment timeout recorded. Order remains available for retry.",
               status: payment.status,
            });
         }

         return NextResponse.json({
            success: true,
            message:
               "Payment timeout recorded. Order remains available for retry.",
            status: latestPayment.status,
            payment: latestPayment,
         });
      } else {
         logger.info(
            "api",
            "Payment timeout ignored - payment no longer pending",
            {
               paymentId,
               status: payment.status,
            }
         );

         return NextResponse.json({
            success: true,
            message: `Payment status is ${payment.status}, timeout ignored.`,
            status: payment.status,
         });
      }
   } catch (error) {
      logger.error("api", "Payment timeout handling failed", {
         error: error instanceof Error ? error.message : String(error),
         stack: error instanceof Error ? error.stack : undefined,
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
