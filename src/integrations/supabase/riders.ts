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

// Client-side guard: prevent rapid repeated POSTs for the same target+order+type
// This reduces request storms from UI interactions (per-page in-memory throttle).
const _recentNotificationSends: Map<string, number> = new Map();
const _NOTIF_THROTTLE_MS = 10_000; // 10s

// Helper: create notification using RPC when running on server, or POST to
// server API when running in the browser (to ensure service-role insertion).
async function createNotification(params: {
   p_recipient_user_id: any;
   p_recipient_role: any;
   p_type: any;
   p_title: any;
   p_body: any;
   p_meta: any;
}) {
   const {
      p_recipient_user_id,
      p_recipient_role,
      p_type,
      p_title,
      p_body,
      p_meta,
   } = params;

   if (typeof window === "undefined") {
      // Server: use RPC (sb should be server client when running on server)
      try {
         return await sb.rpc("insert_notification", {
            p_recipient_user_id: p_recipient_user_id || null,
            p_recipient_role: p_recipient_role || null,
            p_type,
            p_title: p_title || null,
            p_body: p_body || null,
            p_meta:
               typeof p_meta === "string"
                  ? p_meta
                  : JSON.stringify(p_meta || null),
         });
      } catch (e) {
         console.warn("createNotification RPC failed:", e);
      }
   } else {
      // Browser: POST to server API which uses service role key
      try {
         let metaObj = p_meta;
         if (typeof p_meta === "string") {
            try {
               metaObj = JSON.parse(p_meta);
            } catch (e) {
               metaObj = p_meta;
            }
         }
         try {
            const orderId = metaObj?.order_id || metaObj?.order?.id || null;
            const key = `${p_recipient_user_id || ""}|${
               p_recipient_role || ""
            }|${p_type || ""}|${orderId || ""}`;
            const last = _recentNotificationSends.get(key) || 0;
            const now = Date.now();
            if (now - last < _NOTIF_THROTTLE_MS) {
               // Skip creating duplicate notification too frequently
               // eslint-disable-next-line no-console
               console.debug(
                  "Throttling duplicate notification POST for key:",
                  key
               );
               return;
            }
            _recentNotificationSends.set(key, now);
            setTimeout(
               () => _recentNotificationSends.delete(key),
               _NOTIF_THROTTLE_MS + 1000
            );
         } catch (e) {}
         await fetch("/api/notifications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               recipient_user_id: p_recipient_user_id || null,
               recipient_role: p_recipient_role || null,
               type: p_type,
               title: p_title || null,
               body: p_body || null,
               meta: metaObj || null,
            }),
         });
      } catch (e) {
         console.warn("createNotification POST failed:", e);
      }
   }
}

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
         .select(
            `
            *,
            items:order_items(*)
         `
         )
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

      // The DB trigger on `order_assignments` creates notifications for the assigned rider.
      // We create admin and customer notifications here with richer content.

      // Create notification for the customer about the assignment
      if (order?.user_id) {
         try {
            await createNotification({
               p_recipient_user_id: order.user_id,
               p_recipient_role: "user",
               p_type: "order_assigned",
               p_title: null,
               p_body: null,
               p_meta: {
                  order,
                  items: order.items || [],
                  rider_name:
                     riderRow.full_name || riderRow.name || "Delivery Rider",
                  delivery_address: order.delivery_address,
                  order_id: order.id,
                  order_number: order.order_number,
                  assignment_id: data.id,
               },
            });
         } catch (err) {
            console.error(
               "Error creating customer assignment notification:",
               err
            );
         }
      }

      // Create admin notification for assignment
      try {
         await createNotification({
            p_recipient_user_id: null,
            p_recipient_role: "admin",
            p_type: "assignment_created",
            p_title: null,
            p_body: null,
            p_meta: {
               order,
               items: order.items || [],
               rider_name:
                  riderRow.full_name || riderRow.name || "Delivery Rider",
               rider_id: riderId,
               delivery_address: order.delivery_address,
               order_id: order.id,
               order_number: order.order_number,
               assignment_id: data.id,
            },
         });
      } catch (err) {
         console.error("Error creating admin assignment notification:", err);
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
      .select(
         `
         *,
         orders:orders(
            *,
            items:order_items(*)
         ),
         riders:riders(*)
      `
      )
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

   if (error) throw error;

   if (!data) {
      const err: any = new Error("Assignment not found or already updated");
      err.code = "ASSIGNMENT_NOT_FOUND";
      throw err;
   }

   const assignment = data as any;
   const order = assignmentWithDetails.orders as any;
   const rider = assignmentWithDetails.riders as any;

   // ACCEPTED: Update order to processing and notify customer + admin
   if (status === "accepted") {
      await sb
         .from("orders")
         .update({ status: "processing" })
         .eq("id", assignment.order_id);

      // CRITICAL: Customer notification with proper title and body
      if (order?.user_id && rider) {
         const riderName = rider.full_name || rider.name || "Delivery Rider";
         const orderNumber = order.order_number || `#${order.id.substring(0, 8)}`;
         
         try {
            await createNotification({
               p_recipient_user_id: order.user_id,
               p_recipient_role: "user", // Explicit role for customer
               p_type: "assignment_accepted",
               p_title: `${riderName} is delivering your order`,
               p_body: `${riderName} has accepted delivery of order ${orderNumber}${rider.phone ? `. Contact: ${rider.phone}` : ''}`,
               p_meta: {
                  order_id: order.id,
                  order_number: order.order_number,
                  assignment_id: assignment.id,
                  rider_id: rider.id,
                  rider_name: riderName,
                  rider_phone: rider.phone,
                  delivery_address: order.delivery_address,
                  order,
                  items: order.items || [],
               },
            });
            console.log('✓ Customer notification created for assignment acceptance:', {
               userId: order.user_id,
               orderId: order.id,
               riderName
            });
         } catch (err) {
            console.error("❌ Failed to create customer notification for assignment acceptance:", err);
         }
      } else {
         console.warn("⚠️ Cannot create customer notification - missing user_id or rider:", {
            hasUserId: !!order?.user_id,
            hasRider: !!rider
         });
      }

      // Admin notification
      try {
         const riderName = rider.full_name || rider.name || "Delivery Rider";
         const orderNumber = order.order_number || `#${order.id.substring(0, 8)}`;
         
         await createNotification({
            p_recipient_user_id: null,
            p_recipient_role: "admin",
            p_type: "assignment_accepted",
            p_title: `${riderName} accepted order ${orderNumber}`,
            p_body: `Delivery to ${order.delivery_city || 'customer'} - ${order.delivery_address || 'address pending'}`,
            p_meta: {
               order_id: order.id,
               order_number: order.order_number,
               assignment_id: assignment.id,
               rider_id: rider.id,
               rider_name: riderName,
               delivery_address: order.delivery_address,
               order,
               items: order.items || [],
            },
         });
         console.log('✓ Admin notification created for assignment acceptance');
      } catch (err) {
         console.error("❌ Failed to create admin notification for assignment acceptance:", err);
      }
   }

   // COMPLETED: Mark order as delivered and notify customer
   if (status === "completed") {
      try {
         const { updateOrderStatus } = await import("./orders");
         await updateOrderStatus(assignment.order_id, "delivered");
      } catch (err) {
         console.error("Failed to update order status via updateOrderStatus:", err);
         await sb
            .from("orders")
            .update({ status: "delivered" })
            .eq("id", assignment.order_id);
      }

      // Customer notification for delivery
      if (order?.user_id) {
         const orderNumber = order.order_number || `#${order.id.substring(0, 8)}`;
         
         try {
            await createNotification({
               p_recipient_user_id: order.user_id,
               p_recipient_role: "user",
               p_type: "order_delivered",
               p_title: `Order ${orderNumber} delivered successfully`,
               p_body: `Your order has been delivered to ${order.delivery_address || 'your address'}. Thank you for your order!`,
               p_meta: {
                  order_id: order.id,
                  order_number: order.order_number,
                  delivery_address: order.delivery_address,
                  order,
                  items: order.items || [],
               },
            });
            console.log('✓ Customer notification created for order delivery');
         } catch (err) {
            console.error("❌ Failed to create customer delivery notification:", err);
         }
      }
   }

   // REJECTED: Revert order to pending and notify admin
   if (status === "rejected") {
      await sb
         .from("orders")
         .update({ status: "pending" })
         .eq("id", assignment.order_id);

      if (rider) {
         const riderName = rider.full_name || rider.name || "Delivery Rider";
         const orderNumber = order.order_number || `#${order.id.substring(0, 8)}`;
         
         try {
            await createNotification({
               p_recipient_user_id: null,
               p_recipient_role: "admin",
               p_type: "assignment_rejected",
               p_title: `${riderName} rejected order ${orderNumber}`,
               p_body: `Order needs reassignment - ${order.delivery_city || 'delivery location'}`,
               p_meta: {
                  order_id: order.id,
                  order_number: order.order_number,
                  assignment_id: assignment.id,
                  rider_id: rider.id,
                  rider_name: riderName,
                  delivery_address: order.delivery_address,
                  order,
                  items: order.items || [],
               },
            });
         
         } catch (err) {
            console.error("❌ Failed to create admin rejection notification:", err);
         }
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
