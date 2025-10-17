import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { createOrder } from "@/integrations/supabase/orders";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const { paymentId, reference, transactionId } = body;

      if (!paymentId && !reference && !transactionId) {
         return NextResponse.json(
            { error: "paymentId, reference or transactionId required" },
            { status: 400 }
         );
      }

      const supabase = await createServerSupabaseClient();

      // Lookup payment
      let query = supabase.from("payments").select("*").limit(1);
      if (paymentId) query = query.eq("id", paymentId);
      else if (transactionId)
         query = query.eq("kpay_transaction_id", transactionId);
      else if (reference) query = query.eq("reference", reference);

      const { data: payment, error: payErr } = await query.maybeSingle();
      if (payErr || !payment) {
         return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
         );
      }

      if (payment.order_id) {
         // idempotent: order already created
         return NextResponse.json({ success: true, orderId: payment.order_id });
      }

      if (payment.status !== "completed") {
         return NextResponse.json(
            { error: "Payment not completed" },
            { status: 409 }
         );
      }

      try {
         const [firstName, ...lastParts] = (payment.customer_name || "").split(
            " "
         );
         const lastName = lastParts.join(" ");

         const orderPayload: any = {
            order: {
               user_id: payment.user_id || null,
               subtotal: payment.amount || 0,
               tax: payment.tax || 0,
               total: payment.amount || 0,
               customer_email: payment.customer_email || null,
               customer_first_name: firstName || null,
               customer_last_name: lastName || null,
               customer_phone: payment.customer_phone || null,
               delivery_address: payment.delivery_address || "",
               delivery_city: payment.delivery_city || null,
               status: "pending",
               payment_method: payment.payment_method || null,
            },
            items: (payment.cart && payment.cart.items) || payment.cart || [],
         };

         const createdOrder = await createOrder(orderPayload);

         const { error: updateErr } = await supabase
            .from("payments")
            .update({
               order_id: createdOrder.id,
               updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

         if (updateErr) {
            logger.error(
               "api",
               "Failed to update payment with order_id",
               updateErr
            );
         }

         return NextResponse.json({ success: true, orderId: createdOrder.id });
      } catch (err: any) {
         console.error("Failed to create order from payment:", err);
         return NextResponse.json(
            { error: "Failed to create order from payment" },
            { status: 500 }
         );
      }
   } catch (error) {
      console.error("create-order error:", error);
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}

export async function GET() {
   return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
