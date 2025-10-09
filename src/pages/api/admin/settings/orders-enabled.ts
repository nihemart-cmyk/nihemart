import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do not throw during module init; handler will check
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
   if (!supabase) {
      return res.status(500).json({
         error: "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.",
      });
   }

   try {
      if (req.method === "GET") {
         const { data, error } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "orders_enabled")
            .maybeSingle();

         if (error) throw error;
         const val = data?.value;
         // some installations may store boolean directly or as jsonb true/false
         const enabled =
            val === true || String(val) === "true" || (val && val === "true");
         return res.status(200).json({ enabled: Boolean(enabled) });
      }

      if (req.method === "POST") {
         // Expect { enabled: boolean }
         const { enabled } = req.body || {};
         if (typeof enabled !== "boolean") {
            return res.status(400).json({ error: "enabled boolean required" });
         }

         const { error } = await supabase
            .from("site_settings")
            .upsert([{ key: "orders_enabled", value: enabled }], {
               onConflict: "key",
            });

         if (error) throw error;
         return res.status(200).json({ enabled });
      }

      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end("Method Not Allowed");
   } catch (err: any) {
      console.error("orders-enabled handler error:", err);
      res.status(500).json({ error: err?.message || "Unknown error" });
   }
}
