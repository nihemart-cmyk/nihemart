import { supabase } from "./client";
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

const sb = supabase as any;

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
   const { data, error, count } = await query.select("*", { count: "exact" });

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
   const { data, error, count } = await query.select("*", { count: "exact" });

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
   const { data, error } = await sb
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", id)
      .single();

   if (error) {
      console.error("Error fetching order:", error);
      throw error;
   }

   return data as Order;
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
      return await fetchOrderById(createdOrder.id);
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
