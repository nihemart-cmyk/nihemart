import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   const { email, password, fullName, phone, role } = req.body;
   if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
   // Create user in auth.users
   const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName, phone, role },
   });
   if (error) return res.status(400).json({ error: error.message });
   // Optionally, insert into user_roles
   if (role) {
      await supabase
         .from("user_roles")
         .upsert([{ user_id: data.user?.id, role }], {
            onConflict: "user_id",
         });
   }
   res.status(200).json({ user: data.user });
}
