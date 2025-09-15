import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createRider } from "@/integrations/supabase/riders";

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
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   const { rows } = req.body || {};
   if (!Array.isArray(rows))
      return res
         .status(400)
         .json({ error: "Invalid payload, expected rows array" });

   const results: any[] = [];

   for (const r of rows) {
      const full_name = r.full_name || r.name || r.fullName || null;
      const phone = r.phone || null;
      const vehicle = r.vehicle || null;
      const email = r.email || null;
      const password = r.password || null;

      try {
         let createdUserId: string | null = null;
         if (email && password) {
            const { data, error } = await supabase.auth.admin.createUser({
               email,
               password,
               email_confirm: true,
               user_metadata: { full_name, phone, role: "rider" },
            });
            if (error) {
               results.push({ row: r, error: error.message });
               continue;
            }
            createdUserId = data.user?.id || null;

            // upsert role
            await supabase
               .from("user_roles")
               .upsert([{ user_id: createdUserId, role: "rider" }], {
                  onConflict: "user_id",
               });
         }

         // Use existing integration to create rider record
         const rider = await createRider({
            full_name,
            phone,
            vehicle,
            user_id: createdUserId,
         });
         results.push({ row: r, rider });
      } catch (err: any) {
         results.push({ row: r, error: err?.message || String(err) });
      }
   }

   return res.status(200).json({ imported: results.length, results });
}
