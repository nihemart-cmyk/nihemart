import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";

async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*");
  if (error) throw error;
  return data;
}

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: fetchProducts });
}
