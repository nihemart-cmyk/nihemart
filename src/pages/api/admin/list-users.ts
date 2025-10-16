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
      // Parse pagination params (defaults)
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.max(1, Number(req.query.limit || 50));

      // Run roles, auth users and aggregates in parallel for speed
      const [{ data: profiles }, { data: roles }, { data: authUsers }, { data: ordersAgg }] =
         await Promise.all([
            // fetch profiles (all) so we can union with auth users server-side
            supabase.from("profiles").select("id, full_name, phone, created_at"),
            supabase.from("user_roles").select("user_id, role"),
            supabase.from("users").select("id, email, created_at"),
            // Call RPC that aggregates orders per user (see migration)
            supabase.rpc("get_orders_aggregate_per_user"),
         ] as any);

      const profilesArr = (profiles as any[]) || [];
      const rolesArr = (roles as any[]) || [];
      const authArr = (authUsers as any[]) || [];
      const ordersAggAny = (ordersAgg as any) || [];

      // Create a union map keyed by user id. Profiles take precedence for name/phone
      const byId: Record<string, any> = {};

      for (const p of profilesArr) {
         byId[String(p.id)] = {
            id: p.id,
            full_name: p.full_name,
            phone: p.phone,
            created_at: p.created_at,
            role: "user",
            email: "",
            order_count: 0,
            total_spend: 0,
         };
      }

      for (const a of authArr) {
         const key = String(a.id);
         if (!byId[key]) {
            byId[key] = {
               id: a.id,
               full_name: null,
               phone: null,
               created_at: a.created_at || null,
               role: "user",
               email: a.email || "",
               order_count: 0,
               total_spend: 0,
            };
         } else {
            byId[key].email = a.email || byId[key].email || "";
            // keep profile's created_at if present
            byId[key].created_at = byId[key].created_at || a.created_at || null;
         }
      }

      // Attach roles
      for (const r of rolesArr) {
         const key = String(r.user_id);
         if (!byId[key]) continue;
         byId[key].role = r.role || byId[key].role || "user";
      }

      // Attach order aggregates
      for (const o of ordersAggAny) {
         const key = String(o.user_id);
         if (!byId[key]) continue;
         byId[key].order_count = Number(o.order_count || 0);
         byId[key].total_spend = Number(o.total_spend || 0);
      }

      // Convert to array and sort by created_at descending if available
      const usersArr = Object.values(byId).map((u: any) => ({
         id: u.id,
         full_name: u.full_name,
         phone: u.phone,
         role: u.role || "user",
         email: u.email || "",
         order_count: Number(u.order_count || 0),
         total_spend: Number(u.total_spend || 0),
         created_at: u.created_at || null,
      }));

      usersArr.sort((a: any, b: any) => {
         const ta = a.created_at ? Date.parse(String(a.created_at)) : 0;
         const tb = b.created_at ? Date.parse(String(b.created_at)) : 0;
         return tb - ta;
      });

      const totalCount = usersArr.length;
      const start = (page - 1) * limit;
      const paginated = usersArr.slice(start, start + limit);

      return res.status(200).json({ users: paginated, count: totalCount, page, limit });
   } catch (err: any) {
      console.error("list-users failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to list users" });
   }
}
