'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CategoriesTable from '@/components/admin/categories-table';
import AddEditCategoryDialog from '@/components/admin/add-category-dialog';
import { fetchCategories, deleteCategory } from '@/integrations/categories';
import type { Category } from '@/integrations/categories';
import { useDebounce } from '@/hooks/use-debounce';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchCategories({ search: debouncedSearchTerm });
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    loadCategories();
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? This cannot be undone.')) {
      try {
        await deleteCategory(id);
        loadCategories();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category List</h1>
          <p className="text-sm text-muted-foreground">
            Manage product categories across your store.
          </p>
        </div>
        <Button onClick={handleAddCategory} className="sm:self-start flex items-center space-x-2 bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
         <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full md:w-1/2 border-gray-300 rounded-md"
               />
            </div>
      </div>
      
      <CategoriesTable 
        categories={categories}
        loading={loading}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
      
      <AddEditCategoryDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
        category={editingCategory}
      />
    </div>
  );
}