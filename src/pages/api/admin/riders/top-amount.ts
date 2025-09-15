import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do nothing
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
      // Aggregate orders by assigned rider and sum totals for delivered or shipped
      const { data, error } = await supabase
         .from("order_assignments")
         .select("rider_id, orders:orders(total, status)")
         .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Sum totals per rider
      const totals: Record<string, number> = {};
      for (const row of (data || []) as any[]) {
         const riderId = row.rider_id;
         const order = row.orders;
         if (!order) continue;
         const status = order.status;
         if (status !== "delivered" && status !== "shipped") continue;
         const amount = Number(order.total || 0);
         totals[riderId] = (totals[riderId] || 0) + amount;
      }

      // Find top rider
      let topRiderId: string | null = null;
      let topAmount = 0;
      for (const k of Object.keys(totals)) {
         if (totals[k] > topAmount) {
            topAmount = totals[k];
            topRiderId = k;
         }
      }

      return res.status(200).json({ topRiderId, topAmount });
   } catch (err: any) {
      console.error("top-amount failed", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
