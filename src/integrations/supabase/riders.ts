import { supabase } from "./client";

const sb = supabase as any;

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
   const { data, error } = await sb
      .from("order_assignments")
      .insert([{ order_id: orderId, rider_id: riderId, notes }])
      .select()
      .single();
   if (error) throw error;
   // Optionally update order status to 'assigned'
   await sb.from("orders").update({ status: "assigned" }).eq("id", orderId);
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
      .single();
   if (error) throw error;

   // If accepted/ completed update orders table status accordingly
   if (status === "accepted") {
      // find assignment to get order id
      const assignment = data as any;
      await sb
         .from("orders")
         .update({ status: "assigned" })
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
