'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit,
  Trash2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Button } from '../ui/button';

interface CategoriesTableProps {
  searchTerm: string;
}

export default function CategoriesTable({ searchTerm }: CategoriesTableProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const categoriesData = [
    {
      id: '1',
      name: 'Bags',
      subCategory: 'Back Bag',
      image: '/placeholder-bag.jpg',
      totalProducts: 1186,
      totalEarnings: 58000,
      status: 'Active',
    },
    {
      id: '2',
      name: 'Shoes',
      subCategory: 'Nike',
      image: '/placeholder-shoes.jpg',
      totalProducts: 1386,
      totalEarnings: 52500,
      status: 'Active',
    },
    {
      id: '3',
      name: 'Smart Phone',
      subCategory: 'iPhone',
      image: '/placeholder-phone.jpg',
      totalProducts: 2344,
      totalEarnings: 2000000,
      status: 'Inactive',
    },
    {
      id: '4',
      name: 'Home Decor',
      subCategory: 'Living room',
      image: '/placeholder-decor.jpg',
      totalProducts: 4378,
      totalEarnings: 500000,
      status: 'Active',
    },
  ];

  const filteredData = categoriesData.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.subCategory && category.subCategory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(new Set(filteredData.map((cat) => cat.id)));
    } else {
      setSelectedCategories(new Set());
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCategories);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedCategories(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      'Active': 'bg-green-100 text-green-700 border border-green-200',
      'Inactive': 'bg-gray-100 text-gray-700 border border-gray-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: '700px' }}>
          <Table>
            <TableHeader className='bg-gray-200'>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedCategories.size === filteredData.length && filteredData.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all categories"
                  />
                </TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Total Products</TableHead>
                <TableHead>Total Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={(checked) => handleRowSelect(category.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {category.image && (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-8 w-8 rounded mr-2"
                        />
                      )}
                      <div>
                        {category.subCategory ? (
                          <div>
                            <div className="text-sm font-medium">{category.name}</div>
                            <div className="text-xs text-muted-foreground">{category.subCategory}</div>
                          </div>
                        ) : (
                          category.name
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{category.totalProducts.toLocaleString()}</TableCell>
                  <TableCell>${category.totalEarnings.toLocaleString()}</TableCell>
                  <TableCell>
                    {getStatusBadge(category.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}