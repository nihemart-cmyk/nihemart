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

   const { data, error } = await sb
      .from("order_items")
      .update({
         refund_requested: true,
         refund_reason: reason,
         refund_status: "requested",
         refund_requested_at: now,
         refund_expires_at: expiresAt,
      })
      .eq("id", itemId)
      .select()
      .maybeSingle();

   if (error) throw error;
   if (!data) throw new Error("Failed to request refund for order item");

   // Notify admins that a user has requested a refund, include customer name, city and reason
   try {
      const customerName =
         `${parentOrder?.customer_first_name || ""} ${
            parentOrder?.customer_last_name || ""
         }`.trim() || "Customer";
      const city = parentOrder?.delivery_city || "";
      const title = "Refund requested";
      const body = `${customerName}${
         city ? ` from ${city}` : ""
      } requested a refund for ${existing.product_name}. Reason: ${reason}`;
      await sb.rpc("insert_notification", {
         p_recipient_user_id: null,
         p_recipient_role: "admin",
         p_type: "refund_requested",
         p_title: title,
         p_body: body,
         p_meta: JSON.stringify({
            order_id: existing.order_id,
            item_id: existing.id,
            reason,
         }),
      });
   } catch (err) {
      console.warn(
         "Failed to insert admin notification for refund request:",
         err
      );
   }

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

   const { data, error } = await sb
      .from("orders")
      .update({
         refund_requested: true,
         refund_reason: reason,
         refund_status: "requested",
         refund_requested_at: now,
         refund_expires_at: expiresAt,
      })
      .eq("id", orderId)
      .select()
      .maybeSingle();

   if (error) throw error;
   if (!data) throw new Error("Failed to request full-order refund");

   // Notify admins
   try {
      const customerName =
         `${existing?.customer_first_name || ""} ${
            existing?.customer_last_name || ""
         }`.trim() || "Customer";
      const city = existing?.delivery_city || "";
      const title = "Full order refund requested";
      const body = `${customerName}${
         city ? ` from ${city}` : ""
      } requested a refund for order ${
         existing.order_number || existing.id
      }. Reason: ${reason}`;
      await sb.rpc("insert_notification", {
         p_recipient_user_id: null,
         p_recipient_role: "admin",
         p_type: "refund_requested",
         p_title: title,
         p_body: body,
         p_meta: JSON.stringify({ order_id: existing.id, reason }),
      });
   } catch (err) {
      console.warn(
         "Failed to insert admin notification for full-order refund request:",
         err
      );
   }

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
   // Fetch existing
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

   // If approved, attempt to restock the item (best-effort) and notify user that refund will be processed
   if (approve) {
      // Best-effort: restock all items from this order and mark them as refunded/approved
      try {
         const { data: items, error: itemsErr } = await sb
            .from("order_items")
            .select(
               "id, quantity, product_id, product_variation_id, refund_status"
            )
            .eq("order_id", existing.order_id);
         if (itemsErr) {
            console.warn(
               "Failed to fetch order items for restock after full-order refund:",
               itemsErr
            );
         } else if (Array.isArray(items) && items.length) {
            await Promise.all(
               items.map(async (it: any) => {
                  try {
                     const qty = Number(it.quantity || 0);
                     if (!qty || qty <= 0) return;

                     if (it.product_variation_id) {
                        const { data: varRow, error: varErr } = await sb
                           .from("product_variations")
                           .select("id, stock")
                           .eq("id", it.product_variation_id)
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
                              .eq("id", it.product_variation_id);
                           if (uErr)
                              console.warn(
                                 "Failed to update product_variation stock on restock:",
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
                                 "Failed to update product stock on restock:",
                                 upErr
                              );
                        }
                     }
                  } catch (innerErr) {
                     console.warn(
                        "Error restocking item after full-order refund:",
                        innerErr
                     );
                  }
               })
            );

            // Mark the order items as refunded/approved so UI can reflect item-level refund state
            try {
               const { error: updErr } = await sb
                  .from("order_items")
                  .update({ refund_status: "approved", refund_requested: true })
                  .eq("order_id", existing.order_id);
               if (updErr)
                  console.warn(
                     "Failed to update order_items refund_status after full-order refund:",
                     updErr
                  );
            } catch (updEx) {
               console.warn(
                  "Failed to mark order_items as approved after full-order refund:",
                  updEx
               );
            }
         }
      } catch (restockErr) {
         console.warn(
            "Error running restock for full-order refund:",
            restockErr
         );
      }
      try {
         const qty = Number(existing.quantity || 0);
         if (qty > 0) {
            // If variation present, increment variation stock
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
               // Otherwise, increment product stock if tracking enabled
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

      // try to fetch order owner to notify them specifically
      try {
         const { data: orderData } = await sb
            .from("orders")
            .select("user_id")
            .eq("id", existing.order_id)
            .maybeSingle();
         const recipientUserId = orderData?.user_id || null;
         await sb.rpc("insert_notification", {
            p_recipient_user_id: recipientUserId,
            p_recipient_role: null,
            p_type: "refund_approved",
            p_title: "Refund approved",
            p_body: `Your refund request for item ${existing.product_name} has been approved. Please allow up to 24 hours for processing.`,
            p_meta: JSON.stringify({
               order_id: existing.order_id,
               item_id: existing.id,
            }),
         });
      } catch (err) {
         // don't fail the whole flow if notification insertion fails
         console.warn(
            "Failed to create notification for refund approval:",
            err
         );
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
         const recipientUserId = existing.user_id || null;
         await sb.rpc("insert_notification", {
            p_recipient_user_id: recipientUserId,
            p_recipient_role: null,
            p_type: "refund_approved",
            p_title: "Refund approved",
            p_body: `Your refund request for order ${
               existing.order_number || existing.id
            } has been approved. Please allow up to 24 hours for processing.`,
            p_meta: JSON.stringify({ order_id: existing.id }),
         });
      } catch (err) {
         console.warn(
            "Failed to create notification for order refund approval:",
            err
         );
      }
   }

   return data;
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

const buildOrdersQuery = (options: OrderQueryOptions) => {
   const { filters = {}, pagination, sort } = options;
   // Ensure we select related order_items for both single and list queries
   let query = sb.from("orders").select("*, items:order_items(*)");

   // Apply filters
   if (filters.status) {
      query = query.eq("status", filters.status);
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
   const countQuery = buildOrdersQuery({ ...options, pagination: undefined });
   const { count, error: countError } = await countQuery.select("id", {
      head: true,
      count: "exact",
   });

   if (countError) {
      console.error("Error fetching orders count:", countError);
      throw countError;
   }

   const dataQuery = buildOrdersQuery(options);
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
   const countQuery = buildOrdersQuery({
      ...baseOptions,
      pagination: undefined,
   });
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
      // Totals by status from order_items
      const { data: totalsRows, error: totalsErr } = await sb
         .from("order_items")
         .select("refund_status, count:id", { count: "exact" })
         .neq("refund_status", null);

      // If the above doesn't return buckets, fall back to simple counts
      const totals = { requested: 0, approved: 0, rejected: 0 } as any;
      if (!totalsErr && Array.isArray(totalsRows)) {
         // PostgREST won't bucket by default here; perform a simple scan
         const { data: rows, error: rowsErr } = await sb
            .from("order_items")
            .select("refund_status")
            .neq("refund_status", null);
         if (!rowsErr && Array.isArray(rows)) {
            rows.forEach((r: any) => {
               const s = r.refund_status || "requested";
               if (s in totals) totals[s] = (totals[s] || 0) + 1;
               else totals[s] = (totals[s] || 0) + 1;
            });
         }
      } else {
         // Conservative default
      }

      // Build a simple monthly series for the last 6 months
      const months: string[] = [];
      const series: any[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const label = d.toLocaleString("default", { month: "short" });
         months.push(label);
         series.push({ month: label, requested: 0, approved: 0, rejected: 0 });
      }

      // Fetch recent refund events (last 6 months)
      const since = new Date(
         now.getFullYear(),
         now.getMonth() - 5,
         1
      ).toISOString();
      const { data: recentRows, error: recentErr } = await sb
         .from("order_items")
         .select("refund_status, refund_requested_at")
         .gte("refund_requested_at", since)
         .neq("refund_status", null);

      if (!recentErr && Array.isArray(recentRows)) {
         recentRows.forEach((r: any) => {
            const dt = r.refund_requested_at
               ? new Date(r.refund_requested_at)
               : null;
            if (!dt) return;
            const label = dt.toLocaleString("default", { month: "short" });
            const idx = series.findIndex((s) => s.month === label);
            const status = r.refund_status || "requested";
            if (idx >= 0) series[idx][status] = (series[idx][status] || 0) + 1;
         });
      }

      return { totals, series };
   } catch (err) {
      console.error("fetchRefundedDataForDashboard error", err);
      return { totals: { requested: 0, approved: 0, rejected: 0 }, series: [] };
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

      // Run post-order background tasks asynchronously without awaiting them so the
      // client can redirect quickly. Errors are logged but won't fail the creation flow.
      (async () => {
         try {
            if (itemsData && Array.isArray(itemsData)) {
               await Promise.all(
                  itemsData.map(async (it: any) => {
                     try {
                        const qty = Number(it.quantity || 0);
                        if (!qty || qty <= 0) return;

                        // If variation present, decrement variation stock
                        if (it.product_variation_id) {
                           const { data: varRow, error: varErr } = await sb
                              .from("product_variations")
                              .select("id, stock")
                              .eq("id", it.product_variation_id)
                              .maybeSingle();
                           if (varErr) {
                              console.warn(
                                 "Failed to fetch product_variation for stock update:",
                                 varErr
                              );
                              return;
                           }
                           if (varRow && typeof varRow.stock === "number") {
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
                                    "Failed to update product_variation stock:",
                                    uErr
                                 );
                           }
                           return;
                        }

                        // Otherwise, decrement product stock if tracking enabled
                        if (it.product_id) {
                           const { data: pRow, error: pErr } = await sb
                              .from("products")
                              .select("id, stock, track_quantity")
                              .eq("id", it.product_id)
                              .maybeSingle();
                           if (pErr) {
                              console.warn(
                                 "Failed to fetch product for stock update:",
                                 pErr
                              );
                              return;
                           }
                           if (
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
                           "Error decrementing stock for item:",
                           innerErr
                        );
                     }
                  })
               );
            }
         } catch (stockErr) {
            console.warn(
               "Error running stock decrement for order items:",
               stockErr
            );
         }

         // Fire-and-forget: additional background work (notifications, analytics etc.) could go here.
      })().catch((bgErr) => {
         console.warn("Background post-order task failed:", bgErr);
      });

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
   return data as Order;
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
