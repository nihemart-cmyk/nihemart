import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
      // Use meta to enrich messages
      switch (type) {
         case "order_status_update": {
            const orderNum =
               meta?.order_number ||
               meta?.order?.order_number ||
               meta?.order_id ||
               "";
            const status = meta?.status || meta?.order?.status || "updated";
            finalTitle = `Order ${orderNum} Status Update`;
            finalBody = `Your order status is now: ${status}.`;
            break;
         }
         case "assignment_created": {
            const orderNum =
               meta?.order_number ||
               meta?.order?.order_number ||
               meta?.order_id ||
               "";
            const address =
               meta?.delivery_address || meta?.order?.delivery_address || "";
            finalTitle = `New Delivery Assignment`;
            finalBody = `You have been assigned to deliver order ${orderNum} to ${address}.`;
            break;
         }
         case "assignment_accepted": {
            const orderNum =
               meta?.order_number ||
               meta?.order?.order_number ||
               meta?.order_id ||
               "";
            // If rider info is present and recipient is a customer (recipient_user_id), craft the customer-facing message
            if (
               meta &&
               (meta.rider_name || meta.rider_phone) &&
               recipient_user_id
            ) {
               finalTitle = finalTitle || `Rider on the way`;
               const riderName = meta.rider_name || meta.rider?.name || "Rider";
               const riderPhone =
                  meta.rider_phone || meta.rider?.phone || "No phone provided";
               finalBody = `This rider is going to deliver your order.\n${riderName},\n${riderPhone}`;
            } else {
               finalTitle = finalTitle || `Assignment Accepted`;
               finalBody =
                  finalBody || `Assignment accepted for order ${orderNum}.`;
            }
            break;
         }
         case "assignment_rejected": {
            const orderNum =
               meta?.order_number ||
               meta?.order?.order_number ||
               meta?.order_id ||
               "";
            finalTitle = `Assignment Rejected`;
            finalBody = `You have rejected delivery for order ${orderNum}.`;
            break;
         }
         case "order_delivered": {
            // Customer-facing delivery success message
            finalTitle = finalTitle || "Delivery Success";
            finalBody =
               finalBody ||
               "A rider marked your order as delivered successfully.";
            break;
         }
         case "refund_requested": {
            finalTitle = finalTitle || "Refund Requested";
            finalBody =
               finalBody ||
               (meta?.details
                  ? meta.details
                  : "A refund has been requested. We will process it shortly.");
            break;
         }
         case "refund_approved": {
            finalTitle = finalTitle || "Refund Approved";
            finalBody =
               finalBody ||
               (meta?.details
                  ? meta.details
                  : "Your refund has been approved. .");
            break;
         }
         case "promotion": {
            finalTitle = finalTitle || "Special Promotion";
            finalBody =
               finalBody ||
               (meta?.details
                  ? `Don't miss out: ${meta.details}`
                  : "Check out our latest offers!");
            break;
         }
         case "system": {
            finalTitle = finalTitle || "System Notification";
            finalBody =
               finalBody ||
               (meta?.details ? meta.details : "There is an important update.");
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
