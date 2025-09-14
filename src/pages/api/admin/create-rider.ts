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

   const { full_name, phone, vehicle, user_id, email, password } = req.body;
   try {
      let createdUserId = user_id || null;

      // If email/password provided, create auth user (service role)
      if (email && password) {
         const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            // allow admin-created rider to sign in immediately
            email_confirm: true,
            user_metadata: { full_name, phone, role: "rider" },
         });
         if (error) {
            console.error("Failed to create auth user for rider", error);
            return res.status(400).json({ error: error.message });
         }
         createdUserId = data.user?.id || createdUserId;

         // Upsert role
         const { error: roleErr } = await supabase
            .from("user_roles")
            .upsert([{ user_id: createdUserId, role: "rider" }], {
               onConflict: "user_id",
            });
         if (roleErr) console.error("Failed to upsert rider role", roleErr);
      }

      const rider = await createRider({
         full_name,
         phone,
         vehicle,
         user_id: createdUserId,
      });
      return res.status(200).json({ rider });
   } catch (err: any) {
      console.error("create-rider failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to create rider" });
   }
}
