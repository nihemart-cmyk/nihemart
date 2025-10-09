import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
   try {
      const body = await req.json();
      // Accept either { id, status, additionalFields } (client calls) or { orderId, status }
      const id = body?.id || body?.orderId;
      const status = body?.status;
      const additionalFields = body?.additionalFields || {};

      if (!id || !status) {
         return NextResponse.json(
            { error: "Missing id or status" },
            { status: 400 }
         );
      }

      // If a service role key is available, use it to perform privileged update (keeps parity with old pages/api implementation)
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
         const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
         const updates: any = {
            status,
            ...(additionalFields || {}),
            ...(status === "shipped"
               ? { shipped_at: new Date().toISOString() }
               : {}),
            ...(status === "delivered"
               ? { delivered_at: new Date().toISOString() }
               : {}),
         };

         const { data, error } = await sb
            .from("orders")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

         if (error) {
            console.error(
               "Error updating order status with service key:",
               error
            );
            return NextResponse.json(
               { error: error.message || "Failed to update order status" },
               { status: 500 }
            );
         }

         return NextResponse.json(data);
      }

      // Fallback to using the logged in user's session via auth helper
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      const {
         data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data, error } = await supabase
         .from("orders")
         .update({ status, ...additionalFields })
         .eq("id", id)
         .select()
         .single();

      if (error) {
         console.error("Error updating order status:", error);
         return NextResponse.json(
            { error: error.message || "Failed to update order status" },
            { status: 500 }
         );
      }

      return NextResponse.json(data);
   } catch (error) {
      console.error("Error in update-status route:", error);
      return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
      );
   }
}
