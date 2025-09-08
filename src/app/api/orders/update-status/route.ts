import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
   try {
      const { orderId, status } = await req.json();
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      // First verify if the user has admin access
      const {
         data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Update the order status
      const { data, error } = await supabase
         .from("orders")
         .update({ status })
         .eq("id", orderId)
         .select()
         .single();

      if (error) {
         console.error("Error updating order status:", error);
         return NextResponse.json(
            { error: "Failed to update order status" },
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
