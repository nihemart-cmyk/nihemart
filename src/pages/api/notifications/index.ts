import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // no-op - handler will report error
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

   try {
      if (req.method === "GET") {
         const { userId, role, limit = 50 } = req.query;

         let query = supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(Number(limit));

         if (userId) query = query.eq("recipient_user_id", String(userId));
         if (role) query = query.eq("recipient_role", String(role));

         const { data, error } = await query;
         if (error) {
            console.error("fetch notifications error:", error);
            return res.status(500).json({ error: error.message || error });
         }

         return res.status(200).json({ notifications: data || [] });
      }

      return res.status(405).json({ error: "Method not allowed" });
   } catch (err: any) {
      console.error("notifications handler error", err);
      return res.status(500).json({ error: err.message || err });
   }
}
