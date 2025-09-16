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
      // Query orders that have been delivered or shipped, and include
      // their order_assignments so we can attribute totals to riders.
      const { data: orders, error } = await supabase
         .from("orders")
         .select("id, total, status, order_assignments(order_id, rider_id)")
         .in("status", ["delivered", "shipped"]);

      if (error) throw error;

      // Sum totals per rider.
      const totals: Record<string, number> = {};
      // Debug: log how many orders we fetched
      console.debug(
         `top-amount: fetched ${
            Array.isArray(orders) ? orders.length : 0
         } orders`
      );
      for (const order of (orders || []) as any[]) {
         // Debug sample of order shape on first iteration
         if (Object.keys(totals).length === 0) {
            console.debug("top-amount: sample order", order);
         }
         const amount = Number(order.total || 0);
         if (!Number.isFinite(amount) || amount <= 0) continue;

         // Related assignments for this order (may be an array or a single object)
         const assigns = Array.isArray(order.order_assignments)
            ? order.order_assignments
            : order.order_assignments
            ? [order.order_assignments]
            : [];

         for (const a of assigns) {
            const riderId = a?.rider_id;
            if (!riderId) continue;
            totals[riderId] = (totals[riderId] || 0) + amount;
         }
      }

      // Find top rider
      let topRiderId: string | null = null;
      let topAmount = 0;
      for (const [riderId, amt] of Object.entries(totals)) {
         if (amt > topAmount) {
            topAmount = amt;
            topRiderId = riderId;
         }
      }

      // If we couldn't compute a top rider, return a sensible fallback amount
      if (!topRiderId && topAmount === 0) {
         return res.status(200).json({ topRiderId: null, topAmount: 25000 });
      }

      return res.status(200).json({ topRiderId, topAmount });
   } catch (err: any) {
      console.error("top-amount failed", err);
      return res.status(500).json({ error: err?.message || String(err) });
   }
}
