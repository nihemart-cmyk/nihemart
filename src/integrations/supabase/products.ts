import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ProductStatus = "active" | "draft" | "out_of_stock";

export interface ProductBase {
   name: string;
   description?: string | null;
   short_description?: string | null;
   price: number;
   compare_at_price?: number | null;
   cost_price?: number | null;
   sku?: string | null;
   barcode?: string | null;
   weight_kg?: number | null;
   dimensions?: string | null;
   category_id?: string | null;
   subcategory_id?: string | null;
   brand?: string | null;
   tags?: string[] | null;
   meta_title?: string | null;
   meta_description?: string | null;
   featured?: boolean;
   status?: ProductStatus;
   track_quantity?: boolean;
   continue_selling_when_oos?: boolean;
   requires_shipping?: boolean;
   taxable?: boolean;
   stock?: number;
   main_image_url?: string | null;
}

export interface Product extends ProductBase {
   id: string;
   created_at: string;
   updated_at: string;
   average_rating?: number;
   review_count?: number;
   category?: { id: string; name: string } | null;
   subcategory?: { id: string; name: string } | null;
}

export interface ProductImage {
   id?: string;
   product_id?: string;
   product_variation_id?: string | null;
   url: string;
   is_primary?: boolean;
   position?: number;
}

export interface ProductVariation {
   id?: string;
   product_id?: string;
   name?: string | null;
   price?: number | null;
   stock?: number;
   attributes?: {
      color?: string;
      size?: string;
      [key: string]: string | undefined;
   };
   images?: ProductImage[];
}

export interface Review {
   id: string;
   product_id: string;
   user_id: string;
   rating: number;
   title?: string | null;
   content?: string | null;
   created_at: string;
   author?: {
      full_name?: string | null;
   } | null;
}

export interface ReviewBase {
   product_id: string;
   user_id: string;
   rating: number;
   title?: string;
   content?: string;
}

export interface ProductListPageFilters {
   search?: string;
   category?: string;
   status?: ProductStatus | "all";
}

export interface ProductQueryOptions {
   filters?: ProductListPageFilters;
   pagination?: {
      page: number;
      limit: number;
   };
   sort?: {
      column: string;
      direction: "asc" | "desc";
   };
}

export type OrderStatus =
   | "pending"
   | "processing"
   | "shipped"
   | "delivered"
   | "cancelled";

export interface OrderBase {
   user_id: string;
   status?: OrderStatus;
   subtotal: number;
   tax?: number;
   total: number;
   currency?: string;
   customer_email: string;
   customer_first_name: string;
   customer_last_name: string;
   customer_phone?: string;
   delivery_address: string;
   delivery_city: string;
   delivery_notes?: string;
}

export interface Order extends OrderBase {
   id: string;
   order_number: string;
   created_at: string;
   updated_at: string;
   shipped_at?: string | null;
   delivered_at?: string | null;
   items?: OrderItem[];
}

export interface OrderItem {
   id: string;
   order_id: string;
   product_id?: string | null;
   product_variation_id?: string | null;
   product_name: string;
   product_sku?: string | null;
   variation_name?: string | null;
   price: number;
   quantity: number;
   total: number;
   created_at: string;
}

export interface OrderItemBase {
   product_id?: string;
   product_variation_id?: string;
   product_name: string;
   product_sku?: string;
   variation_name?: string;
   price: number;
   quantity: number;
   total: number;
}

export interface CreateOrderRequest {
   order: OrderBase;
   items: OrderItemBase[];
}

export interface OrderFilters {
   status?: OrderStatus | "all";
   search?: string;
   date_from?: string;
   date_to?: string;
}

export interface OrderQueryOptions {
   filters?: OrderFilters;
   pagination?: {
      page: number;
      limit: number;
   };
   sort?: {
      column: string;
      direction: "asc" | "desc";
   };
}

const buildProductQuery = (filters: ProductListPageFilters = {}) => {
   let query = sb.from("products").select(`
    *,
    category:categories(id, name)
  `);

   if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
         `name.ilike.${term},brand.ilike.${term},sku.ilike.${term}`
      );
   }
   if (filters.category && filters.category !== "all") {
      query = query.eq("category_id", filters.category);
   }
   if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
   }
   return query;
};

const buildOrderQuery = (filters: OrderFilters = {}) => {
   let query = sb.from("orders").select(`
    *,
    items:order_items(*)
  `);

   if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
   }

   if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
         `order_number.ilike.${term},customer_email.ilike.${term},customer_first_name.ilike.${term},customer_last_name.ilike.${term}`
      );
   }

   if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
   }

   if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
   }

   return query;
};

