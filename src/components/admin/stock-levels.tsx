'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Edit, 
  Trash2, 
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const stockData = [
  {
    id: 1,
    image: '/placeholder-curtain.jpg',
    product: 'Blackout Curtain',
    code: 'CUR-BL-001',
    category: 'Curtains',
    stock: 'Available',
    price: 'RWF 80,000',
    stockLevel: 32,
    status: 'Progress',
    statusColor: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 2,
    image: '/placeholder-curtain-white.jpg',
    product: 'Light White Sheer Curtain',
    code: 'CUR-WH-002',
    category: 'Curtains',
    stock: 'Available',
    price: 'RWF 80,000',
    stockLevel: 32,
    status: 'Delivered',
    statusColor: 'bg-green-100 text-green-800'
  },
  {
    id: 3,
    image: '/placeholder-curtain-linen.jpg',
    product: 'Linen Roller Blind',
    code: 'BLD-LN-003',
    category: 'Curtains',
    stock: 'Unavailable',
    price: 'RWF 80,000',
    stockLevel: 31,
    status: 'Hazard',
    statusColor: 'bg-red-100 text-red-800'
  }
]

const soldOutData = [
  {
    id: 1,
    image: '/placeholder-curtain.jpg',
    product: 'Blackout Curtain',
    code: 'CUR-BL-001',
    category: 'Curtains',
    stock: 'Available',
    price: 'RWF 80,000',
    stockLevel: 32,
    status: 'Progress',
    statusColor: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 2,
    image: '/placeholder-curtain-white.jpg',
    product: 'Light White Sheer Curtain',
    code: 'CUR-WH-002',
    category: 'Curtains',
    stock: 'Available',
    price: 'RWF 80,000',
    stockLevel: 32,
    status: 'Delivered',
    statusColor: 'bg-green-100 text-green-800'
  },
  {
    id: 3,
    image: '/placeholder-curtain-linen.jpg',
    product: 'Linen Roller Blind',
    code: 'BLD-LN-003',
    category: 'Curtains',
    stock: 'Available',
    price: 'RWF 80,000',
    stockLevel: 31,
    status: 'Hazard',
    statusColor: 'bg-red-100 text-red-800'
  }
]

