import { supabase } from "./client";
import {
   Order,
   OrderQueryOptions,
   CreateOrderRequest,
   OrderStatus,
   OrderFilters,
} from "@/types/orders";

const sb = supabase as any;

const buildOrderQuery = (filters: OrderFilters = {}) => {
   let query = sb.from("orders").select("*, items:order_items(*)");

   if (filters.status) {
      query = query.eq("status", filters.status);
   }

   if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
         `order_number.ilike.${term},customer_email.ilike.${term},customer_first_name.ilike.${term},customer_last_name.ilike.${term},customer_phone.ilike.${term}`
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

   if (filters.isExternal !== undefined) {
      query = query.eq("is_external", filters.isExternal);
   }

   return query;
};

// Fetch all orders (admin only)
export async function fetchAllOrders({
   filters = {},
   pagination = { page: 1, limit: 10 },
   sort = { column: "created_at", direction: "desc" },
}: OrderQueryOptions = {}) {
   try {
      const query = buildOrderQuery(filters);

      // Get count first
      const { count, error: countError } = await query.select("*", {
         count: "exact",
         head: true,
      });

      if (countError) throw countError;

      // Get data with pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;

      const dataQuery = buildOrderQuery(filters)
         .order(sort.column, { ascending: sort.direction === "asc" })
         .range(from, to);

      const { data, error } = await dataQuery;

      if (error) throw error;

      return { data: data as Order[], count: count ?? 0 };
   } catch (error) {
      console.error("Error in fetchAllOrders:", error);
      throw error;
   }
}

// Fetch user's orders
export async function fetchUserOrders(
   userId: string,
   options: OrderQueryOptions = {}
) {
   try {
      const query = buildOrderQuery(options.filters).eq("user_id", userId);

      // Get count
      const { count, error: countError } = await query.select("*", {
         count: "exact",
         head: true,
      });

      if (countError) throw countError;

      // Get data with pagination
      const { page = 1, limit = 10 } = options.pagination ?? {};
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const dataQuery = query
         .order(options.sort?.column || "created_at", {
            ascending: options.sort?.direction === "asc",
         })
         .range(from, to);

      const { data, error } = await dataQuery;

      if (error) throw error;

      return { data: data as Order[], count: count ?? 0 };
   } catch (error) {
      console.error("Error in fetchUserOrders:", error);
      throw error;
   }
}

// Fetch single order
export async function fetchOrderById(id: string): Promise<Order> {
   const { data, error } = await sb
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", id)
      .single();

   if (error) throw error;
   if (!data) throw new Error("Order not found");

   return data as Order;
}

// Create new order
export async function createOrder({
   order,
   items,
}: CreateOrderRequest): Promise<Order> {
   try {
      // Start transaction by creating the order first
      const { data: orderData, error: orderError } = await sb
         .from("orders")
         .insert([
            {
               ...order,
               status: order.status || "pending",
               is_external: order.is_external || false,
               is_paid: order.is_paid || false,
            },
         ])
         .select()
         .single();

      if (orderError) {
         console.error("Order creation error:", orderError);
         throw new Error(`Failed to create order: ${orderError.message}`);
      }

      const createdOrder = orderData as Order;

      // Then create the order items
      const orderItems = items.map((item) => ({
         order_id: createdOrder.id,
         product_id: item.product_id,
         product_variation_id: item.product_variation_id || null,
         product_name: item.product_name,
         product_sku: item.product_sku || null,
         variation_name: item.variation_name || null,
         price: item.price,
         quantity: item.quantity,
         total: item.price * item.quantity,
      }));

      const { error: itemsError } = await sb
         .from("order_items")
         .insert(orderItems);

      if (itemsError) {
         // Try to rollback the order if possible
         await sb.from("orders").delete().eq("id", createdOrder.id);
         console.error("Order items creation error:", itemsError);
         throw new Error(`Failed to create order items: ${itemsError.message}`);
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
): Promise<Order> {
   const { data, error } = await sb
      .from("orders")
      .update({
         status,
         ...additionalFields,
      })
      .eq("id", id)
      .select()
      .single();

   if (error) throw error;
   return data as Order;
}

// Delete order (admin only)
export async function deleteOrder(id: string): Promise<void> {
   const { error } = await sb.from("orders").delete().eq("id", id);
   if (error) throw error;
}

// Get order statistics
export async function getOrderStats() {
   const { data, error } = await sb.rpc("get_order_stats");

   if (error) throw error;
   return data;
}

// Update is_paid status
export async function updateOrderPaymentStatus(
   id: string,
   isPaid: boolean
): Promise<Order> {
   const { data, error } = await sb
      .from("orders")
      .update({ is_paid: isPaid })
      .eq("id", id)
      .select()
      .single();

   if (error) throw error;
   return data as Order;
}
