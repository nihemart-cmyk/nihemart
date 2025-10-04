import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface Category {
  id: string;
  name: string;
  icon_url?: string | null;
  products_count?: number;
}

export interface CategoryInput {
  name: string;
  icon_url?: string | null;
}

export interface CategoryQueryOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchCategories({ search = '', page = 1, limit = 10 }: CategoryQueryOptions) {
  let query = sb
    .from('categories')
    .select('*, products(count)', { count: 'exact' });

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) throw error;
  
  const formattedData = data.map((cat: any) => ({
    ...cat,
    products_count: cat.products[0]?.count || 0,
  }));

  return { data: formattedData as Category[], count: count ?? 0 };
}

export async function createCategory(categoryData: CategoryInput): Promise<Category> {
  const { data, error } = await sb
    .from('categories')
    .insert(categoryData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Partial<CategoryInput>): Promise<Category> {
  const { data, error } = await sb
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await sb
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}