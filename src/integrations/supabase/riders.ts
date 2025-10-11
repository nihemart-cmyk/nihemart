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
   image_url?: string | null;
   location?: string | null;
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
      // Get full order details for notifications
      const { data: order, error: orderErr } = await sb
         .from("orders")
         .select(`
            *,
            items:order_items(*)
         `)
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
         .select("*")
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
      
      // Create notification for the rider about the new assignment
      try {
         const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               recipient_role: "rider",
               type: "assignment_created",
               meta: {
                  order,
                  items: order.items || [],
                  rider_id: riderId,
                  delivery_address: order.delivery_address,
                  order_id: order.id,
                  order_number: order.order_number,
                  assignment_id: data.id,
                  notes: notes || null
               },
            }),
         });
         
         if (!notificationResponse.ok) {
            console.error('Failed to create assignment notification:', await notificationResponse.text());
         }
      } catch (err) {
         console.error('Error creating assignment notification:', err);
      }
      
      // Create notification for the customer about the assignment
      if (order?.user_id) {
         try {
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/create`, {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({
                  recipient_user_id: order.user_id,
                  type: "order_assigned",
                  meta: {
                     order,
                     items: order.items || [],
                     rider_name: riderRow.full_name || riderRow.name || "Delivery Rider",
                     delivery_address: order.delivery_address,
                     order_id: order.id,
                     order_number: order.order_number,
                     assignment_id: data.id
                  },
               }),
            });
            
            if (!notificationResponse.ok) {
               console.error('Failed to create customer assignment notification:', await notificationResponse.text());
            }
         } catch (err) {
            console.error('Error creating customer assignment notification:', err);
         }
      }
      
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
   
   // First, get the assignment with order and rider details for notification
   const { data: assignmentWithDetails, error: assignmentError } = await sb
      .from("order_assignments")
      .select(`
         *,
         orders:orders(
            *,
            items:order_items(*)
         ),
         riders:riders(*)
      `)
      .eq("id", assignmentId)
      .single();
      
   if (assignmentError) throw assignmentError;
   if (!assignmentWithDetails) {
      const err: any = new Error("Assignment not found");
      err.code = "ASSIGNMENT_NOT_FOUND";
      throw err;
   }

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

   const assignment = data as any;
   const order = assignmentWithDetails.orders as any;
   const rider = assignmentWithDetails.riders as any;

   // If accepted/ completed update orders table status accordingly
   if (status === "accepted") {
      // When a rider accepts an assignment the order should move to "processing"
      // (previously it was left as "assigned").
      await sb
         .from("orders")
         .update({ status: "processing" })
         .eq("id", assignment.order_id);

      // Create customer notification with rich content
      if (order?.user_id && rider) {
         try {
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/create`, {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({
                  recipient_user_id: order.user_id,
                  type: "assignment_accepted",
                  meta: {
                     order,
                     items: order.items || [],
                     rider_name: rider.full_name || rider.name || "Delivery Rider",
                     rider_phone: rider.phone,
                     delivery_address: order.delivery_address,
                     order_id: order.id,
                     order_number: order.order_number
                  },
               }),
            });
            
            if (!notificationResponse.ok) {
               console.error('Failed to create assignment accepted notification:', await notificationResponse.text());
            }
         } catch (err) {
            console.error('Error creating assignment accepted notification:', err);
         }
      }
   }
   
   if (status === "completed") {
      await sb
         .from("orders")
         .update({ status: "delivered" })
         .eq("id", assignment.order_id);

      // Create order delivered notification
      if (order?.user_id) {
         try {
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/create`, {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({
                  recipient_user_id: order.user_id,
                  type: "order_delivered",
                  meta: {
                     order,
                     items: order.items || [],
                     delivery_address: order.delivery_address,
                     order_id: order.id,
                     order_number: order.order_number
                  },
               }),
            });
            
            if (!notificationResponse.ok) {
               console.error('Failed to create order delivered notification:', await notificationResponse.text());
            }
         } catch (err) {
            console.error('Error creating order delivered notification:', err);
         }
      }
   }

   if (status === "rejected") {
      // When rider rejects, revert order to pending (or unassigned) so admin can reassign
      await sb
         .from("orders")
         .update({ status: "pending" })
         .eq("id", assignment.order_id);

      // Create rejection notification for admin (optional)
      try {
         const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               recipient_role: "admin",
               type: "assignment_rejected",
               meta: {
                  order,
                  rider_name: rider?.full_name || rider?.name || "Rider",
                  order_id: order?.id,
                  order_number: order?.order_number
               },
            }),
         });
         
         if (!notificationResponse.ok) {
            console.error('Failed to create assignment rejected notification:', await notificationResponse.text());
         }
      } catch (err) {
         console.error('Error creating assignment rejected notification:', err);
      }
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
