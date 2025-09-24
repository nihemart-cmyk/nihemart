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
      .select("id, order_id, refund_status, product_name, price, quantity")
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

   // If approved, notify user that refund will be processed within 24 hours
   if (approve) {
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
   const query = buildOrdersQuery(options);
   const { data, error, count } = await query.select(
      "*, items:order_items(*)",
      { count: "exact" }
   );

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
   const query = buildOrdersQuery(options);

   if (userId) {
      query.eq("user_id", userId);
   }
   const { data, error, count } = await query.select(
      "*, items:order_items(*)",
      { count: "exact" }
   );

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

      // Return the complete order with items
      const fullOrder = await fetchOrderById(createdOrder.id);
      if (!fullOrder) {
         throw new Error("Failed to retrieve created order");
      }
      return fullOrder;
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
