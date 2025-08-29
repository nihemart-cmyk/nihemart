'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CategoriesTable from '@/components/admin/categories-table';
import AddCategoryDialog from '@/components/admin/add-category-dialog';

export default function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category List</h1>
          <p className="text-sm text-muted-foreground">
            Manage product categories across your store.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="sm:self-start flex items-center space-x-2 bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>
      <div className="flex items-center justify-between">
        
         <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full md:w-1/2  focus:none border-none shadow-none"
               />
            </div>
      </div>
      <CategoriesTable searchTerm={searchTerm} />
      <AddCategoryDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}