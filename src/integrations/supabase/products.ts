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
   sku?: string | null;
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

export async function createBulkProducts(products: ProductBase[]) {
   const { data, error } = await sb
      .from("products")
      .insert(products)
      .select("*");
   if (error) throw error;
   return data;
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
