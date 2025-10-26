// Request a refund for an order item (customer)
export async function requestRefundForItem(itemId: string, reason: string) {
   const { data: existing, error: fetchError } = await sb
      .from("order_items")
      .select("id, order_id, product_name, price, quantity, created_at")
      .eq("id", itemId)
      .maybeSingle();

   if (fetchError) throw fetchError;
   if (!existing) throw new Error("Order item not found or inaccessible");

   const now = new Date().toISOString();
   const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

   // Optional: enforce that refund requests are only allowed within 24 hours of delivery.
   // If order delivery timestamp exists on the parent order, ensure current time is within 24h of delivered_at.
   let parentOrder: any = null;
   try {
      const { data } = await sb
         .from("orders")
         .select(
            "delivered_at, customer_first_name, customer_last_name, delivery_city"
         )
         .eq("id", existing.order_id)
         .maybeSingle();
      parentOrder = data;
      if (parentOrder?.delivered_at) {
         const deliveredAt = new Date(parentOrder.delivered_at).getTime();
         const nowTs = Date.now();
         if (nowTs - deliveredAt > 24 * 60 * 60 * 1000) {
            const e: any = new Error(
               "Refund period has expired (24 hours after delivery)"
            );
            e.code = "REFUND_EXPIRED";
            throw e;
         }
      }
   } catch (err) {
      if ((err as any).code === "REFUND_EXPIRED") throw err;
      // ignore other errors fetching order
   }

   // If parent order was not delivered -> this is a client-side reject and should be final
   const isReject = !parentOrder?.delivered_at;

   const updatePayload: any = isReject
      ? {
           refund_requested: false,
           refund_reason: reason,
           refund_status: "rejected",
           refund_requested_at: now,
        }
      : {
           refund_requested: true,
           refund_reason: reason,
           refund_status: "requested",
           refund_requested_at: now,
           refund_expires_at: expiresAt,
        };

   const { data, error } = await sb
      .from("order_items")
      .update(updatePayload)
      .eq("id", itemId)
      .select()
      .maybeSingle();

   if (error) throw error;
   if (!data) throw new Error("Failed to request refund for order item");

   // Determine whether this is a refund (delivered) or a reject (not delivered)
   const mode: "refund" | "reject" = parentOrder?.delivered_at
      ? "refund"
      : "reject";

   // Notify admins only for refund requests (delivered -> refund). For client-side
   // rejects (not delivered) the action is final and we don't create an admin review notification.
   try {
      if (!isReject) {
         const customerName =
            `${parentOrder?.customer_first_name || ""} ${
               parentOrder?.customer_last_name || ""
            }`.trim() || "Customer";
         const city = parentOrder?.delivery_city || "";
         const title = "Refund requested";
         const p_type = "refund_requested";
         const body = `${customerName}${
            city ? ` from ${city}` : ""
         } requested a refund for ${existing.product_name}. Reason: ${reason}`;
         await createNotification({
            p_recipient_user_id: null,
            p_recipient_role: "admin",
            p_type,
            p_title: title,
            p_body: body,
            p_meta: JSON.stringify({
               order_id: existing.order_id,
               item_id: existing.id,
               reason,
               mode: "refund",
            }),
         });
      }
   } catch (err) {
      console.warn(
         "Failed to insert admin notification for refund request:",
         err
      );
   }

   // Attach mode so client hooks can show correct toasts/labels without extra queries
   try {
      if (data) (data as any)._mode = mode;
   } catch (e) {}
   return data;
}

// Request a full-order refund (customer)
export async function requestRefundForOrder(orderId: string, reason: string) {
   const { data: existing, error: fetchError } = await sb
      .from("orders")
      .select(
         "id, delivered_at, customer_first_name, customer_last_name, delivery_city, user_id, order_number"
      )
      .eq("id", orderId)
      .maybeSingle();

   if (fetchError) throw fetchError;
   if (!existing) throw new Error("Order not found or inaccessible");

   const now = new Date().toISOString();
   const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

   if (existing?.delivered_at) {
      const deliveredAt = new Date(existing.delivered_at).getTime();
      const nowTs = Date.now();
      if (nowTs - deliveredAt > 24 * 60 * 60 * 1000) {
         const e: any = new Error(
            "Refund period has expired (24 hours after delivery)"
         );
         e.code = "REFUND_EXPIRED";
         throw e;
      }
   }

   // If order was not delivered, treat this as a client-side reject and mark final
   const isRejectOrder = !existing?.delivered_at;
   const updatePayloadOrder: any = isRejectOrder
      ? {
           refund_requested: false,
           refund_reason: reason,
           refund_status: "rejected",
           refund_requested_at: now,
        }
      : {
           refund_requested: true,
           refund_reason: reason,
           refund_status: "requested",
           refund_requested_at: now,
           refund_expires_at: expiresAt,
        };

   const { data, error } = await sb
      .from("orders")
      .update(updatePayloadOrder)
      .eq("id", orderId)
      .select()
      .maybeSingle();

   if (error) throw error;
   if (!data) throw new Error("Failed to request full-order refund");

   // Determine mode for order-level (delivered => refund, otherwise reject)
   const mode: "refund" | "reject" = existing?.delivered_at
      ? "refund"
      : "reject";

   const isReject = mode === "reject";

   // Notify admins only for refunds. If this is a client-side reject (not delivered)
   // treat the action as final and do not create an admin review notification.
   try {
      if (!isReject) {
         const customerName =
            `${existing?.customer_first_name || ""} ${
               existing?.customer_last_name || ""
            }`.trim() || "Customer";
         const city = existing?.delivery_city || "";
         const title = "Full order refund requested";
         const p_type = "refund_requested";
         const body = `${customerName}${
            city ? ` from ${city}` : ""
         } requested a refund for order ${
            existing.order_number || existing.id
         }. Reason: ${reason}`;
         await createNotification({
            p_recipient_user_id: null,
            p_recipient_role: "admin",
            p_type,
            p_title: title,
            p_body: body,
            p_meta: JSON.stringify({
               order_id: existing.id,
               reason,
               mode: "refund",
            }),
         });
      }
   } catch (err) {
      console.warn(
         "Failed to insert admin notification for full-order refund request:",
         err
      );
   }

   try {
      if (data) (data as any)._mode = mode;
   } catch (e) {}
   return data;
}

