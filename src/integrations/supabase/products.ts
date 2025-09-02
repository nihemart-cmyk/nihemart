import { supabase } from "@/integrations/supabase/client";

// Workaround: use untyped client because Supabase types may lag behind migrations in this environment
const sb = supabase as any;

export type ProductStatus = "active" | "draft" | "out_of_stock";

export interface ProductBase {
  name: string;
  description?: string | null;
  short_description?: string | null;
  price: number; // base price
  compare_at_price?: number | null;
  cost_price?: number | null;
  sku?: string | null;
  barcode?: string | null;
  weight_kg?: number | null;
  dimensions?: string | null;
  category?: string | null; // Legacy field for compatibility
  subcategory?: string | null; // Legacy field for compatibility
  category_id?: string | null; // New relationship field
  subcategory_id?: string | null; // New relationship field
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
  stock?: number; // total stock when not using variations
  main_image_url?: string | null;
}

export interface Product extends Omit<ProductBase, 'category' | 'subcategory'> {
  id: string;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
}

export interface ProductVariation {
  id?: string;
  product_id?: string;
  name?: string | null;
  price?: number | null;
  stock?: number; // per variation stock
  // sku?: string | null;
  attributes?: Record<string, string>;
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  url: string;
  is_primary?: boolean;
  position?: number;
}

export interface ProductQueryFilters {
  search?: string;
  category?: string;
  status?: ProductStatus | "all";
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchProducts(filters: ProductQueryFilters = {}) {
  let query = sb.from("products").select(`
    *,
    category:categories(id, name),
    subcategory:subcategories(id, name)
  `).order("created_at", { ascending: false });

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `name.ilike.${term},brand.ilike.${term}`
    );
  }
  if (filters.category && filters.category !== "all") {
    query = query.eq("category_id", filters.category);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (typeof filters.featured === "boolean") {
    query = query.eq("featured", filters.featured);
  }
  if (typeof filters.limit === "number") {
    query = query.limit(filters.limit);
  }
  if (typeof filters.offset === "number") {
    query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Product[];
}

export async function fetchProductById(id: string) {
  const { data, error } = await sb.from("products").select(`
    *,
    category:categories(id, name),
    subcategory:subcategories(id, name)
  `).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [variationsRes, imagesRes] = await Promise.all([
    sb.from("product_variations").select("*").eq("product_id", id).order("created_at", { ascending: true }),
    sb.from("product_images").select("*").eq("product_id", id).order("position", { ascending: true })
  ]);
  if (variationsRes.error) throw variationsRes.error;
  if (imagesRes.error) throw imagesRes.error;
  return { product: data as Product, variations: (variationsRes.data || []) as ProductVariation[], images: (imagesRes.data || []) as ProductImage[] };
}

export async function createProduct(
  product: ProductBase,
  variations: ProductVariation[] = [],
  imageUrls: string[] = []
) {
  const { data, error } = await sb.from("products").insert([product]).select("*").single();
  if (error) throw error;
  const created = data as Product;

  if (variations.length > 0) {
    const withProduct = variations.map(v => ({
      product_id: created.id,
      name: v.name ?? null,
      price: v.price ?? null,
      stock: v.stock ?? 0,
      // sku: v.sku ?? null,
      attributes: v.attributes ?? {}
    }));
    const { error: vErr } = await sb.from("product_variations").insert(withProduct);
    if (vErr) throw vErr;
  }

  if (imageUrls.length > 0) {
    const imgs = imageUrls.map((url, idx) => ({ product_id: created.id, url, is_primary: idx === 0, position: idx }));
    const { error: iErr } = await sb.from("product_images").insert(imgs);
    if (iErr) throw iErr;
    if (!product.main_image_url) {
      await sb.from("products").update({ main_image_url: imageUrls[0] }).eq("id", created.id);
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
    // Simple strategy: delete existing variations and reinsert (transaction-less fallback)
    const { error: dErr } = await sb.from("product_variations").delete().eq("product_id", id);
    if (dErr) throw dErr;
    if (variations.length) {
      const withProduct = variations.map(v => ({
        product_id: id,
        name: v.name ?? null,
        price: v.price ?? null,
        stock: v.stock ?? 0,
        // sku: v.sku ?? null,
        attributes: v.attributes ?? {}
      }));
      const { error: iErr } = await sb.from("product_variations").insert(withProduct);
      if (iErr) throw iErr;
    }
  }
}

export async function deleteProduct(id: string) {
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImage(file: File, productId: string) {
  const ext = file.name.split(".").pop();
  const path = `${productId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data: pub } = await sb.storage.from("product-images").getPublicUrl(path);
  return pub.publicUrl as string;
}

export async function bulkInsertProducts(rows: ProductBase[]) {
  if (!rows.length) return { inserted: 0 };
  // Chunk inserts to avoid payload limits
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await sb.from("products").insert(chunk).select("id");
    if (error) throw error;
    inserted += data?.length || 0;
  }
  return { inserted };
}

export async function getProductStats() {
  const { data, error } = await sb.rpc("get_product_stats");
  if (error) throw error;
  return (data || {}) as {
    total_products: number;
    active_products: number;
    out_of_stock_products: number;
    featured_count: number;
    low_stock_count: number;
  };
}

// Category and subcategory types
export interface Category {
  id: string;
  name: string;
  icon_url?: string;
  link?: string;
  created_at: string;
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
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  
  return data || [];
}

export async function fetchSubcategories(categoryId?: string): Promise<Subcategory[]> {
  let query = sb.from('subcategories').select('*').order('name');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching subcategories:', error);
    throw error;
  }
  
  return data || [];
}

export async function fetchCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
  const { data, error } = await sb
    .from('categories')
    .select(`
      *,
      subcategories:subcategories(*)
    `)
    .order('name');
  
  if (error) {
    console.error('Error fetching categories with subcategories:', error);
    throw error;
  }
  
  return data || [];
}