function StockTable({ title, data, count }: { title: string, data: any[], count: number }) {
  const [selectedItems, setSelectedItems] = useState(new Set<number>())
  const [sortConfig, setSortConfig] = useState<{key: string, direction: string} | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [stockFilter, setStockFilter] = useState('All Stock')
  const [timeFilter, setTimeFilter] = useState('Previous week')

  const columns = [
    { key: 'checkbox', label: '', width: '40px' },
    { key: 'index', label: '#', width: '60px' },
    { key: 'product', label: 'Product', width: '300px' },
    { key: 'category', label: 'Category', width: '150px' },
    { key: 'stock', label: 'Stock', width: '120px' },
    { key: 'price', label: 'Price', width: '120px' },
    { key: 'stockLevel', label: 'Stock', width: '100px' },
    { key: 'status', label: 'Status', width: '120px' },
    { key: 'actions', label: 'Actions', width: '100px' }
  ]

  const minTableWidth = columns.reduce((sum, col) => sum + parseInt(col.width), 0) + 'px'

  const uniqueCategories = useMemo(() => 
    ['All Categories', ...new Set(data.map(p => p.category))], 
    [data]
  )

  const uniqueStocks = ['All Stock', 'Available', 'Unavailable']

  const uniqueTimes = ['This week', 'Previous week', 'This month']

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(data.map(p => p.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSort = (key: string) => {
    if (key === 'checkbox' || key === 'index' || key === 'actions') return
    let direction = 'asc'
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-4 w-4 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    )
  }

  const getSortValue = (item: any, key: string) => {
    const value = item[key]
    if (key === 'price') {
      return parseInt(value.replace(/[^\d]/g, ''), 10)
    }
    if (typeof value === 'string') {
      return value.toLowerCase()
    }
    if (typeof value === 'number') {
      return value
    }
    return value
  }

  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.product.toLowerCase().includes(lowerSearch) ||
        p.code.toLowerCase().includes(lowerSearch)
      )
    }

    // Category filter
    if (categoryFilter !== 'All Categories') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    // Stock filter
    if (stockFilter !== 'All Stock') {
      filtered = filtered.filter(p => p.stock === stockFilter)
    }

    // Note: Time filter not implemented as it would require date data; placeholder for now

    // Sort
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = getSortValue(a, sortConfig.key)
        const bVal = getSortValue(b, sortConfig.key)
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, categoryFilter, stockFilter, sortConfig])

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{filteredData.length}</span>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {timeFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueTimes.map(time => (
                    <DropdownMenuItem key={time} onClick={() => setTimeFilter(time)}>
                      {time}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {categoryFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueCategories.map(cat => (
                    <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {stockFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueStocks.map(stock => (
                    <DropdownMenuItem key={stock} onClick={() => setStockFilter(stock)}>
                      {stock}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-hidden border-t rounded-b-lg">
          <div className="overflow-x-auto">
            <div style={{ minWidth: minTableWidth }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        style={{ minWidth: col.width }}
                        className={cn(
                          'text-gray-500 font-medium sticky top-0 bg-gray-50/90 px-4 py-3 text-left backdrop-blur-sm transition-colors select-none',
                          col.key === 'actions' ? 'text-right' : '',
                          col.key !== 'checkbox' && col.key !== 'actions' && col.key !== 'index' ? 'cursor-pointer hover:bg-gray-100' : '',
                          sortConfig?.key === col.key && 'bg-gray-100 text-gray-900'
                        )}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.key === 'checkbox' ? (
                          <Checkbox
                            checked={selectedItems.size === data.length && data.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="rounded border-gray-300"
                          />
                        ) : (
                          <div className={cn('flex items-center gap-2', col.key === 'actions' ? 'justify-end' : '')}>
                            <span className="whitespace-nowrap uppercase text-xs">{col.label}</span>
                            {col.key !== 'checkbox' && col.key !== 'actions' && col.key !== 'index' && getSortIcon(col.key)}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={item.id} className="border-b hover:bg-gray-50">
                      <TableCell style={{ minWidth: columns[0].width }} className="border-b border-gray-100 px-4 py-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell style={{ minWidth: columns[1].width }} className="font-medium border-b border-gray-100 px-4 py-3">{index + 1}</TableCell>
                      <TableCell style={{ minWidth: columns[2].width }} className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded flex items-center justify-center">
                            <div className="w-6 h-8 bg-amber-600 rounded-sm"></div>
                          </div>
                          <div>
                            <div className="font-medium">{item.product}</div>
                            <div className="text-xs text-gray-500">{item.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[3].width }} className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded-sm"></div>
                          {item.category}
                        </div>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[4].width }} className="border-b border-gray-100 px-4 py-3">
                        <Badge 
                          variant={item.stock === 'Available' ? 'default' : 'secondary'}
                          className={item.stock === 'Available' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                        >
                          {item.stock}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[5].width }} className="font-medium border-b border-gray-100 px-4 py-3">{item.price}</TableCell>
                      <TableCell style={{ minWidth: columns[6].width }} className="border-b border-gray-100 px-4 py-3">{item.stockLevel}</TableCell>
                      <TableCell style={{ minWidth: columns[7].width }} className="border-b border-gray-100 px-4 py-3">
                        <Badge className={item.statusColor}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[8].width }} className="text-right border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
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
      </CardContent>
    </Card>
  )
}

export default function StockLevels() {
  return (
    <div className="space-y-6">
      <StockTable title="Stock" data={stockData} count={447} />
      <StockTable title="Sold Out" data={soldOutData} count={0} />
      
      {/* Additional sections - converted to tables for consistency, but empty */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Order</CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">0</span>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Previous week <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>This week</DropdownMenuItem>
                    <DropdownMenuItem>Previous week</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="relative flex-1 max-w-sm mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search..." className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-hidden border-t rounded-b-lg">
            <div className="overflow-x-auto">
              <div style={{ minWidth: '800px' }}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-12 sticky top-0 bg-gray-50/90"></TableHead>
                      {/* Add more headers if data structure is known */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={1} className="text-center py-8 text-gray-500">No orders found</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">In Transit (being delivered)</CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">0</span>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Previous week <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>This week</DropdownMenuItem>
                    <DropdownMenuItem>Previous week</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="relative flex-1 max-w-sm mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search..." className="pl-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-hidden border-t rounded-b-lg">
            <div className="overflow-x-auto">
              <div style={{ minWidth: '800px' }}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-12 sticky top-0 bg-gray-50/90"></TableHead>
                      {/* Add more headers if data structure is known */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={1} className="text-center py-8 text-gray-500">No items in transit</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}