// Cancel full-order refund request (customer)
export async function cancelRefundRequestForOrder(orderId: string) {
   const { data: existing, error: fetchError } = await sb
      .from("orders")
      .select("id, refund_status")
      .eq("id", orderId)
      .maybeSingle();

   if (fetchError) throw fetchError;
   if (!existing) throw new Error("Order not found or inaccessible");

   if (existing.refund_status !== "requested") {
      const e: any = new Error(
         "Refund cannot be cancelled in its current state"
      );
      e.code = "INVALID_REFUND_STATE";
      throw e;
   }

   const { data, error } = await sb
      .from("orders")
      .update({
         refund_requested: false,
         refund_reason: null,
         refund_status: "cancelled",
         refund_requested_at: null,
      })
      .eq("id", orderId)
      .select()
      .maybeSingle();

   if (error) throw error;
   return data;
}

// Cancel a refund request (customer)
export async function cancelRefundRequestForItem(itemId: string) {
   const { data: existing, error: fetchError } = await sb
      .from("order_items")
      .select("id, refund_status")
      .eq("id", itemId)
      .maybeSingle();

   if (fetchError) throw fetchError;
   if (!existing) throw new Error("Order item not found or inaccessible");

   // Only allow cancel when in requested state
   if (existing.refund_status !== "requested") {
      const e: any = new Error(
         "Refund cannot be cancelled in its current state"
      );
      e.code = "INVALID_REFUND_STATE";
      throw e;
   }

   const { data, error } = await sb
      .from("order_items")
      .update({
         refund_requested: false,
         refund_reason: null,
         refund_status: "cancelled",
         refund_requested_at: null,
      })
      .eq("id", itemId)
      .select()
      .maybeSingle();

   if (error) throw error;

   return data;
}

