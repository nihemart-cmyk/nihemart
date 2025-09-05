"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, ArrowUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/products-table";
import { 
  fetchProductsPage, 
  fetchAllProductsForExport,
  deleteProduct, 
  updateProduct,
  fetchCategories 
} from "@/integrations/supabase/products";
import type { Product, Category, ProductListPageFilters } from "@/integrations/supabase/products";

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState<ProductListPageFilters>({
    search: '',
    category: 'all',
    status: 'all',
  });
  const [sort, setSort] = useState({ column: 'created_at', direction: 'desc' as 'asc' | 'desc' });

  const fetchAndSetProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchProductsPage({
        filters,
        pagination: { page, limit },
        sort,
      });
      setProducts(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit, sort]);

  useEffect(() => {
    fetchAndSetProducts();
  }, [fetchAndSetProducts]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFilterChange = (newFilters: Partial<ProductListPageFilters>) => {
    setPage(1);
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSortChange = (column: string) => {
    setSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        fetchAndSetProducts();
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    try {
      await updateProduct(id, { status: newStatus });
      fetchAndSetProducts();
    } catch(error) {
      console.error("Failed to update product status:", error);
    }
  };
  
  const handleExport = async () => {
    try {
      const productsToExport = await fetchAllProductsForExport({ filters, sort });
      const headers = ["ID", "Name", "SKU", "Category", "Brand", "Price", "Stock", "Status"];
      const csvContent = [
        headers.join(","),
        ...productsToExport.map(p => [
          p.id,
          `"${p.name?.replace(/"/g, '""')}"`,
          p.sku || '',
          p.category?.name || '',
          p.brand || '',
          p.price,
          p.stock,
          p.status
        ].join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `products-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export products:", error);
    }
  };

  return (
      <div className="min-h-screen p-4 md:p-6">
         <div className="max-w-full mx-auto">
            <div className="mb-6">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <div>
                     <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Products</h1>
                     <p className="text-gray-600 mt-1">Monitor your store&apos;s products to increase your sales.</p>
                  </div>
                  <div className="flex items-center space-x-3">
                     <Button onClick={handleExport} variant="outline" className="flex items-center space-x-2">
                        <ArrowUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                     </Button>
                     <Link href="/admin/products/new">
                        <Button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700">
                           <Plus className="w-4 h-4" />
                           <span>Add Product</span>
                        </Button>
                     </Link>
                  </div>
               </div>
            </div>
            <ProductsTable
              products={products}
              categories={categories}
              loading={loading}
              filters={filters}
              sort={sort}
              pagination={{ page, limit, totalCount }}
              onFilterChange={handleFilterChange}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onDelete={handleDeleteProduct}
              onStatusToggle={handleStatusToggle}
            />
         </div>
      </div>
  );
};

export default ProductsPage;