import type { NextApiRequest, NextApiResponse } from "next";
import { respondToAssignment } from "@/integrations/supabase/riders";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // no-op
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

   const { assignmentId, status } = req.body;
   if (!assignmentId || !status)
      return res
         .status(400)
         .json({ error: "assignmentId and status required" });

   try {
      const resp = await respondToAssignment(assignmentId, status);
      return res.status(200).json({ assignment: resp });
   } catch (err: any) {
      console.error("respond-assignment failed", err);
      return res
         .status(500)
         .json({ error: err.message || "Failed to respond to assignment" });
   }
}
