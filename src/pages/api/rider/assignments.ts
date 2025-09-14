import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // Handler will return error if env missing
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

   const riderId = String(req.query.riderId || "");
   if (!riderId) return res.status(400).json({ error: "riderId is required" });

   try {
      const { data, error } = await supabase
         .from("order_assignments")
         .select("*, orders:orders(*, items:order_items(*))")
         .eq("rider_id", riderId)
         .order("assigned_at", { ascending: false });

      if (error) {
         console.error("Error fetching assignments (service):", error);
         return res.status(500).json({ error: error.message || error });
      }

      return res.status(200).json({ assignments: data || [] });
   } catch (err: any) {
      console.error("assignments handler failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
