import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // avoid throwing at module init
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
   if (!supabase) {
      return res.status(500).json({
         error:
            "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.\n" +
            "For local testing add SUPABASE_SERVICE_ROLE_KEY to your .env.local (get it from Supabase Dashboard > Project Settings > API > Service Key). Do NOT commit the real key.",
      });
   }
   try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
         .from("profiles")
         .select("id, full_name, phone, created_at");

      if (profilesError) {
         console.error("profiles fetch error", profilesError);
         return res.status(500).json({ error: profilesError.message });
      }

      // Run roles, auth users and aggregates in parallel for speed
      const [{ data: roles }, { data: authUsers }, { data: ordersAgg }] =
         await Promise.all([
            supabase.from("user_roles").select("user_id, role"),
            supabase.from("users").select("id, email"),
            // Call RPC that aggregates orders per user (see migration)
            supabase.rpc("get_orders_aggregate_per_user"),
         ] as any);

      const ordersAggAny = (ordersAgg as any) || [];

      const users = (profiles || []).map((p: any) => {
         const role =
            (roles || []).find((r: any) => r.user_id === p.id)?.role || "user";
         const email =
            (authUsers || []).find((a: any) => a.id === p.id)?.email || "";
         const agg = ordersAggAny.find(
            (o: any) => String(o.user_id) === String(p.id)
         ) || {
            order_count: 0,
            total_spend: 0,
         };
         return {
            id: p.id,
            full_name: p.full_name,
            phone: p.phone,
            role,
            email,
            order_count: Number(agg.order_count || 0),
            total_spend: Number(agg.total_spend || 0),
         };
      });

      return res.status(200).json({ users });
   } catch (err: any) {
      console.error("list-users failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to list users" });
   }
}
