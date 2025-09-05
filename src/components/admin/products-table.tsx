"use client"
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Edit, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Product, Category, ProductListPageFilters, ProductStatus } from '@/integrations/supabase/products';

interface ProductsTableProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  filters: ProductListPageFilters;
  sort: { column: string; direction: 'asc' | 'desc' };
  pagination: { page: number; limit: number; totalCount: number };
  onFilterChange: (newFilters: Partial<ProductListPageFilters>) => void;
  onPageChange: (newPage: number) => void;
  onSortChange: (column: string) => void;
  onDelete: (id: string) => void;
  onStatusToggle: (id: string, currentStatus: string | undefined) => void;
}

export const ProductsTable = ({
  products,
  categories,
  loading,
  filters,
  sort,
  pagination,
  onFilterChange,
  onPageChange,
  onSortChange,
  onDelete,
  onStatusToggle,
}: ProductsTableProps) => {
  const totalPages = Math.ceil(pagination.totalCount / pagination.limit);

  const getSortIcon = (key: string) => {
    if (sort.column !== key) return <ChevronDown className="h-4 w-4 opacity-50" />;
    return sort.direction === 'asc' ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };
  
  const getStatusBadge = (status: ProductStatus | undefined) => {
    const statusStyles = {
      'active': 'bg-green-100 text-green-700 border border-green-200',
      'out_of_stock': 'bg-red-100 text-red-700 border border-red-200',
      'draft': 'bg-orange-100 text-orange-700 border border-orange-200',
    };
    const text = status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-700'}`}>{text}</span>;
  };

  const headerColumns: { key: keyof Product | 'actions'; label: string; sortable: boolean, minWidth?: string }[] = [
    { key: 'name', label: 'Product', sortable: true, minWidth: '300px' },
    { key: 'category', label: 'Category', sortable: true, minWidth: '150px' },
    { key: 'status', label: 'Status', sortable: true, minWidth: '130px' },
    { key: 'stock', label: 'Stock', sortable: true, minWidth: '120px' },
    { key: 'price', label: 'Price', sortable: true, minWidth: '120px' },
    { key: 'actions', label: 'Actions', sortable: false, minWidth: '100px' },
  ];

  return (
    <div className="w-full min-h-[40vh]">
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
                placeholder="Search by name, brand, SKU..."
                value={filters.search}
                onChange={(e) => onFilterChange({ search: e.target.value })}
                className="pl-9"
            />
        </div>
        <Select value={filters.category} onValueChange={(value) => onFilterChange({ category: value })}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(value) => onFilterChange({ status: value as ProductStatus | 'all' })}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative overflow-hidden border rounded-lg max-h-[60vh] overflow-y-auto">
        <div className="overflow-x-auto" style={{ minWidth: '800px' }}>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-12"><Checkbox disabled /></TableHead>
                  {headerColumns.map((col) => (
                    <TableHead key={col.key} style={{ minWidth: col.minWidth }} className={cn('text-gray-500 font-medium sticky top-0 bg-gray-50/90 backdrop-blur-sm', col.sortable && 'cursor-pointer hover:bg-gray-100')} onClick={col.sortable ? () => onSortChange(col.key) : undefined}>
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap uppercase text-xs">{col.label}</span>
                        {col.sortable && getSortIcon(col.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={headerColumns.length + 1} className="text-center h-48">Loading products...</TableCell></TableRow>
                ) : products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id} className="border-b hover:bg-gray-50">
                        <TableCell><Checkbox /></TableCell>
                        <TableCell>
                            <div className="flex items-center space-x-3">
                                <div className="relative w-10 h-10 bg-gray-100 rounded flex-shrink-0">
                                <Image src={product.main_image_url || '/placeholder.svg'} alt={product.name} fill className="object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">{product.name}</div>
                                <div className="text-sm text-gray-500 truncate">{product.short_description || 'No description'}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{product.category?.name || 'Uncategorized'}</TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell>
                            <Switch checked={product.status === 'active'} onCheckedChange={() => onStatusToggle(product.id, product.status)} />
                        </TableCell>
                        <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price || 0)}</TableCell>
                        <TableCell>
                            <div className="flex items-center space-x-2">
                                <Link href={`/admin/products/edit/${product.id}`}><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit className="w-4 h-4 text-gray-500" /></Button></Link>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onDelete(product.id)}><Trash2 className="w-4 h-4 text-gray-500" /></Button>
                            </div>
                        </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow><TableCell colSpan={headerColumns.length + 1} className="text-center h-48">No products found matching your criteria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </div>
      
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="text-sm text-gray-500">
          Displaying {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalCount)} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="flex items-center space-x-1" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
            <ChevronLeft className="w-4 h-4" /><span>Previous</span>
          </Button>
          <div className="flex space-x-1">
            <Button size="sm" className="w-8 h-8 bg-green-500 text-white hover:bg-green-600">{pagination.page}</Button>
          </div>
          <Button variant="ghost" size="sm" className="flex items-center space-x-1" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= totalPages}>
            <span>Next</span><ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};