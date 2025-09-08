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
   category?: { id: string; name: string } | null;
   subcategory?: { id: string; name: string } | null;
}

export interface ProductImage {
   id: string;
   product_id: string;
   product_variation_id?: string | null;
   url: string;
   is_primary: boolean;
   position: number;
}

export interface ProductVariation {
   id?: string;
   product_id?: string;
   price?: number | null;
   stock?: number;
   sku?: string | null;
   barcode?: string | null;
   attributes: Record<string, string>;
   images?: ProductImage[];
}

export interface ProductVariationInput extends Omit<ProductVariation, 'images'>{
   imageFiles?: File[];
}

export interface Category { id: string; name: string; }
export interface Subcategory { id: string; name: string; category_id: string; }
export interface CategoryWithSubcategories extends Category { subcategories: Subcategory[]; }

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


const uploadFile = async (file: File, bucket: string): Promise<string> => {
  const filePath = `${Date.now()}-${file.name}`;
  const { error } = await sb.storage.from(bucket).upload(filePath, file);
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

export async function createProductWithImages(
  productData: ProductBase,
  mainImageFiles: File[],
  variationsData: ProductVariationInput[]
) {
  const mainImageUrls = await Promise.all(mainImageFiles.map(file => uploadFile(file, 'product-images')));
  if (mainImageUrls.length > 0) {
    productData.main_image_url = mainImageUrls[0];
  }
  
  const { data: createdProduct, error: productError } = await sb.from('products').insert(productData).select().single();
  if (productError) throw productError;

  if (mainImageUrls.length > 0) {
    const mainImagesToInsert = mainImageUrls.map((url, index) => ({
      product_id: createdProduct.id,
      url,
      position: index,
      is_primary: index === 0,
    }));
    const { error: mainImagesError } = await sb.from('product_images').insert(mainImagesToInsert);
    if (mainImagesError) throw mainImagesError;
  }

  for (const variation of variationsData) {
    const { imageFiles = [], ...variationDetails } = variation;
    const { data: createdVariation, error: variationError } = await sb.from('product_variations').insert({ ...variationDetails, product_id: createdProduct.id }).select('id').single();
    if (variationError) throw variationError;

    if (imageFiles.length > 0) {
      const variantImageUrls = await Promise.all(imageFiles.map(file => uploadFile(file, 'product-images')));
      const variantImagesToInsert = variantImageUrls.map((url, index) => ({ product_id: createdProduct.id, product_variation_id: createdVariation.id, url, position: index }));
      const { error: variantImagesError } = await sb.from('product_images').insert(variantImagesToInsert);
      if (variantImagesError) throw variantImagesError;
    }
  }
  return createdProduct;
}

export async function updateProductWithImages(
  productId: string,
  productData: Partial<ProductBase>,
  mainImageFiles: File[],
  variationsData: ProductVariationInput[]
) {
  await sb.from('product_variations').delete().eq('product_id', productId);
  await sb.from('product_images').delete().eq('product_id', productId).is('product_variation_id', null);

  const mainImageUrls = await Promise.all(mainImageFiles.map(file => uploadFile(file, 'product-images')));
  if (mainImageUrls.length > 0 && !productData.main_image_url) {
    productData.main_image_url = mainImageUrls[0];
  }

  const { data: updatedProduct, error: productError } = await sb.from('products').update(productData).eq('id', productId).select().single();
  if (productError) throw productError;

  if (mainImageUrls.length > 0) {
    const imagesToInsert = mainImageUrls.map((url, i) => ({ product_id: productId, url, position: i, is_primary: i === 0 }));
    await sb.from('product_images').insert(imagesToInsert);
  }

  for (const variation of variationsData) {
    const { imageFiles = [], ...variationDetails } = variation;
    const { data: newVar, error: varErr } = await sb.from('product_variations').insert({ ...variationDetails, product_id: productId }).select('id').single();
    if (varErr) throw varErr;
    if (imageFiles.length > 0) {
      const varUrls = await Promise.all(imageFiles.map(f => uploadFile(f, 'product-images')));
      const varImgs = varUrls.map((url, i) => ({ product_id: productId, product_variation_id: newVar.id, url, position: i }));
      await sb.from('product_images').insert(varImgs);
    }
  }
  return updatedProduct;
}

export async function fetchProductForEdit(id: string) {
  const { data: product, error } = await sb.from('products').select('*').eq('id', id).single();
  if (error) throw error;
  
  const { data: images } = await sb.from('product_images').select('*').eq('product_id', id).order('position');
  const { data: variations } = await sb.from('product_variations').select('*').eq('product_id', id);

  const mainImages = (images || []).filter((img: { product_variation_id: any; }) => !img.product_variation_id);
  const variationsWithImages = (variations || []).map((v: { id: any; }) => ({ ...v, images: (images || []).filter((img: { product_variation_id: any; }) => img.product_variation_id === v.id) }));

  return { product, mainImages, variations: variationsWithImages };
}

// RESTORED FUNCTIONS
const buildProductQuery = (filters: ProductListPageFilters = {}) => {
   let query = sb.from("products").select(`*, category:categories(id, name)`);
   if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(`name.ilike.${term},brand.ilike.${term},sku.ilike.${term}`);
   }
   if (filters.category && filters.category !== "all") {
      query = query.eq("category_id", filters.category);
   }
   if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
   }
   return query;
};


export async function fetchProductsPage({ filters = {}, pagination = { page: 1, limit: 10 }, sort = { column: "created_at", direction: "desc" }, }: ProductQueryOptions) {
   const query = buildProductQuery(filters);
   const { count, error: countError } = await query.select("*", { count: "exact", head: true });
   if (countError) throw countError;
   const from = (pagination.page - 1) * pagination.limit;
   const to = from + pagination.limit - 1;
   const dataQuery = buildProductQuery(filters).order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);
   const { data, error } = await dataQuery;
   if (error) throw error;
   return { data: data as Product[], count: count ?? 0 };
}

export async function fetchAllProductsForExport({ filters = {}, sort = { column: "created_at", direction: "desc" }, }: Omit<ProductQueryOptions, "pagination">) {
   const query = buildProductQuery(filters).order(sort.column, { ascending: sort.direction === "asc" }).limit(5000);
   const { data, error } = await query;
   if (error) throw error;
   return data as Product[];
}

export async function deleteProduct(id: string) {
   const { error } = await sb.from("products").delete().eq("id", id);
   if (error) throw error;
}

export async function updateProduct(id: string, updates: Partial<ProductBase>) {
  if (Object.keys(updates).length) {
    const { error } = await sb.from("products").update(updates).eq("id", id);
    if (error) throw error;
  }
}

export async function fetchCategories(): Promise<Category[]> {
   const { data, error } = await sb.from("categories").select("id, name").order("name");
   if (error) throw error;
   return data || [];
}

export async function fetchCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
   const { data, error } = await sb.from("categories").select(`*, subcategories:subcategories(*)`).order("name");
   if (error) throw error;
   return data || [];
}

export async function createBulkProducts(products: ProductBase[]) {
    const { data, error } = await sb.from('products').insert(products);
    if (error) throw error;
    return data;
}