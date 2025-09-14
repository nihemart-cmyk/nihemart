import type { NextApiRequest, NextApiResponse } from "next";
import { assignOrderToRider } from "@/integrations/supabase/riders";
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
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   const { orderId, riderId, notes } = req.body;
   if (!orderId || !riderId)
      return res.status(400).json({ error: "orderId and riderId required" });

   try {
      const assignment = await assignOrderToRider(orderId, riderId, notes);
      return res.status(200).json({ assignment });
   } catch (err: any) {
      console.error("assign-order failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to assign order" });
   }
}