export async function fetchProductsPage({
   filters = {},
   pagination = { page: 1, limit: 10 },
   sort = { column: "created_at", direction: "desc" },
}: ProductQueryOptions) {
   const query = buildProductQuery(filters);

   const { count, error: countError } = await query.select("*", {
      count: "exact",
      head: true,
   });
   if (countError) throw countError;

   const from = (pagination.page - 1) * pagination.limit;
   const to = from + pagination.limit - 1;

   const dataQuery = buildProductQuery(filters)
      .order(sort.column, { ascending: sort.direction === "asc" })
      .range(from, to);

   const { data, error } = await dataQuery;
   if (error) throw error;

   return { data: data as Product[], count: count ?? 0 };
}

export async function fetchAllProductsForExport({
   filters = {},
   sort = { column: "created_at", direction: "desc" },
}: Omit<ProductQueryOptions, "pagination">) {
   const query = buildProductQuery(filters)
      .order(sort.column, { ascending: sort.direction === "asc" })
      .limit(5000);

   const { data, error } = await query;
   if (error) throw error;
   return data as Product[];
}

export async function fetchProductById(id: string) {
   const { data, error } = await sb
      .from("products")
      .select(
         `
    *,
    category:categories(id, name),
    subcategory:subcategories(id, name)
  `
      )
      .eq("id", id)
      .maybeSingle();
   if (error) throw error;
   if (!data) return null;

   const productData = data as Product;

   const [variationsRes, imagesRes, reviewsRes] = await Promise.all([
      sb
         .from("product_variations")
         .select("*")
         .eq("product_id", id)
         .order("created_at", { ascending: true }),
      sb
         .from("product_images")
         .select("*")
         .eq("product_id", id)
         .order("position", { ascending: true }),
      sb
         .from("reviews")
         .select("*, author:profiles(full_name)")
         .eq("product_id", id)
         .order("created_at", { ascending: false }),
   ]);

   if (variationsRes.error) throw variationsRes.error;
   if (imagesRes.error) throw imagesRes.error;
   if (reviewsRes.error) throw reviewsRes.error;

   const allImages = (imagesRes.data || []) as ProductImage[];
   const variations = (variationsRes.data || []).map((v: any) => ({
      ...v,
      images: allImages.filter((img) => img.product_variation_id === v.id),
   })) as ProductVariation[];

   const generalImages = allImages.filter((img) => !img.product_variation_id);
   const reviews = (reviewsRes.data || []) as Review[];

   return { product: productData, variations, images: generalImages, reviews };
}

export async function createProduct(
   product: ProductBase,
   variations: ProductVariation[] = [],
   imageUrls: string[] = []
) {
   const { data, error } = await sb
      .from("products")
      .insert([product])
      .select("*")
      .single();
   if (error) throw error;
   const created = data as Product;

   if (variations.length > 0) {
      const withProduct = variations.map((v) => ({
         product_id: created.id,
         name: v.name ?? null,
         price: v.price ?? null,
         stock: v.stock ?? 0,
         attributes: v.attributes ?? {},
      }));
      const { error: vErr } = await sb
         .from("product_variations")
         .insert(withProduct);
      if (vErr) throw vErr;
   }

   if (imageUrls.length > 0) {
      const imgs = imageUrls.map((url, idx) => ({
         product_id: created.id,
         url,
         is_primary: idx === 0,
         position: idx,
      }));
      const { error: iErr } = await sb.from("product_images").insert(imgs);
      if (iErr) throw iErr;
      if (!product.main_image_url) {
         await sb
            .from("products")
            .update({ main_image_url: imageUrls[0] })
            .eq("id", created.id);
      }
   }

   return created;
}

export async function updateProduct(
   id: string,
   updates: Partial<ProductBase>,
   variations?: ProductVariation[]
) {
   if (Object.keys(updates).length) {
      const { error } = await sb.from("products").update(updates).eq("id", id);
      if (error) throw error;
   }
   if (variations) {
      const { error: dErr } = await sb
         .from("product_variations")
         .delete()
         .eq("product_id", id);
      if (dErr) throw dErr;
      if (variations.length) {
         const withProduct = variations.map((v) => ({
            product_id: id,
            name: v.name ?? null,
            price: v.price ?? null,
            stock: v.stock ?? 0,
            attributes: v.attributes ?? {},
         }));
         const { error: iErr } = await sb
            .from("product_variations")
            .insert(withProduct);
         if (iErr) throw iErr;
      }
   }
}

export async function deleteProduct(id: string) {
   const { error } = await sb.from("products").delete().eq("id", id);
   if (error) throw error;
}

export interface Category {
   id: string;
   name: string;
}

export interface Subcategory {
   id: string;
   name: string;
   category_id: string;
   created_at: string;
}

export interface CategoryWithSubcategories extends Category {
   subcategories: Subcategory[];
}

export async function fetchCategories(): Promise<Category[]> {
   const { data, error } = await sb
      .from("categories")
      .select("id, name")
      .order("name");
   if (error) throw error;
   return data || [];
}