// Admin responds to a refund request: approve or reject
export async function respondToRefundRequest(
   itemId: string,
   approve: boolean,
   adminNote?: string
) {
   // Fetch existing and parent order info to determine whether this was a refund
   // (delivered) or a reject (not delivered)
   const { data: existing, error: fetchError } = await sb
      .from("order_items")
      .select(
         "id, order_id, refund_status, product_name, price, quantity, product_id, product_variation_id"
      )
      .eq("id", itemId)
      .maybeSingle();

   if (fetchError) throw fetchError;
   if (!existing) throw new Error("Order item not found");

   if (existing.refund_status !== "requested") {
      const e: any = new Error(
         "Refund is not in a state that can be responded to"
      );
      e.code = "INVALID_REFUND_STATE";
      throw e;
   }

   const newStatus = approve ? "approved" : "rejected";
   const updates: any = { refund_status: newStatus };
   if (!approve) updates.refund_reason = existing.refund_reason || null;

   const { data, error } = await sb
      .from("order_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .maybeSingle();

   if (error) throw error;
   // Determine mode by looking up parent order delivered_at
   let parentOrder: any = null;
   try {
      const { data: po } = await sb
         .from("orders")
         .select("delivered_at, subtotal, tax, total")
         .eq("id", existing.order_id)
         .maybeSingle();
      parentOrder = po;
   } catch (e) {
      // ignore
   }

   const mode: "refund" | "reject" = parentOrder?.delivered_at
      ? "refund"
      : "reject";

   // If approved, process approval: restock and adjust parent order totals
   if (approve) {
      try {
         const qty = Number(existing.quantity || 0);
         if (qty > 0) {
            if (existing.product_variation_id) {
               const { data: varRow, error: varErr } = await sb
                  .from("product_variations")
                  .select("id, stock")
                  .eq("id", existing.product_variation_id)
                  .maybeSingle();
               if (varErr) {
                  console.warn(
                     "Failed to fetch product_variation for restock:",
                     varErr
                  );
               } else if (varRow && typeof varRow.stock === "number") {
                  const newStock = Number(varRow.stock) + qty;
                  const { error: uErr } = await sb
                     .from("product_variations")
                     .update({ stock: newStock })
                     .eq("id", existing.product_variation_id);
                  if (uErr)
                     console.warn(
                        "Failed to update product_variation stock on restock:",
                        uErr
                     );
               }
            } else if (existing.product_id) {
               const { data: pRow, error: pErr } = await sb
                  .from("products")
                  .select("id, stock, track_quantity")
                  .eq("id", existing.product_id)
                  .maybeSingle();
               if (pErr) {
                  console.warn("Failed to fetch product for restock:", pErr);
               } else if (
                  pRow &&
                  pRow.track_quantity &&
                  typeof pRow.stock === "number"
               ) {
                  const newStock = Number(pRow.stock) + qty;
                  const { error: upErr } = await sb
                     .from("products")
                     .update({ stock: newStock })
                     .eq("id", existing.product_id);
                  if (upErr)
                     console.warn(
                        "Failed to update product stock on restock:",
                        upErr
                     );
               }
            }
         }
      } catch (restockErr) {
         console.warn("Error restoring stock for refunded item:", restockErr);
      }
      // Adjust parent order totals by subtracting the item's total (price * qty)
      try {
         const itemTotal =
            Number(existing.price || 0) * Number(existing.quantity || 0);
         if (parentOrder) {
            const newSubtotal = Math.max(
               0,
               Number(parentOrder.subtotal || 0) - itemTotal
            );
            // naive total adjustment: subtract itemTotal as well
            const newTotal = Math.max(
               0,
               Number(parentOrder.total || 0) - itemTotal
            );
            const upd: any = { subtotal: newSubtotal, total: newTotal };
            // If mode is refund and all items are refunded, set status to 'refunded'
            try {
               const { data: siblingItems, error: siblingErr } = await sb
                  .from("order_items")
                  .select("refund_status")
                  .eq("order_id", existing.order_id);
               if (!siblingErr && Array.isArray(siblingItems)) {
                  const allProcessed = siblingItems.every(
                     (it: any) =>
                        it.refund_status === "approved" ||
                        it.refund_status === "refunded"
                  );
                  if (allProcessed) {
                     upd.status = mode === "refund" ? "refunded" : "cancelled";
                  }
               }
            } catch (e) {}

            try {
               const { error: orderUpdErr } = await sb
                  .from("orders")
                  .update(upd)
                  .eq("id", existing.order_id);
               if (orderUpdErr)
                  console.warn("Failed to update order totals:", orderUpdErr);
            } catch (e) {
               console.warn("Failed to update order totals:", e);
            }
         }

         // notify user with correct type based on mode
         try {
            const { data: orderData } = await sb
               .from("orders")
               .select("user_id")
               .eq("id", existing.order_id)
               .maybeSingle();
            const recipientUserId = orderData?.user_id || null;
            // Use unified refund notification types (reject flows are client-final)
            const p_type = "refund_approved";
            const p_title = "Refund approved";
            const p_body = `Your refund request for item ${existing.product_name} has been approved.`;
            await createNotification({
               p_recipient_user_id: recipientUserId,
               p_recipient_role: null,
               p_type,
               p_title,
               p_body,
               p_meta: JSON.stringify({
                  order_id: existing.order_id,
                  item_id: existing.id,
               }),
            });
         } catch (err) {
            console.warn("Failed to create notification for approval:", err);
         }
      } catch (chkErr) {
         console.warn("Failed to adjust order after approval:", chkErr);
      }
   }

   // If admin rejected the request (deny), notify user of denial with appropriate type
   if (!approve) {
      try {
         const { data: orderData } = await sb
            .from("orders")
            .select("user_id")
            .eq("id", existing.order_id)
            .maybeSingle();
         const recipientUserId = orderData?.user_id || null;
         // Use unified refund rejected notification type
         const p_type = "refund_rejected";
         const p_title = "Refund request rejected";
         const p_body = `Your refund request for item ${existing.product_name} has been rejected by admin.`;
         await createNotification({
            p_recipient_user_id: recipientUserId,
            p_recipient_role: null,
            p_type,
            p_title,
            p_body,
            p_meta: JSON.stringify({
               order_id: existing.order_id,
               item_id: existing.id,
            }),
         });
      } catch (err) {
         console.warn("Failed to notify user about rejection:", err);
      }
   }

   return data;
}

// Admin responds to a full-order refund request
export async function respondToOrderRefundRequest(
   orderId: string,
   approve: boolean,
   adminNote?: string
) {
   const { data: existing, error: fetchError } = await sb
      .from("orders")
      .select("id, user_id, order_number, refund_status, refund_reason")
      .eq("id", orderId)
      .maybeSingle();

   if (fetchError) throw fetchError;
   if (!existing) throw new Error("Order not found");

   if (existing.refund_status !== "requested") {
      const e: any = new Error(
         "Refund is not in a state that can be responded to"
      );
      e.code = "INVALID_REFUND_STATE";
      throw e;
   }

   const newStatus = approve ? "approved" : "rejected";
   const updates: any = { refund_status: newStatus };

   const { data, error } = await sb
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select()
      .maybeSingle();

   if (error) throw error;

   if (approve) {
      try {
         // Restock all items that are not already approved/refunded
         const { data: items, error: itemsErr } = await sb
            .from("order_items")
            .select(
               "id, quantity, product_id, product_variation_id, refund_status"
            )
            .eq("order_id", orderId);
         if (itemsErr) {
            console.warn("Failed to fetch order items for restock:", itemsErr);
         } else if (Array.isArray(items) && items.length) {
            await Promise.all(
               items.map(async (it: any) => {
                  try {
                     const qty = Number(it.quantity || 0);
                     if (!qty || qty <= 0) return;
                     if (
                        it.refund_status === "approved" ||
                        it.refund_status === "refunded"
                     )
                        return;

                     if (it.product_variation_id) {
                        const { data: varRow, error: varErr } = await sb
                           .from("product_variations")
                           .select("id, stock")
                           .eq("id", it.product_variation_id)
                           .maybeSingle();
                        if (varErr) {
                           console.warn(
                              "Failed to fetch variation for restock:",
                              varErr
                           );
                        } else if (varRow && typeof varRow.stock === "number") {
                           const newStock = Number(varRow.stock) + qty;
                           const { error: uErr } = await sb
                              .from("product_variations")
                              .update({ stock: newStock })
                              .eq("id", it.product_variation_id);
                           if (uErr)
                              console.warn(
                                 "Failed to update variation stock:",
                                 uErr
                              );
                        }
                        return;
                     }

                     if (it.product_id) {
                        const { data: pRow, error: pErr } = await sb
                           .from("products")
                           .select("id, stock, track_quantity")
                           .eq("id", it.product_id)
                           .maybeSingle();
                        if (pErr) {
                           console.warn(
                              "Failed to fetch product for restock:",
                              pErr
                           );
                        } else if (
                           pRow &&
                           pRow.track_quantity &&
                           typeof pRow.stock === "number"
                        ) {
                           const newStock = Number(pRow.stock) + qty;
                           const { error: upErr } = await sb
                              .from("products")
                              .update({ stock: newStock })
                              .eq("id", it.product_id);
                           if (upErr)
                              console.warn(
                                 "Failed to update product stock:",
                                 upErr
                              );
                        }
                     }
                  } catch (innerErr) {
                     console.warn(
                        "Error restocking item for order refund:",
                        innerErr
                     );
                  }
               })
            );

            // mark items as approved/refunded
            try {
               const { error: updErr } = await sb
                  .from("order_items")
                  .update({ refund_status: "approved", refund_requested: true })
                  .eq("order_id", orderId)
                  .neq("refund_status", "approved");
               if (updErr)
                  console.warn(
                     "Failed to mark order items as approved:",
                     updErr
                  );
            } catch (updEx) {
               console.warn(
                  "Failed to mark items approved after restock:",
                  updEx
               );
            }
         }

         const recipientUserId = existing.user_id || null;
         await createNotification({
            p_recipient_user_id: recipientUserId,
            p_recipient_role: null,
            p_type: "refund_approved",
            p_title: "Refund approved",
            p_body: `Your refund request for order ${
               existing.order_number || existing.id
            } has been approved. .`,
            p_meta: { order_id: existing.id },
         });
      } catch (err) {
         console.warn(
            "Failed to process restock/notification for order refund approval:",
            err
         );
      }

      // After successful approval, mark the parent order as refunded so UI shows
      // the correct overall order status.
      try {
         const { error: orderUpdErr } = await sb
            .from("orders")
            .update({ status: "refunded" })
            .eq("id", orderId);
         if (orderUpdErr)
            console.warn("Failed to mark order as refunded:", orderUpdErr);
      } catch (oErr) {
         console.warn("Failed to update order status to refunded:", oErr);
      }
   }

   // Return an up-to-date order row (including items) so callers can merge into cache
   try {
      const { data: freshOrder, error: freshErr } = await sb
         .from("orders")
         .select("*, items:order_items(*)")
         .eq("id", orderId)
         .maybeSingle();
      if (freshErr) {
         // If we couldn't fetch fresh order, fall back to returning the original update
         return data;
      }
      return freshOrder;
   } catch (fetchErr) {
      return data;
   }
}
import { supabase as browserSupabase } from "./client";
import { createClient as createServerClient } from "@supabase/supabase-js";
import {
   Order,
   OrderBase,
   OrderItem,
   OrderItemInput,
   OrderStatus,
   OrderFilters,
   OrderQueryOptions,
   CreateOrderRequest,
} from "@/types/orders";

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
      // fall back to browser client
   }
   return browserSupabase as any;
})();

