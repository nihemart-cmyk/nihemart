import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
   fetchRefundedItems,
   fetchAllOrders,
} from "@/integrations/supabase/orders";

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });

   // Prefer using the service role client on the server when available
   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

   const serviceSupabase =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
         ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
         : null;

   // Helper: verify admin role using either service client or token-based validation
   const ensureAdmin = async () => {
      if (serviceSupabase) return true;

      // Expect Authorization: Bearer <token>
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) return false;

      // Create temporary client to validate token
      if (!SUPABASE_URL) return false;
      const tmp = createClient(SUPABASE_URL, "");
      try {
         const { data: userResp, error: userErr } = await tmp.auth.getUser(
            token as any
         );
         if (userErr || !userResp?.user) return false;
         const userId = userResp.user.id;

         // Check user_roles table for admin role using public client (service key preferred)
         const sb = serviceSupabase || createClient(SUPABASE_URL, "");
         const { data: roles } = await sb
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
         if (!roles || !Array.isArray(roles)) return false;
         return roles.some((r: any) => r.role === "admin");
      } catch (e) {
         console.error("admin check failed", e);
         return false;
      }
   };

   // Enforce admin access
   const isAdmin = await ensureAdmin();
   if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

   try {
      const { page = "1", limit = "20", refundStatus, type } = req.query;
      const p = Math.max(1, Number(page || 1));
      const l = Math.max(1, Math.min(100, Number(limit || 20)));

      if (type === "orders") {
         // Return order-level refunds
         const options: any = {
            filters: {},
            pagination: { page: p, limit: l },
            sort: { column: "refund_requested_at", direction: "desc" },
         };
         if (typeof refundStatus === "string" && refundStatus) {
            options.filters.refund_status = refundStatus;
         } else {
            options.filters.refund_status = undefined;
         }

         const ordersResp = await fetchAllOrders(options);
         let data = ordersResp.data || [];
         if (!refundStatus) {
            data = data.filter(
               (o: any) =>
                  o.refund_status !== null && o.refund_status !== undefined
            );
         }
         res.status(200).json({ data, count: ordersResp.count });
         return;
      }

      const result = await fetchRefundedItems({
         refundStatus:
            typeof refundStatus === "string" ? refundStatus : undefined,
         pagination: { page: p, limit: l },
      });

      res.status(200).json(result);
   } catch (err: any) {
      console.error("refunds API error", err);
      res.status(500).json({ error: err?.message || "Server error" });
   }
}