export async function fetchCategoriesWithSubcategories(): Promise<
   CategoryWithSubcategories[]
> {
   const { data, error } = await sb
      .from("categories")
      .select(`*, subcategories:subcategories(*)`)
      .order("name");
   if (error) throw error;
   return data || [];
}

// ==============Orders ======================

// Fetch user's orders with pagination
export async function fetchUserOrders({
   filters = {},
   pagination = { page: 1, limit: 10 },
   sort = { column: "created_at", direction: "desc" },
}: OrderQueryOptions) {
   const query = buildOrderQuery(filters);

   // Get count
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
}

// Fetch all orders (admin only)
export async function fetchAllOrders({
   filters = {},
   pagination = { page: 1, limit: 10 },
   sort = { column: "created_at", direction: "desc" },
}: OrderQueryOptions) {
   return fetchUserOrders({ filters, pagination, sort });
}

// Fetch single order by ID
export async function fetchOrderById(id: string): Promise<Order | null> {
   const { data, error } = await sb
      .from("orders")
      .select(
         `
      *,
      items:order_items(*)
    `
      )
      .eq("id", id)
      .maybeSingle();

   if (error) throw error;
   return data as Order | null;
}

// Create new order
export async function createOrder({
   order,
   items,
}: CreateOrderRequest): Promise<Order> {
   // Validate input data
   if (!order.user_id) {
      throw new Error("User ID is required");
   }

   if (!items || items.length === 0) {
      throw new Error("Order must contain at least one item");
   }

   // Validate each item
   for (const item of items) {
      if (!item.product_id) {
         throw new Error("Each item must have a product_id");
      }
      if (!item.product_name || item.product_name.trim() === "") {
         throw new Error("Each item must have a product_name");
      }
      if (typeof item.price !== "number" || item.price <= 0) {
         throw new Error("Each item must have a valid price");
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
         throw new Error("Each item must have a valid quantity");
      }

      // Clean up UUID fields - ensure they're either valid UUIDs or undefined
      if (item.product_variation_id === "") {
         item.product_variation_id = undefined;
      }
      if (item.product_sku === "") {
         item.product_sku = undefined;
      }
      if (item.variation_name === "") {
         item.variation_name = undefined;
      }
   }

   try {
      // Start transaction by creating the order first
      const { data: orderData, error: orderError } = await sb
         .from("orders")
         .insert([
            {
               ...order,
               status: order.status || "pending",
            },
         ])
         .select("*")
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
         product_variation_id: item.product_variation_id,
         product_name: item.product_name,
         product_sku: item.product_sku,
         variation_name: item.variation_name,
         price: item.price,
         quantity: item.quantity,
         total: item.total,
      }));

      console.log("Creating order items:", JSON.stringify(orderItems, null, 2));

      const { data: itemsData, error: itemsError } = await sb
         .from("order_items")
         .insert(orderItems)
         .select("*");

      if (itemsError) {
         console.error("Order items creation error:", itemsError);

         // Try to rollback the order if possible
         try {
            await sb.from("orders").delete().eq("id", createdOrder.id);
         } catch (rollbackError) {
            console.error("Failed to rollback order:", rollbackError);
         }

         throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      return {
         ...createdOrder,
         items: itemsData as OrderItem[],
      };
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
   const updates: any = {
      status,
      ...additionalFields,
   };

   // Set timestamp fields based on status
   if (status === "shipped" && !additionalFields?.shipped_at) {
      updates.shipped_at = new Date().toISOString();
   }
   if (status === "delivered" && !additionalFields?.delivered_at) {
      updates.delivered_at = new Date().toISOString();
   }

   const { data, error } = await sb
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

   if (error) throw error;
   return data as Order;
}

// Delete order (admin only, should be rare)
export async function deleteOrder(id: string) {
   const { error } = await sb.from("orders").delete().eq("id", id);

   if (error) throw error;
}

// Get order statistics (for admin dashboard)
export async function getOrderStats() {
   const { data: totalOrders, error: totalError } = await sb
      .from("orders")
      .select("id", { count: "exact" });

   if (totalError) throw totalError;

   const { data: pendingOrders, error: pendingError } = await sb
      .from("orders")
      .select("id", { count: "exact" })
      .eq("status", "pending");

   if (pendingError) throw pendingError;

   const { data: recentOrders, error: recentError } = await sb
      .from("orders")
      .select("total")
      .gte(
         "created_at",
         new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

   if (recentError) throw recentError;

   const totalRevenue =
      recentOrders?.reduce(
         (sum: number, order: { total: any }) => sum + Number(order.total),
         0
      ) || 0;

   return {
      total: totalOrders?.length || 0,
      pending: pendingOrders?.length || 0,
      revenue: totalRevenue,
   };
}
