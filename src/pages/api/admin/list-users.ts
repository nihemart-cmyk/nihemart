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
   if (req.method !== "GET")
      return res.status(405).json({ error: "Method not allowed" });
   const { data, error } = await supabase.auth.admin.listUsers();
   if (error) return res.status(400).json({ error: error.message });
   // Return only id and email for privacy
   const users = data.users.map((u: any) => ({ id: u.id, email: u.email }));
   res.status(200).json({ users });
}
