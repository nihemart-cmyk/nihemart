import { NextRequest, NextResponse } from "next/server";
import {
   initializeKPayService,
   KPayService,
   PAYMENT_METHODS,
} from "@/lib/services/kpay";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

interface RetryRequest {
   orderId: string;
   amount: number;
   customerName: string;
   customerEmail: string;
   customerPhone: string;
   paymentMethod: keyof typeof PAYMENT_METHODS;
   redirectUrl: string;
}

export async function POST(request: NextRequest) {
   let orderId: string | undefined;
   try {
      const body: RetryRequest = await request.json();
      orderId = body.orderId;

      if (!body.orderId || !body.amount || !body.paymentMethod) {
         return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
         );
      }

      const supabase = await createServerSupabaseClient();

      // Fetch the latest payment for this order
      const { data: latestPayment } = await supabase
         .from("payments")
         .select("id, status, client_timeout, created_at")
         .eq("order_id", body.orderId)
         .order("created_at", { ascending: false })
         .limit(1)
         .single();

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
                  error: "Existing payment in progress. Please wait or try after timeout.",
               },
               { status: 409 }
            );
         }
      }

      // Initialize KPay service
      const kpayService = initializeKPayService();

      const orderReference = KPayService.generateOrderReference();
      const formattedPhone = KPayService.formatPhoneNumber(body.customerPhone);

      // Create a new payment record
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
         logger.error("api", "Failed to create retry payment record", {
            orderId: body.orderId,
            error: paymentError?.message,
         });
         return NextResponse.json(
            { error: "Failed to create payment record" },
            { status: 500 }
         );
      }

      // Initiate payment with KPay
      const kpayResponse = await kpayService.initiatePayment({
         amount: body.amount,
         customerName: body.customerName,
         customerEmail: body.customerEmail,
         customerPhone: formattedPhone,
         customerNumber: "",
         paymentMethod: body.paymentMethod,
         orderReference,
         orderDetails: `Order #${body.orderId} retry payment`,
         redirectUrl: body.redirectUrl,
         logoUrl: `${request.nextUrl.origin}/logo.png`,
      });

      // Update payment record with kpay info
      await supabase
         .from("payments")
         .update({
            kpay_transaction_id: kpayResponse.tid,
            kpay_auth_key: kpayResponse.authkey,
            kpay_return_code: kpayResponse.retcode,
            kpay_response: kpayResponse,
            updated_at: new Date().toISOString(),
         })
         .eq("id", payment.id);

      if (kpayResponse.retcode === 0) {
         return NextResponse.json({
            success: true,
            paymentId: payment.id,
            transactionId: kpayResponse.tid,
            checkoutUrl: kpayResponse.url,
            status: "pending",
         });
      }

      // On failure to initiate
      const errorMessage = kpayService.getErrorMessage(kpayResponse.retcode);
      await supabase
         .from("payments")
         .update({
            status: "failed",
            failure_reason: errorMessage,
            updated_at: new Date().toISOString(),
         })
         .eq("id", payment.id);

      return NextResponse.json(
         { success: false, error: errorMessage },
         { status: 400 }
      );
   } catch (error) {
      logger.error("api", "Retry payment failed", {
         orderId,
         error: error instanceof Error ? error.message : String(error),
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
