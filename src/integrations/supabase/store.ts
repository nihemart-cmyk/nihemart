import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// --- TYPES FOR PRODUCT LISTING PAGE ---
export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  short_description: string | null;
  main_image_url: string | null;
  average_rating: number | null;
  review_count: number | null;
  brand: string | null;
  category: { id: string, name: string } | null;
}
export interface StoreCategory { id: string; name: string; products_count: number; }
export interface StoreSubcategory { id: string; name: string; products_count: number; }
export interface StoreFilters { categories?: string[]; subcategories?: string[]; 
  // priceRange?: [number, number];
   rating?: number; }
export interface StoreQueryOptions { search?: string; filters?: StoreFilters; sort?: { column: string; direction: 'asc' | 'desc'; }; pagination: { page: number; limit: number; }; }

// --- TYPES FOR PRODUCT DETAIL PAGE ---
export interface ProductDetail extends StoreProduct { description: string | null; compare_at_price: number | null; stock?: number | null | undefined }
export interface ProductVariationDetail { id: string; name: string | null; price: number | null; stock: number; attributes: Record<string, string>; }
export interface ProductImageDetail { id: string; url: string; product_variation_id: string | null; }
export interface ProductReview { id: string; rating: number; title: string | null; content: string | null; created_at: string; author: { full_name: string | null; } | null; }
export interface ProductPageData { product: ProductDetail; variations: ProductVariationDetail[]; images: ProductImageDetail[]; reviews: ProductReview[]; similarProducts: StoreProduct[]; }
export interface ReviewBase { product_id: string; user_id: string; rating: number; title?: string; content?: string; }
export interface StoreCategorySimple { id: string; name: string; }

// --- DATA FETCHING FUNCTIONS ---
const buildStoreQuery = ({ search = '', filters = {} }: Pick<StoreQueryOptions, 'search' | 'filters'>) => {
  let query = sb.from('products').select('id, name, price, main_image_url, average_rating, review_count, brand, category:categories(id, name)');
  if (search.trim()) { query = query.or(`name.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%`); }
  if (filters.categories && filters.categories.length > 0) { query = query.in('category_id', filters.categories); }
  if (filters.subcategories && filters.subcategories.length > 0) { query = query.in('subcategory_id', filters.subcategories); }
  // if (filters.priceRange) { query = query.gte('price', filters.priceRange[0]).lte('price', filters.priceRange[1]); }
  if (filters.rating) { query = query.gte('average_rating', filters.rating); }
  return query;
};
export async function fetchStoreProducts(options: StoreQueryOptions) {
  const query = buildStoreQuery(options);
  const { count, error: countError } = await query.select('*', { count: 'exact', head: true });
  if (countError) throw countError;
  const from = (options.pagination.page - 1) * options.pagination.limit;
  const to = from + options.pagination.limit - 1;
  const dataQuery = buildStoreQuery(options).order(options.sort?.column || 'created_at', { ascending: options.sort?.direction === 'asc' }).range(from, to);
  const { data, error } = await dataQuery;
  if (error) throw error;
  return { data: data as StoreProduct[], count: count ?? 0 };
}
export async function fetchStoreFilterData() {
  const { data, error } = await sb.rpc('get_categories_with_product_count');
  if (error) throw error;
  return { categories: data as StoreCategory[] };
}
export async function fetchStoreSubcategories(categoryIds: string[] = []) {
  const { data, error } = await sb.rpc('get_subcategories_with_product_count', { parent_category_ids: categoryIds });
  if (error) throw error;
  return { subcategories: data as StoreSubcategory[] };
}
export async function fetchStoreProductById(id: string): Promise<ProductPageData | null> {
  const { data: product, error } = await sb.from('products').select(`id, name, description, price, compare_at_price, main_image_url, average_rating, review_count, brand, category:categories(id, name)`).eq('id', id).maybeSingle();
  if (error || !product) { console.error('Error fetching product or product not found:', error); return null; }
  const [variationsRes, imagesRes, reviewsRes] = await Promise.all([
    sb.from('product_variations').select('id, name, price, stock, attributes').eq('product_id', id),
    sb.from('product_images').select('id, url, product_variation_id').eq('product_id', id),
    sb.from('reviews').select('id, rating, title, content, created_at, author:profiles!user_id(full_name)').eq('product_id', id),
  ]);
  if (variationsRes.error) throw variationsRes.error;
  if (imagesRes.error) throw imagesRes.error;
  if (reviewsRes.error) throw reviewsRes.error;
  const categoryId = product.category?.id;
  let similarProducts: StoreProduct[] = [];
  if (categoryId) {
    const { data: similarData } = await sb.from('products').select('id, name, price, main_image_url, average_rating, category:categories(id, name)').eq('category_id', categoryId).eq('status', 'active').neq('id', id).limit(6);
    similarProducts = similarData || [];
  }
  return { product: product as ProductDetail, variations: (variationsRes.data || []) as ProductVariationDetail[], images: (imagesRes.data || []) as ProductImageDetail[], reviews: (reviewsRes.data || []) as ProductReview[], similarProducts, };
}
export async function createStoreReview(reviewData: ReviewBase): Promise<ProductReview> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { throw new Error("You must be logged in to leave a review."); }
    if (reviewData.user_id !== session.user.id) { throw new Error("User ID mismatch."); }
    const { data, error } = await sb.from('reviews').insert(reviewData).select('*, author:profiles!user_id(full_name)').single();
    if (error) { if (error.code === '23505') { throw new Error("You have already submitted a review for this product."); } throw error; }
    return data as ProductReview;
}
export async function fetchStoreCategories(): Promise<StoreCategorySimple[]> {
  const { data, error } = await sb.from('categories').select('id, name').limit(8);
  if (error) throw error;
  return data || [];
}
export async function fetchProductsUnder15k(categoryId?: string): Promise<StoreProduct[]> {
    let query = sb.from('products').select('id, name, price, main_image_url, short_description, average_rating, brand, category:categories(id, name)').eq('status', 'active').lte('price', 15000).order('created_at', { ascending: false }).limit(12);
    if (categoryId && categoryId !== 'all') { query = query.eq('category_id', categoryId); }
    const { data, error } = await query;
    if (error) throw error;
    return data as StoreProduct[];
}
export async function fetchLandingPageProducts({ categoryId, featured, limit }: { categoryId?: string, featured?: boolean, limit: number }): Promise<StoreProduct[]> {
    let query = sb.from('products').select('id, name, price, short_description, main_image_url, average_rating, brand, category:categories(id, name)').eq('status', 'active').order('created_at', { ascending: false }).limit(limit);
    if (featured !== undefined) { query = query.eq('featured', featured); }
    if (categoryId && categoryId !== 'all') { query = query.eq('category_id', categoryId); }
    const { data, error } = await query;
    if (error) throw error;
    return data as StoreProduct[];
}




// Navbar search
export interface SearchResult {
    id: string;
    name: string;
    main_image_url: string | null;
    short_description: string | null;
}

export async function searchProductsByName(query: string): Promise<SearchResult[]> {
    if (!query.trim() || query.trim().length < 2) {
        return [];
    }

    const { data, error } = await sb
        .from('products')
        .select('id, name, main_image_url, short_description')
        .eq('status', 'active')
        .ilike('name', `%${query.trim()}%`)
        .limit(5); // Limit results to 5 for the popover

    if (error) {
        console.error("Error searching products:", error);
        return [];
    }
    return data as SearchResult[];
}