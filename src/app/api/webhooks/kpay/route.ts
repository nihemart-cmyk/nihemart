import { NextRequest, NextResponse } from "next/server";
import { initializeKPayService } from "@/lib/services/kpay";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";
import { createOrder } from "@/integrations/supabase/orders";

export async function POST(request: NextRequest) {
   const startTime = Date.now();
   let transactionId: string | undefined;
   let orderReference: string | undefined;

   try {
      logger.info("webhook", "KPay webhook received");

      // Parse the webhook payload
      const payload = await request.json();
      transactionId = payload.tid;
      orderReference = payload.refid;

      logger.webhookReceived({
         transactionId: payload.tid || "unknown",
         status: payload.statusid || "unknown",
         reference: payload.refid || "unknown",
      });

      // Initialize KPay service to validate and process the webhook
      let kpayService;
      try {
         kpayService = initializeKPayService();
      } catch (error) {
         console.error("Failed to initialize KPay service:", error);
         return NextResponse.json(
            { error: "Service unavailable" },
            { status: 503 }
         );
      }

      // Validate webhook payload structure
      if (!kpayService.validateWebhookPayload(payload)) {
         console.error("Invalid webhook payload structure:", payload);
         return NextResponse.json(
            { error: "Invalid payload" },
            { status: 400 }
         );
      }

      // Normalize payload fields to strings to handle numeric values from KPay
      const normalizedPayload = {
         ...payload,
         tid: payload.tid ? String(payload.tid) : payload.tid,
         refid: payload.refid ? String(payload.refid) : payload.refid,
         statusid: payload.statusid
            ? String(payload.statusid)
            : payload.statusid,
         statusdesc: payload.statusdesc
            ? String(payload.statusdesc)
            : payload.statusdesc,
      };

      // Process the webhook payload
      const paymentStatus = kpayService.processWebhookPayload(
         normalizedPayload as any
      );
      console.log("Processed payment status:", paymentStatus);

      // Initialize Supabase client
      const supabase = await createServerSupabaseClient();

      // Find the payment record by KPay transaction ID or reference
      let payment: any = null;
      let findError: any = null;

      if (paymentStatus.orderReference) {
         const r = await supabase
            .from("payments")
            .select(
               "id, reference, order_id, status, amount, currency, kpay_transaction_id, cart, kpay_response"
            )
            .eq("reference", paymentStatus.orderReference)
            .limit(1)
            .maybeSingle();
         payment = r.data;
         findError = r.error;
      }

      if (!payment && paymentStatus.transactionId) {
         const r = await supabase
            .from("payments")
            .select(
               "id, reference, order_id, status, amount, currency, kpay_transaction_id, cart, kpay_response"
            )
            .eq("kpay_transaction_id", paymentStatus.transactionId)
            .limit(1)
            .maybeSingle();
         payment = r.data;
         findError = r.error || findError;
      }

      // If no payment row exists, try to find payments by reference/transaction id only
      if (!payment) {
         const { data: paymentByRef, error: findErr } = await supabase
            .from("payments")
            .select(
               "id, order_id, status, amount, currency, kpay_transaction_id, cart, kpay_response"
            )
            .or(
               `reference.eq.${paymentStatus.orderReference},kpay_transaction_id.eq.${paymentStatus.transactionId}`
            )
            .limit(1)
            .maybeSingle();

         if (paymentByRef) {
            payment = paymentByRef as any;
            logger.info(
               "webhook",
               "Found payments row for webhook by reference/transaction",
               {
                  paymentId: payment?.id,
                  reference: payment?.reference,
               }
            );
         }
      }

      if (!payment) {
         console.error("Payment/session not found for webhook:", {
            transactionId: paymentStatus.transactionId,
            orderReference: paymentStatus.orderReference,
            findError,
         });

         // Still return OK to KPay to prevent retries for unknown transactions
         return NextResponse.json({
            tid: paymentStatus.transactionId,
            refid: paymentStatus.orderReference,
            reply: "OK",
         });
      }

      // If we matched an existing payments row, ensure we don't reprocess final states
      if (
         payment &&
         (payment.status === "completed" || payment.status === "failed")
      ) {
         console.log("Payment already in final state:", payment.status);
         return NextResponse.json({
            tid: paymentStatus.transactionId,
            refid: paymentStatus.orderReference,
            reply: "OK",
         });
      }

      // No session table usage here; we operate on payments only

      // Update payment status based on webhook
      let newPaymentStatus: string;
      const updateData: any = {
         kpay_transaction_id: paymentStatus.transactionId,
         kpay_webhook_data: payload,
         updated_at: new Date().toISOString(),
      };

      if (paymentStatus.isSuccessful) {
         newPaymentStatus = "completed";
         updateData.status = "completed";
         updateData.completed_at = new Date().toISOString();
         updateData.kpay_mom_transaction_id = payload.momtransactionid;
         updateData.kpay_pay_account = payload.payaccount;
      } else if (paymentStatus.isFailed) {
         newPaymentStatus = "failed";
         updateData.status = "failed";
         updateData.failure_reason = paymentStatus.statusMessage;
      } else if (paymentStatus.isPending) {
         newPaymentStatus = "pending";
         updateData.status = "pending";
      } else {
         // Unknown status, log and keep current status
         console.warn("Unknown payment status from webhook:", payload.statusid);
         newPaymentStatus = payment?.status || "unknown";
      }

      // If webhook contains a transactionId and we matched a payments row but it lacks the kpay_transaction_id,
      // ensure it's recorded so future lookups work by transaction id.
      if (
         payment &&
         (payment as any).kpay_transaction_id !== paymentStatus.transactionId
      ) {
         try {
            const { error: writeTidErr } = await supabase
               .from("payments")
               .update({
                  kpay_transaction_id: paymentStatus.transactionId,
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.id);
            if (writeTidErr) {
               console.warn(
                  "Failed to write kpay_transaction_id to payments row:",
                  writeTidErr
               );
            } else {
               logger.info(
                  "webhook",
                  "Wrote kpay_transaction_id to payments row",
                  {
                     paymentId: payment.id,
                     transactionId: paymentStatus.transactionId,
                  }
               );
            }
         } catch (e) {
            // swallow - best-effort
         }
      }

      // Update payment record depending on which we matched (we always operate on payments now)
      if (payment) {
         const { error: updateError } = await supabase
            .from("payments")
            .update(updateData)
            .eq("id", payment.id);

         if (updateError) {
            console.error("Failed to update payment record:", updateError);
            return NextResponse.json(
               { error: "Database update failed" },
               { status: 500 }
            );
         }
      }

      console.log("Payment updated successfully:", {
         paymentId: payment?.id || null,
         orderId: payment?.order_id || null,
         oldStatus: payment?.status || null,
         newStatus: newPaymentStatus,
      });

      // If the payment is successful and we matched a payments row:
      if (paymentStatus.isSuccessful && payment) {
         // Existing payment linked to an order: update order.payment_status only
         if (payment.order_id) {
            const { error: orderUpdateError } = await supabase
               .from("orders")
               .update({
                  payment_status: "paid",
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.order_id);

            if (orderUpdateError) {
               console.error(
                  "Failed to update order.payment_status:",
                  orderUpdateError
               );
            } else {
               console.log(
                  "Order payment_status updated to paid:",
                  payment.order_id
               );
            }
         } else {
            // Payment completed for a session-like payment (no order yet).
            logger.info(
               "webhook",
               "Payment completed for session-like payments row",
               {
                  paymentId: payment.id,
               }
            );
         }
      }

      if (paymentStatus.isFailed) {
         // If this payment is linked to an order, update the order status to failed
         if (payment && payment.order_id) {
            const { error: orderUpdateError } = await supabase
               .from("orders")
               .update({
                  payment_status: "failed",
                  updated_at: new Date().toISOString(),
               })
               .eq("id", payment.order_id);

            if (orderUpdateError) {
               console.error(
                  "Failed to update order.payment_status on payment failure:",
                  orderUpdateError
               );
            } else {
               console.log(
                  "Order payment_status updated to failed due to payment failure:",
                  payment.order_id
               );
            }
         } else {
            // No order exists yet for this payment; the payments row has been updated above with failed state.
            logger.info("webhook", "Payment marked failed for payments row", {
               paymentId: payment?.id,
            });
         }
      }

      // Return expected response format to KPay
      return NextResponse.json({
         tid: paymentStatus.transactionId,
         refid: paymentStatus.orderReference,
         reply: "OK",
      });
   } catch (error) {
      const duration = Date.now() - startTime;
      logger.webhookError(
         error instanceof Error ? error.message : String(error),
         {
            transactionId,
            orderReference,
            duration,
            stack: error instanceof Error ? error.stack : undefined,
         }
      );

      // Return 500 to trigger KPay retry mechanism
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

// Handle GET requests for webhook verification/health check
export async function GET() {
   return NextResponse.json({
      message: "KPay webhook endpoint is active",
      timestamp: new Date().toISOString(),
   });
}

// Handle other HTTP methods
export async function PUT() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
