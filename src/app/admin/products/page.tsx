"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, ArrowUp, Upload, Loader2, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/products-table";
import { BulkUploadModal } from "@/components/admin/bulk-upload-modal";
import { 
  fetchProductsPage, 
  fetchAllProductsForExport,
  deleteProduct, 
  updateProduct,
  fetchCategoriesWithSubcategories
} from "@/integrations/supabase/products";
import type { Product, Category, Subcategory, ProductListPageFilters } from "@/integrations/supabase/products";

const ProductsPage = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState<ProductListPageFilters>({
    search: '',
    category: 'all',
    status: 'all',
  });
  const [sort, setSort] = useState({ column: 'created_at', direction: 'desc' as 'asc' | 'desc' });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

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
    const loadCategoriesData = async () => {
      try {
        const categoriesWithSubs = await fetchCategoriesWithSubcategories();
        const allCategories = categoriesWithSubs.map(({ id, name }) => ({ id, name }));
        const allSubcategories = categoriesWithSubs.flatMap(c => c.subcategories);
        setCategories(allCategories);
        setSubcategories(allSubcategories);
      } catch (error) {
        console.error("Failed to load categories and subcategories:", error);
      }
    };
    loadCategoriesData();
  }, []);
  
  const handleEditProduct = (id: string) => {
    router.push(`/admin/products/${id}/edit`);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);

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
    setIsExporting(true);
    try {
      const productsToExport = await fetchAllProductsForExport({ filters, sort });
      
      const productDataForSheet = productsToExport.map(p => ({
        "Product ID": p.id,
        "Product Name": p.name,
        "SKU": p.sku || '',
        "Category": p.category?.name || '',
        "Brand": p.brand || '',
        "Price": p.price,
        "Compare At Price": p.compare_at_price || 0,
        "Stock": p.stock || 0,
        "Status": p.status,
        "Created At": new Date(p.created_at).toLocaleString(),
      }));

      const activeCount = productsToExport.filter(p => p.status === 'active').length;
      const draftCount = productsToExport.filter(p => p.status === 'draft').length;
      const totalStock = productsToExport.reduce((sum, p) => sum + (p.stock || 0), 0);
      const totalValue = productsToExport.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
      const categoryCounts = productsToExport.reduce((acc, p) => {
        const cat = p.category?.name || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const analyticsData = [
        { Statistic: "Total Products", Value: productsToExport.length },
        { Statistic: "Active Products", Value: activeCount },
        { Statistic: "Draft Products", Value: draftCount },
        { Statistic: "Total Stock Units", Value: totalStock },
        { Statistic: "Estimated Total Stock Value", Value: totalValue.toFixed(2) },
        {},
        { Statistic: "Products Per Category", Value: ""},
        ...Object.entries(categoryCounts).map(([name, count]) => ({
          Statistic: `  ${name}`,
          Value: count,
        }))
      ];
      
      const wb = XLSX.utils.book_new();

      const wsProducts = XLSX.utils.json_to_sheet(productDataForSheet);
      wsProducts['!cols'] = [
        { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 25 }, { wch: 20 },
        { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

      const wsAnalytics = XLSX.utils.json_to_sheet(analyticsData, { skipHeader: true });
      wsAnalytics['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsAnalytics, "Analytics Summary");

      XLSX.writeFile(wb, `Products_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error("Failed to export products:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen p-4 md:p-6">
         <div className="max-w-full mx-auto">
            <div className="mb-6">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <div>
                     <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Products</h1>
                     <p className="text-gray-600 mt-1">Monitor your store&apos;s products to increase your sales.</p>
                  </div>
                  <div className="flex items-center space-x-3">
                     <Button onClick={handleExport} variant="outline" className="flex items-center space-x-2" disabled={isExporting}>
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
                     </Button>
                     <Button onClick={() => setIsBulkUploadOpen(true)} variant="outline" className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Bulk Add</span>
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
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadComplete={fetchAndSetProducts}
        categories={categories}
        subcategories={subcategories}
      />
    </>
  );
};

export default ProductsPage;