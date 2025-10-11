import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { 
   formatRiderInfo, 
   getOrderNumber, 
   formatDeliveryAddress, 
   getStatusDisplayText, 
   createOrderSummary,
   formatCurrency,
   getOrderTotal,
   type NotificationMeta
} from "@/utils/notification-formatters";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // no-op
}
const supabase =
   process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL,
           process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : (null as any);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

   const { recipient_user_id, recipient_role, type, title, body, meta } =
      req.body;
   if (!type) return res.status(400).json({ error: "type required" });

   // Generate meaningful title and body if not provided
   let finalTitle = title;
   let finalBody = body;
   try {
      const metaTyped = meta as NotificationMeta;
      
      // Use meta to enrich messages
      switch (type) {
         case "order_status_update": {
            const orderNumber = getOrderNumber(metaTyped);
            const status = getStatusDisplayText(metaTyped.status || metaTyped.order?.status);
            finalTitle = `Order ${orderNumber} Status Update`;
            finalBody = `Your order is now ${status}.\n\n${createOrderSummary(metaTyped)}`;
            break;
         }
         case "assignment_created": {
            const orderNumber = getOrderNumber(metaTyped);
            const address = formatDeliveryAddress(metaTyped);
            finalTitle = `New Delivery Assignment`;
            finalBody = `You have been assigned to deliver ${orderNumber}${address ? ` to ${address}` : ''}.\n\n${createOrderSummary(metaTyped)}`;
            break;
         }
         case "assignment_accepted": {
            const orderNumber = getOrderNumber(metaTyped);
            // If rider info is present and recipient is a customer (recipient_user_id), craft the customer-facing message
            if (
               metaTyped &&
               (metaTyped.rider_name || metaTyped.rider_phone || metaTyped.rider) &&
               recipient_user_id
            ) {
               finalTitle = finalTitle || `Rider Assigned - ${orderNumber}`;
               const riderInfo = formatRiderInfo(metaTyped);
               const orderSummary = createOrderSummary(metaTyped);
               const address = formatDeliveryAddress(metaTyped);
               
               finalBody = `Your rider is on the way to deliver your order!\n\nRider: ${riderInfo}${address ? `\nDelivering to: ${address}` : ''}\n\n${orderSummary}`;
            } else {
               finalTitle = finalTitle || `Assignment Accepted`;
               finalBody = finalBody || `Assignment accepted for ${orderNumber}.\n\n${createOrderSummary(metaTyped)}`;
            }
            break;
         }
         case "assignment_rejected": {
            const orderNumber = getOrderNumber(metaTyped);
            finalTitle = `Assignment Rejected`;
            finalBody = `You have rejected delivery for ${orderNumber}.\n\n${createOrderSummary(metaTyped)}`;
            break;
         }
         case "order_delivered": {
            const orderNumber = getOrderNumber(metaTyped);
            finalTitle = finalTitle || `Order Delivered - ${orderNumber}`;
            const orderSummary = createOrderSummary(metaTyped);
            const total = getOrderTotal(metaTyped.order, metaTyped.items);
            finalBody = finalBody || `Your order has been delivered successfully!${total > 0 ? `\n\nTotal paid: ${formatCurrency(total)}` : ''}\n\n${orderSummary}\n\nThank you for your order!`;
            break;
         }
         case "refund_requested": {
            const orderNumber = getOrderNumber(metaTyped);
            finalTitle = finalTitle || `Refund Request - ${orderNumber}`;
            finalBody = finalBody || (metaTyped?.details ? metaTyped.details : `A refund has been requested for ${orderNumber}. We will process it within 3-5 business days.\n\n${createOrderSummary(metaTyped)}`);
            break;
         }
         case "refund_approved": {
            const orderNumber = getOrderNumber(metaTyped);
            const total = getOrderTotal(metaTyped.order, metaTyped.items);
            finalTitle = finalTitle || `Refund Approved - ${orderNumber}`;
            finalBody = finalBody || (metaTyped?.details ? metaTyped.details : `Your refund has been approved!${total > 0 ? ` Amount: ${formatCurrency(total)}` : ''}\n\nYou should see the refund in your account within 3-5 business days.\n\n${createOrderSummary(metaTyped)}`);
            break;
         }
         case "promotion": {
            finalTitle = finalTitle || "Special Promotion";
            finalBody = finalBody || (metaTyped?.details ? `Don't miss out on this special offer:\n\n${metaTyped.details}` : "Check out our latest offers and save on your next order!");
            break;
         }
         case "system": {
            finalTitle = finalTitle || "System Notification";
            finalBody = finalBody || (metaTyped?.details ? metaTyped.details : "There is an important system update.");
            break;
         }
         default: {
            finalTitle = finalTitle || "Notification";
            finalBody = finalBody || "You have a new notification.";
         }
      }

      const { data, error } = await supabase
         .from("notifications")
         .insert([
            {
               recipient_user_id: recipient_user_id || null,
               recipient_role: recipient_role || null,
               type,
               title: finalTitle,
               body: finalBody || null,
               meta: meta || null,
            },
         ])
         .select()
         .single();

      if (error) {
         console.error("create notification error", error);
         return res.status(500).json({ error: error.message || error });
      }
      return res.status(200).json({ notification: data });
   } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || err });
   }
}