// Client-side guard: prevent rapid repeated POSTs for the same target+order+type
// This is an in-memory throttle (per-page). It reduces request storms from UI
// interactions like double-clicks or overlapping producers.
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
   // Default recipient role: if a recipient_user_id is supplied but no explicit
   // recipient_role was passed, assume this is a customer/user notification.
   const final_recipient_role =
      p_recipient_role || (p_recipient_user_id ? "user" : null);

   if (typeof window === "undefined") {
      // Server: use RPC (sb should be server client when running on server)
      try {
         return await sb.rpc("insert_notification", {
            p_recipient_user_id: p_recipient_user_id || null,
            p_recipient_role: final_recipient_role || null,
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
         // Build a lightweight dedupe key: recipient|role|type|orderId
         try {
            const orderId = metaObj?.order_id || metaObj?.order?.id || null;
            const key = `${p_recipient_user_id || ""}|${
               final_recipient_role || ""
            }|${p_type || ""}|${orderId || ""}`;
            const last = _recentNotificationSends.get(key) || 0;
            const now = Date.now();
            if (now - last < _NOTIF_THROTTLE_MS) {
               // Skip sending duplicate notification too frequently
               // eslint-disable-next-line no-console
               console.debug(
                  "Throttling duplicate notification POST for key:",
                  key
               );
               return;
            }
            _recentNotificationSends.set(key, now);
            // cleanup after window
            setTimeout(
               () => _recentNotificationSends.delete(key),
               _NOTIF_THROTTLE_MS + 1000
            );
         } catch (e) {
            // ignore any errors constructing key
         }
         await fetch("/api/notifications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               recipient_user_id: p_recipient_user_id || null,
               recipient_role: final_recipient_role || null,
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

// Re-export types from @/types/orders to maintain backward compatibility
export type {
   Order,
   OrderBase,
   OrderItem,
   OrderItemInput,
   OrderStatus,
   OrderFilters,
   OrderQueryOptions,
   CreateOrderRequest,
} from "@/types/orders";

const buildOrdersQuery = (
   options: OrderQueryOptions,
   includeItems: boolean = true
) => {
   const { filters = {}, pagination, sort } = options;
   // Select base columns; include items relation only when requested to avoid
   // inflating counts during HEAD/count queries.
   const selectExpr = includeItems ? "*, items:order_items(*)" : "*";
   let query = sb.from("orders").select(selectExpr);

   // Apply filters
   if (filters.status) {
      query = query.eq("status", filters.status);
   }

   // Support filtering by refund_status for admin refund queries
   if ((filters as any).refund_status !== undefined) {
      const rs = (filters as any).refund_status;
      if (rs === null) {
         // allow explicit null to mean no refund status
      } else if (rs) {
         query = query.eq("refund_status", rs);
      }
   }

   if (filters.isExternal !== undefined) {
      query = query.eq("is_external", filters.isExternal);
   }

   if (filters.search) {
      query = query.or(
         `customer_first_name.ilike.%${filters.search}%,customer_last_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`
      );
   }

   if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
   }

   if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
   }

   if (filters.priceMin !== undefined) {
      query = query.gte("total", filters.priceMin);
   }

   if (filters.priceMax !== undefined) {
      query = query.lte("total", filters.priceMax);
   }

   if (filters.city) {
      query = query.ilike("delivery_city", `%${filters.city}%`);
   }

   if (filters.isPaid !== undefined) {
      query = query.eq("is_paid", filters.isPaid);
   }

   // Apply sorting
   if (sort) {
      query = query.order(sort.column, { ascending: sort.direction === "asc" });
   }

   // Apply pagination
   if (pagination) {
      const { page, limit } = pagination;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
   }

   return query;
};

// Fetch all orders (admin only)
export async function fetchAllOrders(options: OrderQueryOptions = {}) {
   // To avoid inflated counts caused by joins (orders with multiple items),
   // fetch the exact count separately using a HEAD request (no joined relations),
   // then fetch the paginated data with the items relation included.
   const countQuery = buildOrdersQuery(
      { ...options, pagination: undefined },
      false
   );
   const { count, error: countError } = await countQuery.select("id", {
      head: true,
      count: "exact",
   });

   if (countError) {
      console.error("Error fetching orders count:", countError);
      throw countError;
   }

   const dataQuery = buildOrdersQuery(options, true);
   const { data, error } = await dataQuery.select("*, items:order_items(*)");

   if (error) {
      console.error("Error fetching orders:", error);
      throw error;
   }

   return {
      data: data as Order[],
      count: count || 0,
   };
}

// Fetch user's orders
export async function fetchUserOrders(
   options: OrderQueryOptions = {},
   userId?: string
) {
   const baseOptions = { ...options };
   // Build an unpaginated count query to get an exact unique orders count
   const countQuery = buildOrdersQuery(
      {
         ...baseOptions,
         pagination: undefined,
      },
      false
   );
   if (userId) countQuery.eq("user_id", userId);
   const { count, error: countError } = await countQuery.select("id", {
      head: true,
      count: "exact",
   });

   if (countError) {
      console.error("Error fetching user orders count:", countError);
      throw countError;
   }

   const dataQuery = buildOrdersQuery(options);
   if (userId) dataQuery.eq("user_id", userId);
   const { data, error } = await dataQuery.select("*, items:order_items(*)");

   if (error) {
      console.error("Error fetching user orders:", error);
      throw error;
   }

   return {
      data: data as Order[],
      count: count || 0,
   };
}

// Fetch single order
export async function fetchOrderById(id: string) {
   // Use maybeSingle() so when the query returns 0 rows we get `null` instead of a PostgREST coercion error
   const { data, error } = await sb
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", id)
      .maybeSingle();

   if (error) {
      console.error("Error fetching order:", error);
      throw error;
   }

   // data may be null if no order matches the id
   return data as Order | null;
}

// Fetch refunded / refund-requested order items for admin management
export async function fetchRefundedItems({
   refundStatus, // optional filter: 'requested' | 'approved' | 'rejected' | 'cancelled'
   pagination,
   sort = { column: "refund_requested_at", direction: "desc" },
}: {
   refundStatus?: string;
   pagination?: { page: number; limit: number };
   sort?: { column: string; direction: "asc" | "desc" };
} = {}) {
   // count query
   let countQuery = sb
      .from("order_items")
      .select("id", { head: true, count: "exact" });
   if (refundStatus) {
      countQuery = countQuery.eq("refund_status", refundStatus);
   } else {
      // show any items with a non-null refund_status
      countQuery = countQuery.neq("refund_status", null);
   }

   const { count, error: countError } = await countQuery;
   if (countError) {
      console.error("Error fetching refunded items count:", countError);
      throw countError;
   }

   // list query: include related order and product information to display in admin UI
   let listQuery = sb
      .from("order_items")
      .select(
         `*, order:orders(id, order_number, customer_first_name, customer_last_name, customer_email, delivery_city, created_at), product:products(id, name, main_image_url), variation:product_variations(id, sku)`
      );

   if (refundStatus) {
      listQuery = listQuery.eq("refund_status", refundStatus);
   } else {
      listQuery = listQuery.neq("refund_status", null);
   }

   // apply sorting
   if (sort) {
      try {
         listQuery = listQuery.order(sort.column, {
            ascending: sort.direction === "asc",
         });
      } catch (e) {
         // ignore invalid sort column
      }
   }

   // pagination
   if (pagination) {
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      listQuery = listQuery.range(from, to);
   }

   const { data, error } = await listQuery;
   if (error) {
      console.error("Error fetching refunded order items:", error);
      throw error;
   }

   return {
      data: data as any[],
      count: count || 0,
   };
}

// Fetch aggregated refund metrics for admin dashboard (totals and recent monthly series)
export async function fetchRefundedDataForDashboard() {
   try {
      // We'll compute totals from order_items and orders (for full-order refunds)
      const totals: any = {
         requested: 0,
         approved: 0,
         rejected: 0,
         cancelled: 0,
         refunded: 0,
      };

      // Count per status from order_items
      try {
         const { data: itemRows, error: itemErr } = await sb
            .from("order_items")
            .select("refund_status", { count: "exact" })
            .neq("refund_status", null);
         // If select(count) didn't produce buckets, do a simple scan
         const { data: items, error: itemsErr } = await sb
            .from("order_items")
            .select("refund_status")
            .neq("refund_status", null);
         if (!itemsErr && Array.isArray(items)) {
            items.forEach((r: any) => {
               const s = r.refund_status || "requested";
               totals[s] = (totals[s] || 0) + 1;
            });
         }
      } catch (e) {
         // ignore and continue
      }

      // Also include order-level refund_status for full-order refunds
      try {
         const { data: orderRows, error: orderErr } = await sb
            .from("orders")
            .select("refund_status")
            .neq("refund_status", null);
         if (!orderErr && Array.isArray(orderRows)) {
            orderRows.forEach((r: any) => {
               const s = r.refund_status || "requested";
               totals[s] = (totals[s] || 0) + 1;
            });
         }
      } catch (e) {}

      // Build monthly series for last 6 months (requested events)
      const now = new Date();
      const series: any[] = [];
      for (let i = 5; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const label = d.toLocaleString("default", { month: "short" });
         series.push({
            month: label,
            requested: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
            refunded: 0,
         });
      }

      const since = new Date(
         now.getFullYear(),
         now.getMonth() - 5,
         1
      ).toISOString();

      // Collect recent item-level events
      try {
         const { data: recentItems, error: recentItemsErr } = await sb
            .from("order_items")
            .select("refund_status, refund_requested_at")
            .gte("refund_requested_at", since)
            .neq("refund_status", null);
         if (!recentItemsErr && Array.isArray(recentItems)) {
            recentItems.forEach((r: any) => {
               const dt = r.refund_requested_at
                  ? new Date(r.refund_requested_at)
                  : null;
               if (!dt) return;
               const label = dt.toLocaleString("default", { month: "short" });
               const idx = series.findIndex((s) => s.month === label);
               const status = r.refund_status || "requested";
               if (idx >= 0)
                  series[idx][status] = (series[idx][status] || 0) + 1;
            });
         }
      } catch (e) {}

      // Collect recent order-level events (full-order refunds)
      try {
         const { data: recentOrders, error: recentOrdersErr } = await sb
            .from("orders")
            .select("refund_status, refund_requested_at")
            .gte("refund_requested_at", since)
            .neq("refund_status", null);
         if (!recentOrdersErr && Array.isArray(recentOrders)) {
            recentOrders.forEach((r: any) => {
               const dt = r.refund_requested_at
                  ? new Date(r.refund_requested_at)
                  : null;
               if (!dt) return;
               const label = dt.toLocaleString("default", { month: "short" });
               const idx = series.findIndex((s) => s.month === label);
               const status = r.refund_status || "requested";
               if (idx >= 0)
                  series[idx][status] = (series[idx][status] || 0) + 1;
            });
         }
      } catch (e) {}

      return { totals, series };
   } catch (err) {
      console.error("fetchRefundedDataForDashboard error", err);
      return {
         totals: {
            requested: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
            refunded: 0,
         },
         series: [],
      };
   }
}

// Create new order
export async function createOrder({
   order,
   items,
}: CreateOrderRequest): Promise<Order> {
   console.log("createOrder called with:", { order, items });

   try {
      if (!order || !items) {
         console.error("Invalid order data:", { order, items });
         throw new Error("Invalid order data provided");
      }

      // Start transaction by creating the order first
      const orderToCreate = {
         ...order,
         status: order.status || "pending",
         order_number: `ORD${Date.now()}`,
         is_external: order.is_external || false,
      };

      console.log("Creating order with data:", orderToCreate);

      const { data: orderData, error: orderError } = await sb
         .from("orders")
         .insert([orderToCreate])
         .select()
         .single();

      if (orderError) {
         console.error("Order creation error:", orderError);
         throw new Error(`Failed to create order: ${orderError.message}`);
      }

      const createdOrder = orderData as Order;

      // Then create the order items
      // Validate and normalize item ids to avoid sending concatenated ids to UUID columns
      const isUuid = (v: any) =>
         typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);

      const orderItems = items.map((item) => {
         const pid = item.product_id;
         const pvid = item.product_variation_id;

         const normalizedProductId = isUuid(pid) ? pid : null;
         const normalizedVariationId = isUuid(pvid) ? pvid : null;

         if (!normalizedProductId) {
            console.warn(
               "createOrder: product_id is not a valid UUID, storing null to avoid DB error:",
               pid
            );
         }

         return {
            order_id: createdOrder.id,
            product_id: normalizedProductId,
            product_variation_id: normalizedVariationId,
            product_name: item.product_name,
            product_sku: item.product_sku || null,
            variation_name: item.variation_name || null,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
         } as any;
      });

      const { error: itemsError, data: itemsData } = await sb
         .from("order_items")
         .insert(orderItems)
         .select();

      if (itemsError) {
         // Try to rollback the order if possible
         try {
            await sb.from("orders").delete().eq("id", createdOrder.id);
         } catch (rollbackErr) {
            console.error(
               "Failed to rollback order after items error:",
               rollbackErr
            );
         }
         console.error("Order items creation error:", itemsError);
         // Attach more context when throwing
         throw new Error(
            `Failed to create order items: ${
               itemsError.message || JSON.stringify(itemsError)
            }`
         );
      }

      // Return the created order immediately (with inserted items) to avoid blocking the client.
      // Long-running best-effort tasks (stock updates, notifications) are kicked off
      // in the background and do not block the response.
      const quickOrder = {
         ...createdOrder,
         items: Array.isArray(itemsData) ? itemsData : [],
      } as Order;

      // Notify admins that a new order has been placed (best-effort, non-blocking).
      // Also notify the customer about their order.
      // If running on the server (service role available), call the RPC directly.
      // If running in the browser (anon key), POST to our server API which uses
      // the service role key to create the notification (avoids permission issues).
      (async () => {
         try {
            const metaObj = {
               order: quickOrder,
               order_id: quickOrder.id,
               order_number: quickOrder.order_number,
               items: quickOrder.items || [],
            };

            // Notify admin
            if (typeof window === "undefined") {
               // Server-side: use RPC with service role client (sb will be server client)
               await sb.rpc("insert_notification", {
                  p_recipient_user_id: null,
                  p_recipient_role: "admin",
                  p_type: "order_created",
                  p_title: null,
                  p_body: null,
                  p_meta: JSON.stringify(metaObj),
               });
            } else {
               // Browser: call our server-side API which inserts using the service role key
               try {
                  await fetch("/api/notifications/create", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                        recipient_user_id: null,
                        recipient_role: "admin",
                        type: "order_created",
                        title: null,
                        body: null,
                        meta: metaObj,
                     }),
                  });
               } catch (fetchErr) {
                  console.warn(
                     "Failed to POST admin notification to /api/notifications/create:",
                     fetchErr
                  );
               }
            }

            // Notify customer if user_id exists
            if (order.user_id) {
               if (typeof window === "undefined") {
                  await sb.rpc("insert_notification", {
                     p_recipient_user_id: order.user_id,
                     p_recipient_role: "user",
                     p_type: "order_created",
                     p_title: null,
                     p_body: null,
                     p_meta: JSON.stringify(metaObj),
                  });
               } else {
                  try {
                     await fetch("/api/notifications/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                           recipient_user_id: order.user_id,
                           recipient_role: "user",
                           type: "order_created",
                           title: null,
                           body: null,
                           meta: metaObj,
                        }),
                     });
                  } catch (fetchErr) {
                     console.warn(
                        "Failed to POST customer notification to /api/notifications/create:",
                        fetchErr
                     );
                  }
               }
            }
         } catch (e) {
            console.warn("Failed to create notifications for new order:", e);
         }
      })().catch((e) => console.warn("Background notify failed:", e));

      // NOTE: stock updates are intentionally deferred until delivery confirmation
      // to avoid reducing stock for orders that may be cancelled before fulfillment.
      // Stock will be adjusted when the order moves to `delivered` status.

      // If this order uses Cash on Delivery, create an initial payment record
      try {
         const paymentMethod =
            (createdOrder as any).payment_method || "cash_on_delivery";
         if (paymentMethod === "cash_on_delivery") {
            const paymentRow: any = {
               order_id: createdOrder.id,
               amount: createdOrder.total || 0,
               currency: (createdOrder.currency as any) || "RWF",
               payment_method: "cash_on_delivery",
               status: "pending",
               reference: `COD-${createdOrder.order_number || createdOrder.id}`,
               customer_name: `${createdOrder.customer_first_name || ""} ${
                  createdOrder.customer_last_name || ""
               }`.trim(),
               // DB requires customer_email and customer_phone to be NOT NULL, provide safe fallbacks
               customer_email: (createdOrder.customer_email || "").toString(),
               customer_phone: (createdOrder.customer_phone || "").toString(),
            };

            try {
               const { error: pErr } = await sb
                  .from("payments")
                  .insert([paymentRow]);
               if (pErr)
                  console.warn("Failed to create COD payment record:", pErr);
            } catch (pCatchErr) {
               console.warn("Failed to insert COD payment record:", pCatchErr);
            }
         }
      } catch (e) {
         console.warn("Error while creating COD payment record:", e);
      }

      return quickOrder;
   } catch (error) {
      console.error("Order creation failed:", error);
      throw error;
   }
}

