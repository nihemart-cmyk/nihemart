import { supabase as browserSupabase } from "./client";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { syncUserRole } from "@/utils/syncUserRole";

// Use service role client on the server (API routes) so server-side operations
// are performed with elevated privileges (avoids RLS preventing reads/writes).
const sb = ((): any => {
   try {
      if (
         typeof window === "undefined" &&
         process.env.SUPABASE_SERVICE_ROLE_KEY &&
         process.env.NEXT_PUBLIC_SUPABASE_URL
      ) {
         return createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
         );
      }
   } catch (err) {
      // fall through to browser client
   }
   return browserSupabase as any;
})();

export interface Rider {
   id: string;
   user_id?: string | null;
   full_name?: string | null;
   phone?: string | null;
   vehicle?: string | null;
   active?: boolean;
   created_at?: string;
   updated_at?: string;
}

export async function createRider(payload: Partial<Rider>) {
   const { data, error } = await sb
      .from("riders")
      .insert([payload])
      .select()
      .single();
   if (error) throw error;
   // Ensure that if a rider is tied to an auth user we also create/ensure a
   // corresponding row in `user_roles` and sync the auth user metadata. This
   // ensures the client-side role detection (and redirects) will recognize
   // rider users even if no explicit user_roles row was created elsewhere.
   try {
      const userId = (data as any)?.user_id as string | undefined;
      if (userId) {
         // Upsert the user_roles mapping
         await sb
            .from("user_roles")
            .upsert([{ user_id: userId, role: "rider" }], {
               // match DB unique(user_id, role)
               onConflict: "user_id,role",
            });

         // Sync the role into auth user metadata (best-effort)
         try {
            await syncUserRole(userId);
         } catch (err) {
            console.error("syncUserRole failed:", err);
         }
      }
   } catch (err) {
      console.error("Error ensuring user_roles for rider:", err);
   }

   return data as Rider;
}

export async function fetchRiders(activeOnly = false) {
   let q = sb.from("riders").select("*");
   if (activeOnly) q = q.eq("active", true);
   const { data, error } = await q.order("created_at", { ascending: false });
   if (error) throw error;
   return (data || []) as Rider[];
}

export async function assignOrderToRider(
   orderId: string,
   riderId: string,
   notes?: string
) {
   // Ensure the order is pending before assigning
   try {
      const { data: order, error: orderErr } = await sb
         .from("orders")
         .select("id, status")
         .eq("id", orderId)
         .maybeSingle();
      if (orderErr) throw orderErr;
      if (!order) {
         const e: any = new Error("Order not found");
         e.code = "ORDER_NOT_FOUND";
         throw e;
      }
      if (order.status !== "pending") {
         const e: any = new Error("Only pending orders can be assigned");
         e.code = "ORDER_NOT_PENDING";
         throw e;
      }

      // Ensure rider exists and is active before assigning
      const { data: riderRow, error: riderErr } = await sb
         .from("riders")
         .select("id, active")
         .eq("id", riderId)
         .maybeSingle();
      if (riderErr) throw riderErr;
      if (!riderRow) {
         const e: any = new Error("Rider not found");
         e.code = "RIDER_NOT_FOUND";
         throw e;
      }
      if (riderRow.active === false) {
         const e: any = new Error(
            "Rider is inactive and cannot be assigned orders"
         );
         e.code = "RIDER_INACTIVE";
         throw e;
      }

      const { data, error } = await sb
         .from("order_assignments")
         .insert([{ order_id: orderId, rider_id: riderId, notes }])
         .select()
         .single();
      if (error) {
         throw new Error(error.message || JSON.stringify(error));
      }

      // Update order status to 'assigned'
      await sb.from("orders").update({ status: "assigned" }).eq("id", orderId);
      return data as any;
   } catch (err) {
      // rethrow for caller to handle
      throw err;
   }
}

export async function deleteRider(riderId: string) {
   const { data, error } = await sb
      .from("riders")
      .delete()
      .eq("id", riderId)
      .select()
      .maybeSingle();
   if (error) throw error;
   return data as any;
}

export async function respondToAssignment(
   assignmentId: string,
   status: "accepted" | "rejected" | "completed",
   respondedAt?: string
) {
   const updates: any = {
      status,
      responded_at: respondedAt || new Date().toISOString(),
   };
   const { data, error } = await sb
      .from("order_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .select()
      .maybeSingle();

   // Handle database-level errors
   if (error) throw error;

   // If no row was updated, return a clearer error instead of the PostgREST
   // 'Cannot coerce the result to a single JSON object' message.
   if (!data) {
      const err: any = new Error("Assignment not found or already updated");
      err.code = "ASSIGNMENT_NOT_FOUND";
      throw err;
   }

   // If accepted/ completed update orders table status accordingly
   if (status === "accepted") {
      // find assignment to get order id
      const assignment = data as any;
      // When a rider accepts an assignment the order should move to "processing"
      // (previously it was left as "assigned").
      await sb
         .from("orders")
         .update({ status: "processing" })
         .eq("id", assignment.order_id);
   }
   if (status === "completed") {
      const assignment = data as any;
      await sb
         .from("orders")
         .update({ status: "delivered" })
         .eq("id", assignment.order_id);
   }

   if (status === "rejected") {
      const assignment = data as any;
      // When rider rejects, revert order to pending (or unassigned) so admin can reassign
      await sb
         .from("orders")
         .update({ status: "pending" })
         .eq("id", assignment.order_id);
   }

   return data;
}

export async function getAssignmentsForRider(riderId: string) {
   // Select assignments and join the related order including its items so the frontend
   // can show delivery_address, total and items without extra round trips.
   const { data, error } = await sb
      .from("order_assignments")
      .select("*, orders:orders(*, items:order_items(*))")
      .eq("rider_id", riderId)
      .order("assigned_at", { ascending: false });
   if (error) throw error;
   return data as any[];
}

export async function fetchRiderByUserId(userId: string) {
   const { data, error } = await sb
      .from("riders")
      .select("*")
      .eq("user_id", userId)
      .single();
   if (error) throw error;
   return data as Rider | null;
}

export async function updateRider(riderId: string, updates: Partial<Rider>) {
   const { data, error } = await sb
      .from("riders")
      .update(updates)
      .eq("id", riderId)
      .select()
      .single();
   if (error) throw error;
   return data as Rider;
}
