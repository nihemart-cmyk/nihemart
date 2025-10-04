import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do nothing at import time
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
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   try {
      // Aggregate rider earnings from orders.tax for completed (delivered) orders
      // joined via order_assignments. Return a map of riderId -> earnings number.
      const { data, error } = await supabase
         .from("order_assignments")
         .select("rider_id, status, orders:orders(id, status, tax)")
         .order("assigned_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message || error });

      const earnings: Record<string, number> = {};
      (data || []).forEach((row: any) => {
         const rid = row.rider_id;
         const order = row.orders;
         if (!rid || !order) return;
         const delivered =
            order.status === "delivered" || row.status === "completed";
         const fee = Number(order.tax) || 0;
         if (delivered && fee > 0) {
            earnings[rid] = (earnings[rid] || 0) + fee;
         }
      });

      return res.status(200).json({ earnings });
   } catch (err: any) {
      console.error("earnings handler failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