// Update order status
export async function updateOrderStatus(
   id: string,
   status: OrderStatus,
   additionalFields?: Partial<Order>
) {
   // Fetch the existing order to validate whether status may be changed from the client
   const { data: existingOrder, error: fetchErr } = await sb
      .from("orders")
      .select("id, is_external, status")
      .eq("id", id)
      .maybeSingle();

   if (fetchErr) throw fetchErr;
   if (!existingOrder) {
      const e: any = new Error("Order not found");
      e.code = "ORDER_NOT_FOUND";
      throw e;
   }

   // If this is running in the browser (i.e. a manual UI action), disallow changing
   // the status of internal orders. Service-role/server calls (where sb is the
   // server client) may still update statuses.
   const isServerClient = typeof window === "undefined";
   if (!isServerClient && !existingOrder.is_external) {
      const e: any = new Error(
         "Manual status changes are only allowed for external orders"
      );
      e.code = "MANUAL_STATUS_DENIED";
      throw e;
   }

   const updates = {
      status,
      ...additionalFields,
      ...(status === "shipped" ? { shipped_at: new Date().toISOString() } : {}),
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

   if (error) throw error;
   const updatedOrder = data as Order;

   // Create notifications for status changes (best-effort, non-blocking)
   if (status !== existingOrder.status) {
      (async () => {
         try {
            // Fetch order with items for notification
            const { data: orderWithItems } = await sb
               .from("orders")
               .select("*, items:order_items(*)")
               .eq("id", id)
               .maybeSingle();

            const metaObj = {
               order: orderWithItems,
               order_id: id,
               order_number: orderWithItems?.order_number,
               status: status,
               items: orderWithItems?.items || [],
            };

            // Notify customer if user_id exists
            if (orderWithItems?.user_id) {
               if (typeof window === "undefined") {
                  await sb.rpc("insert_notification", {
                     p_recipient_user_id: orderWithItems.user_id,
                     p_recipient_role: "user",
                     p_type: "order_status_update",
                     p_title: null,
                     p_body: null,
                     p_meta: JSON.stringify(metaObj),
                  });
               } else {
                  try {
                     await fetch("/api/notifications/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                           recipient_user_id: orderWithItems.user_id,
                           recipient_role: "user",
                           type: "order_status_update",
                           title: null,
                           body: null,
                           meta: metaObj,
                        }),
                     });
                  } catch (fetchErr) {
                     console.warn(
                        "Failed to POST customer status notification:",
                        fetchErr
                     );
                  }
               }
            }

            // Notify admin about status change
            if (typeof window === "undefined") {
               await sb.rpc("insert_notification", {
                  p_recipient_user_id: null,
                  p_recipient_role: "admin",
                  p_type: "order_status_update",
                  p_title: null,
                  p_body: null,
                  p_meta: JSON.stringify(metaObj),
               });
            } else {
               try {
                  await fetch("/api/notifications/create", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                        recipient_user_id: null,
                        recipient_role: "admin",
                        type: "order_status_update",
                        title: null,
                        body: null,
                        meta: metaObj,
                     }),
                  });
               } catch (fetchErr) {
                  console.warn(
                     "Failed to POST admin status notification:",
                     fetchErr
                  );
               }
            }
         } catch (e) {
            console.warn("Failed to create status update notifications:", e);
         }
      })().catch((e) => console.warn("Background status notify failed:", e));
   }

   // If the order was marked delivered, decrement stock for items that are
   // not already refunded/approved. This runs on the server (service role).
   if (status === "delivered") {
      // Also, if this order was paid via Cash on Delivery, mark its payment(s) as completed
      (async () => {
         try {
            const { data: orderRow, error: orderErr } = await sb
               .from("orders")
               .select("id, payment_method")
               .eq("id", id)
               .maybeSingle();
            if (orderErr) {
               console.warn(
                  "Failed to fetch order for COD payment update:",
                  orderErr
               );
            } else if (
               orderRow &&
               orderRow.payment_method === "cash_on_delivery"
            ) {
               console.log(
                  "COD order detected, updating payment status to completed:",
                  {
                     orderId: id,
                     paymentMethod: orderRow.payment_method,
                  }
               );
               try {
                  const { error: upErr } = await sb
                     .from("payments")
                     .update({
                        status: "completed",
                        completed_at: new Date().toISOString(),
                     })
                     .eq("order_id", id)
                     .eq("status", "pending");
                  if (upErr) {
                     console.warn(
                        "Failed to update COD payment status to completed:",
                        upErr
                     );
                  } else {
                     console.log(
                        "Successfully updated COD payment status to completed for order:",
                        id
                     );
                  }
               } catch (uCatch) {
                  console.warn(
                     "Error updating COD payments on delivery:",
                     uCatch
                  );
               }
            } else {
               console.log(
                  "Order is not COD, skipping payment status update:",
                  {
                     orderId: id,
                     paymentMethod: orderRow?.payment_method,
                  }
               );
            }
         } catch (e) {
            console.warn(
               "Error while checking/updating COD payments on delivery:",
               e
            );
         }
      })().catch((e) =>
         console.warn("Background COD payment update failed:", e)
      );

      (async () => {
         try {
            const { data: items, error: itemsErr } = await sb
               .from("order_items")
               .select(
                  "id, quantity, product_id, product_variation_id, refund_status"
               )
               .eq("order_id", id);
            if (itemsErr) {
               console.warn(
                  "Failed to fetch order items for stock decrement on delivery:",
                  itemsErr
               );
               return;
            }

            await Promise.all(
               (items || []).map(async (it: any) => {
                  try {
                     const qty = Number(it.quantity || 0);
                     if (!qty || qty <= 0) return;

                     // If the item already has a refund approved/approved-like state,
                     // skip decrementing to avoid double adjustments. We only decrement
                     // for items without an approved refund.
                     if (
                        it.refund_status === "approved" ||
                        it.refund_status === "refunded"
                     ) {
                        return;
                     }

                     if (it.product_variation_id) {
                        const { data: varRow, error: varErr } = await sb
                           .from("product_variations")
                           .select("id, stock")
                           .eq("id", it.product_variation_id)
                           .maybeSingle();
                        if (varErr) {
                           console.warn(
                              "Failed to fetch product_variation for stock decrement:",
                              varErr
                           );
                        } else if (varRow && typeof varRow.stock === "number") {
                           const newStock = Math.max(
                              0,
                              Number(varRow.stock) - qty
                           );
                           const { error: uErr } = await sb
                              .from("product_variations")
                              .update({ stock: newStock })
                              .eq("id", it.product_variation_id);
                           if (uErr)
                              console.warn(
                                 "Failed to update variation stock:",
                                 uErr
                              );
                        }
                        return;
                     }

                     if (it.product_id) {
                        const { data: pRow, error: pErr } = await sb
                           .from("products")
                           .select("id, stock, track_quantity")
                           .eq("id", it.product_id)
                           .maybeSingle();
                        if (pErr) {
                           console.warn(
                              "Failed to fetch product for stock decrement:",
                              pErr
                           );
                        } else if (
                           pRow &&
                           pRow.track_quantity &&
                           typeof pRow.stock === "number"
                        ) {
                           const newStock = Math.max(
                              0,
                              Number(pRow.stock) - qty
                           );
                           const { error: upErr } = await sb
                              .from("products")
                              .update({ stock: newStock })
                              .eq("id", it.product_id);
                           if (upErr)
                              console.warn(
                                 "Failed to update product stock:",
                                 upErr
                              );
                        }
                     }
                  } catch (innerErr) {
                     console.warn(
                        "Error decrementing stock for delivered item:",
                        innerErr
                     );
                  }
               })
            );
         } catch (stockErr) {
            console.warn(
               "Error running stock decrement on delivery:",
               stockErr
            );
         }
      })().catch((bgErr) =>
         console.warn("Background stock decrement failed:", bgErr)
      );
   }

   return updatedOrder;
}

// Delete order
export async function deleteOrder(id: string) {
   const { error } = await sb.from("orders").delete().eq("id", id);
   if (error) throw error;
}

// Get order statistics
export async function getOrderStats() {
   const { data, error } = await sb.rpc("get_order_stats");
   if (error) throw error;
   return data;
}
