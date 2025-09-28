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

   const {
      full_name,
      phone,
      vehicle,
      user_id,
      email,
      password,
      active,
      notes,
   } = req.body;
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

         // Upsert role immediately for the created user
         try {
            const { error: roleErr } = await supabase
               .from("user_roles")
               .upsert([{ user_id: createdUserId, role: "rider" }], {
                  // DB has unique(user_id, role) so target the composite columns
                  onConflict: "user_id,role",
               });
            if (roleErr) console.error("Failed to upsert rider role", roleErr);
         } catch (e) {
            console.error("Error upserting rider role:", e);
         }
      }

      // If a user_id was provided (or created above) ensure a user_roles mapping
      // exists for immediate client-side role detection. This helps the middleware
      // redirect logic run right after sign-in.
      if (createdUserId) {
         try {
            await supabase
               .from("user_roles")
               .upsert([{ user_id: createdUserId, role: "rider" }], {
                  onConflict: "user_id,role",
               });
         } catch (e) {
            console.error(
               "Failed to upsert user_roles for provided user_id:",
               e
            );
         }
      }

      // Ensure a profiles row exists and contains provided metadata (full_name, phone)
      // Use service role client on server so RLS does not block this operation.
      if (createdUserId) {
         try {
            const { error: profileErr } = await supabase
               .from("profiles")
               .upsert(
                  [
                     {
                        id: createdUserId,
                        full_name: full_name || null,
                        phone: phone || null,
                     },
                  ],
                  { onConflict: "id" }
               );
            if (profileErr) {
               console.error(
                  "Failed to upsert profile for new rider user:",
                  profileErr
               );
            }
         } catch (e) {
            console.error("Error upserting profile for new rider user:", e);
         }
      }

      const rider = await createRider({
         full_name,
         phone,
         vehicle,
         user_id: createdUserId,
         active: typeof active === "boolean" ? active : true,
         // allow storing arbitrary notes about the rider
         // @ts-ignore: notes column may exist in schema
         notes: notes || null,
      });

      // For debugging: return any user_roles rows for the createdUserId so callers
      // can see whether the upsert actually created the mapping.
      let roles = null;
      try {
         const { data: rdata, error: rerr } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", createdUserId);
         if (!rerr) roles = rdata;
      } catch (e) {
         // ignore
      }

      return res.status(200).json({ rider, roles });
   } catch (err: any) {
      console.error("create-rider failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to create rider" });
   }
}
