import { NextRequest, NextResponse } from "next/server";
import { initializeKPayService } from "@/lib/services/kpay";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

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

      // Process the webhook payload
      const paymentStatus = kpayService.processWebhookPayload(payload);
      console.log("Processed payment status:", paymentStatus);

      // Initialize Supabase client
      const supabase = await createServerSupabaseClient();

      // Find the payment record by KPay transaction ID or reference
      const { data: payment, error: findError } = await supabase
         .from("payments")
         .select("id, order_id, status, amount, currency")
         .or(
            `kpay_transaction_id.eq.${paymentStatus.transactionId},reference.eq.${paymentStatus.orderReference}`
         )
         .single();

      if (findError || !payment) {
         console.error("Payment not found for webhook:", {
            transactionId: paymentStatus.transactionId,
            orderReference: paymentStatus.orderReference,
            error: findError,
         });

         // Still return OK to KPay to prevent retries for unknown transactions
         return NextResponse.json({
            tid: paymentStatus.transactionId,
            refid: paymentStatus.orderReference,
            reply: "OK",
         });
      }

      // Don't update if payment is already in final state
      if (payment.status === "completed" || payment.status === "failed") {
         console.log("Payment already in final state:", payment.status);
         return NextResponse.json({
            tid: paymentStatus.transactionId,
            refid: paymentStatus.orderReference,
            reply: "OK",
         });
      }

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
         newPaymentStatus = payment.status;
      }

      // Update payment record
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

      console.log("Payment updated successfully:", {
         paymentId: payment.id,
         orderId: payment.order_id,
         oldStatus: payment.status,
         newStatus: newPaymentStatus,
      });

      // Update only order.payment_status so we don't unintentionally change the order lifecycle here.
      if (paymentStatus.isSuccessful) {
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

         // TODO: Add notification/email sending logic here
         // - Send order confirmation email to customer
         // - Send notification to admin
         // - Update inventory if needed
      }

      if (paymentStatus.isFailed) {
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
