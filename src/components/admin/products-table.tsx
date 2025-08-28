"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Edit, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';

// Import shadcn/ui components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Import the filters component
import { TableFilters } from './table-filters';

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  stock: boolean;
  price: string;
  qty: number;
  status: string;
  image: string;
}

interface ProductsTableProps {
  products: Product[];
}

export const ProductsTable = ({ products }: ProductsTableProps) => {
  const [selectedItems, setSelectedItems] = useState(new Set<number>());
  const [sortConfig, setSortConfig] = useState<{key: string, direction: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [stockStates, setStockStates] = useState<Record<number, boolean>>({});
  const [visibleColumns, setVisibleColumns] = useState(['product', 'category', 'stock', 'price', 'qty', 'status', 'actions']);
  const [showViewOptions, setShowViewOptions] = useState(false);

  const columns = ['product', 'category', 'stock', 'price', 'qty', 'status', 'actions'];

  // Initialize stock states
  useEffect(() => {
    const initialStockStates: Record<number, boolean> = {};
    products.forEach(product => {
      initialStockStates[product.id] = product.stock;
    });
    setStockStates(initialStockStates);
  }, [products]);

  const uniqueCategories = useMemo(() => 
    ['all', ...new Set(products.map(p => p.category))], 
    [products]
  );

  const uniqueStatuses = useMemo(() => 
    ['all', ...new Set(products.map(p => p.status))], 
    [products]
  );

  const stockOptions = ['all', 'in-stock', 'out-of-stock'] as const;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(products.map(p => p.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleStockToggle = (id: number, checked: boolean) => {
    setStockStates(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const toggleColumn = (columnKey: string) => {
    if (columnKey === 'actions') return;
    
    setVisibleColumns(prev => {
      const isCurrentlyVisible = prev.includes(columnKey);
      
      if (isCurrentlyVisible && prev.length <= 2) {
        return prev;
      }

      if (isCurrentlyVisible) {
        return prev.filter(col => col !== columnKey);
      }

      const columnIndex = columns.indexOf(columnKey);
      const newColumns = [...prev.filter(col => col !== 'actions')];
      let insertIndex = 0;

      while (
        insertIndex < newColumns.length &&
        columns.indexOf(newColumns[insertIndex]) < columnIndex
      ) {
        insertIndex++;
      }

      newColumns.splice(insertIndex, 0, columnKey);
      return [...newColumns, 'actions'];
    });
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    );
  };

  const getSortValue = (product: Product, key: string) => {
    if (key === 'stock') {
      return (stockStates[product.id] ?? product.stock) ? 1 : 0;
    }
    if (key === 'product') {
      return product.name.toLowerCase();
    }
    const value = product[key as keyof Product];
    if (key === 'price') {
      return parseInt((value as string).replace(/,/g, ''), 10);
    }
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return value;
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lowerSearch) ||
        p.description.toLowerCase().includes(lowerSearch)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        const currentStock = stockStates[p.id] ?? p.stock;
        if (stockFilter === 'in-stock') return currentStock;
        if (stockFilter === 'out-of-stock') return !currentStock;
        return true;
      });
    }

    // Sort
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = getSortValue(a, sortConfig.key);
        const bVal = getSortValue(b, sortConfig.key);
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, statusFilter, stockFilter, sortConfig, stockStates]);

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      'Scheduled': 'bg-orange-100 text-orange-700 border border-orange-200',
      'Delivered': 'bg-green-100 text-green-700 border border-green-200',
      'Cancel': 'bg-red-100 text-red-700 border border-red-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const getColumnWidth = (columnKey: string) => {
    const widthMap: Record<string, string> = {
      product: '300px',
      category: '150px',
      stock: '120px',
      price: '120px',
      qty: '100px',
      status: '130px',
      actions: '100px'
    };
    return widthMap[columnKey] || '140px';
  };

  return (
    <div className="w-full min-h-[40vh] ">
      <TableFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        uniqueCategories={uniqueCategories}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        uniqueStatuses={uniqueStatuses}
        stockFilter={stockFilter}
        onStockChange={setStockFilter}
        stockOptions={stockOptions}
        columns={columns.filter(col => col !== 'actions')}
        visibleColumns={visibleColumns.filter(col => col !== 'actions')}
        toggleColumn={toggleColumn}
        showViewOptions={showViewOptions}
        setShowViewOptions={setShowViewOptions}
      />

      {/* Responsive Table Container */}
      <div className="relative overflow-hidden border rounded-lg max-h-[60vh] overflow-y-auto">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '800px' }}>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === products.length && products.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  {visibleColumns.map((col) => (
                    <TableHead
                      key={col}
                      style={{ minWidth: getColumnWidth(col) }}
                      className={cn(
                        'text-gray-500 font-medium sticky top-0 bg-gray-50/90 px-4 py-3 text-left backdrop-blur-sm transition-colors select-none',
                        col === 'actions' ? '' : 'cursor-pointer hover:bg-gray-100',
                        sortConfig?.key === col && 'bg-gray-100 text-gray-900'
                      )}
                      onClick={col === 'actions' ? undefined : () => handleSort(col)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap uppercase text-xs">
                          {col === 'actions' ? 'ACTIONS' : col.toUpperCase()}
                        </span>
                        {col !== 'actions' && getSortIcon(col)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="border-b hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(product.id)}
                        onCheckedChange={(checked) => handleSelectItem(product.id, checked as boolean)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={`${product.id}-${col}`}
                        style={{ minWidth: getColumnWidth(col) }}
                        className="border-b border-gray-100 px-4 py-3"
                      >
                        {col === 'product' && (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-lg">
                              {product.image}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">{product.name}</div>
                              <div className="text-sm text-gray-500 truncate">{product.description}</div>
                            </div>
                          </div>
                        )}
                        {col === 'category' && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{product.image}</span>
                            <span className="text-gray-900">{product.category}</span>
                          </div>
                        )}
                        {col === 'stock' && (
                          <Switch
                            checked={stockStates[product.id] || false}
                            onCheckedChange={(checked) => handleStockToggle(product.id, checked as boolean)}
                          />
                        )}
                        {col === 'price' && (
                          <span className="text-gray-900">{product.price}</span>
                        )}
                        {col === 'qty' && (
                          <span className="text-gray-900">{product.qty}</span>
                        )}
                        {col === 'status' && getStatusBadge(product.status)}
                        {col === 'actions' && (
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Trash2 className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="text-sm text-gray-500">
          Displaying 1 to {filteredProducts.length} of {products.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="flex items-center space-x-1">
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>
          
          <div className="flex space-x-1">
            <Button size="sm" className="w-8 h-8 bg-green-500 text-white hover:bg-green-600">1</Button>
            <Button variant="outline" size="sm" className="w-8 h-8">2</Button>
            <Button variant="outline" size="sm" className="w-8 h-8">3</Button>
            <Button variant="outline" size="sm" className="w-8 h-8">4</Button>
            <Button variant="outline" size="sm" className="w-8 h-8">5</Button>
            <span className="w-8 h-8 flex items-center justify-center text-sm">...</span>
            <Button variant="outline" size="sm" className="w-8 h-8">15</Button>
          </div>
          
          <Button variant="ghost" size="sm" className="flex items-center space-x-1">
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};